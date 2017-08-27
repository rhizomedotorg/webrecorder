import os
import redis
import time
import base64

from warcio.timeutils import sec_to_timestamp

from webrecorder.utils import load_wr_config


# ============================================================================
class StorageCommitter(object):
    def __init__(self, config):
        self.redis_base_url = os.environ['REDIS_BASE_URL']

        self.redis = redis.StrictRedis.from_url(self.redis_base_url, decode_responses=True)

        self.record_root_dir = os.environ['RECORD_ROOT']

        self.warc_key_templ = config['warc_key_templ']

        self.commit_wait_templ = config['commit_wait_templ']
        self.commit_wait_secs = int(config['commit_wait_secs'])

        self.index_name_templ = config['index_name_templ']
        self.info_index_key = config['info_index_key']

        self.full_warc_prefix = config['full_warc_prefix']

        self.cdxj_key = config['cdxj_key_templ'].format(user='*', coll='*', rec='*')

        self.default_storage_profile = self.create_default_profile(config)

        self.storage_class_map = {}

        self.storage_key_templ = config['storage_key_templ']
        self.info_key_templ = config['info_key_templ']

        self.temp_prefix = config['temp_prefix']

        print('Storage Committer Root: ' + self.record_root_dir)

    def create_default_profile(self, config):
        storage_type = os.environ.get('DEFAULT_STORAGE', 'local')

        profile = {'type': storage_type}

        if storage_type == 's3':
            s3_root = os.environ.get('S3_ROOT')
            s3_root += config['storage_path_templ']

            profile['remote_url_templ'] = s3_root

        return profile

    def is_temp(self, user):
        return user.startswith(self.temp_prefix)

    def commit_file(self, user, coll, rec, dirname, filename,
                    update_key, update_prop=None):

        full_filename = os.path.join(dirname, filename)

        storage = self.get_storage(user, coll, rec)
        if not storage:
            return True

        commit_wait = self.commit_wait_templ.format(filename=full_filename)

        if self.redis.get(commit_wait) != b'1':
            if not storage.upload_file(user, coll, rec, filename, full_filename):
                return False

            self.redis.setex(commit_wait, self.commit_wait_secs, 1)

        # already uploaded, see if it is accessible
        # if so, finalize and delete original
        remote_url = storage.get_valid_remote_url(user, coll, rec, filename)
        if not remote_url:
            print('Not yet available: {0}'.format(full_filename))
            return False

        update_prop = update_prop or filename
        self.redis.hset(update_key, update_prop, remote_url)

        if not self.delete_committed(full_filename):
            return False

        return True

    def write_cdxj(self, rec_info_key, dirname, cdxj_key):
        cdxj_filename = self.redis.hget(rec_info_key, self.info_index_key)
        if cdxj_filename:
            return cdxj_filename

        timestamp = sec_to_timestamp(int(self.redis.hget(rec_info_key, 'updated_at')))

        randstr = base64.b32encode(os.urandom(5)).decode('utf-8')

        cdxj_filename = self.index_name_templ.format(timestamp=timestamp,
                                                 random=randstr)

        full_filename = os.path.join(dirname, cdxj_filename)

        cdxj_list = self.redis.zrange(cdxj_key, 0, -1)

        with open(full_filename, 'wt') as fh:
            for cdxj in cdxj_list:
                fh.write(cdxj)

        full_url = self.full_warc_prefix + full_filename.replace(os.path.sep, '/')

        self.redis.hset(rec_info_key, self.info_index_key, full_url)

        return cdxj_filename

    def remove_if_empty(self, user_dir):
        # attempt to remove the dir, if empty
        try:
            os.rmdir(user_dir)
            print('Removed dir ' + user_dir)
        except:
            pass

    def __call__(self):
        for cdxj_key in self.redis.scan_iter(self.cdxj_key):
            self.process_cdxj_key(cdxj_key)

    def process_cdxj_key(self, cdxj_key):
        base_key = cdxj_key.rsplit(':cdxj', 1)[0]
        if self.redis.exists(base_key + ':open'):
            return

        _, user, coll, rec = base_key.split(':', 3)

        if self.is_temp(user):
            return

        user_dir = os.path.join(self.record_root_dir, user)

        warc_key = base_key + ':warc'
        warcs = self.redis.hgetall(warc_key)

        info_key = base_key + ':info'

        cdxj_filename = self.write_cdxj(info_key, user_dir, cdxj_key)

        all_done = self.commit_file(user, coll, rec, user_dir,
                                    cdxj_filename, info_key, self.info_index_key)

        for warc_filename in warcs.keys():
            done = self.commit_file(user, coll, rec, user_dir,
                                    warc_filename, warc_key)

            all_done = all_done and done

        if all_done:
            print('Deleting Redis Key: ' + cdxj_key)
            self.redis.delete(cdxj_key)
            self.remove_if_empty(user_dir)

    def delete_committed(self, full_filename):
        print('Commit Verified, Deleting: {0}'.format(full_filename))
        try:
            os.remove(full_filename)
            return True
        except Exception as e:
            print(e)

        return False

    def get_storage(self, user, coll, rec):
        if self.is_temp(user):
            return None

        info_key = self.info_key_templ['coll'].format(user=user, coll=coll)

        storage_type = self.redis.hget(info_key, 'storage_type')

        config = None

        # attempt to find storage profile by name
        if storage_type:
            config = self.redis.hgetall(self.storage_key_templ.format(name=storage_type))

        # default storage profile
        if not config:
            config = self.default_storage_profile

        # storage profile class stored in profile 'type'
        storage_class = self.storage_class_map.get(config['type'])

        # keeping local storage only
        if not storage_class:
            return None

        return storage_class(config)

    def add_storage_class(self, type_, cls):
        self.storage_class_map[type_] = cls


# =============================================================================
def run():
    sleep_secs = int(os.environ.get('TEMP_SLEEP_CHECK', 30))
    print('Running storage committer {0}'.format(sleep_secs))

    from webrecorder.rec.s3 import S3Storage

    config = load_wr_config()

    storage_committer = StorageCommitter(config)
    storage_committer.add_storage_class('s3', S3Storage)

    while True:
        try:
            storage_committer()
            time.sleep(sleep_secs)

            storage_committer.redis.publish('close_idle', '')
        except:
            import traceback
            traceback.print_exc()


# =============================================================================
if __name__ == "__main__":
    run()


