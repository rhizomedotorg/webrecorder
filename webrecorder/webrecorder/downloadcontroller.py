from warcio.timeutils import timestamp_now
from warcio.warcwriter import BufferWARCWriter

from pywb.utils.loaders import BlockLoader
from pywb.utils.io import StreamIter, chunk_encode_iter

from webrecorder.basecontroller import BaseController
from webrecorder import __version__

from webrecorder.models.stats import Stats

from bottle import response, request
from six.moves.urllib.parse import quote
from six import iteritems
from collections import OrderedDict
import json


# ============================================================================
class DownloadController(BaseController):
    COPY_FIELDS = ('title', 'desc', 'size', 'updated_at', 'created_at', 'recorded_at', 'pages', 'lists',
                   'public', 'public_index')

    DEFAULT_REC_TITLE = 'Session from {0}'

    def __init__(self, *args, **kwargs):
        super(DownloadController, self).__init__(*args, **kwargs)
        config = kwargs['config']
        self.paths = config['url_templates']
        self.download_filename = config['download_paths']['filename']

        self.download_chunk_encoded = config['download_chunk_encoded']

    def init_routes(self):
        @self.app.get('/<user>/<coll>/<rec>/$download')
        def logged_in_download_rec_warc(user, coll, rec):
            self.redir_host()

            return self.handle_download(user, coll, rec)

        @self.app.get('/<user>/<coll>/$download')
        def logged_in_download_coll_warc(user, coll):
            self.redir_host()

            return self.handle_download(user, coll, '*')

        @self.app.get('/api/v1/download/webdata')
        def wasapi_list_api():
            return self.wasapi_list()

        @self.app.get('/api/v1/download/<user>/<coll>/<filename>')
        def wasapi_download_api(user, coll, filename):
            return self.wasapi_download(user, coll, filename)

    def create_warcinfo(self, creator, name, metadata, source, serialized, filename):
        for key, value in iteritems(serialized):
            if key in self.COPY_FIELDS:
                metadata[key] = value

        if not metadata.get('title'):
            metadata['title'] = self.DEFAULT_REC_TITLE.format(source.to_iso_date(metadata['created_at'], no_T=True))
            metadata['auto_title'] = True

        info = OrderedDict([
            ('software', 'Webrecorder Platform v' + __version__),
            ('format', 'WARC File Format 1.0'),
            ('creator', creator.name),
            ('isPartOf', name),
            ('json-metadata', json.dumps(metadata)),
        ])

        wi_writer = BufferWARCWriter()
        wi_writer.write_record(wi_writer.create_warcinfo_record(filename, info))
        return wi_writer.get_contents()

    def create_coll_warcinfo(self, user, collection, filename=''):
        metadata = {}
        metadata['type'] = 'collection'

        isPartOf_name = quote(collection.name)
        serialized = collection.serialize(include_recordings=False,
                                          include_lists=True,
                                          include_bookmarks='all-serialize',
                                          include_rec_pages=False,
                                          include_pages=False,
                                          convert_date=False)

        return self.create_warcinfo(user, isPartOf_name, metadata, collection, serialized, filename)

    def create_rec_warcinfo(self, user, collection, recording, filename=''):
        metadata = {}
        # metadata['pages'] = collection.list_rec_pages(recording)
        metadata['type'] = 'recording'
        # metadata['id'] = recording.my_id
        rec_type = recording.get_prop('rec_type')
        if rec_type:
            metadata['rec_type'] = rec_type

        isPartOf_name = quote(collection.name) + '/' + quote(recording.name)

        serialized = recording.serialize(include_pages=True,
                                         convert_date=False)

        return self.create_warcinfo(user, isPartOf_name, metadata, recording, serialized, filename)

    def handle_download(self, user, coll_name, recs):
        user, collection = self.user_manager.get_user_coll(user, coll_name)

        if not collection:
            self._raise_error(404, 'no_such_collection')

        self.access.assert_can_write_coll(collection)

        # collection['uid'] = coll
        collection.load()

        Stats(self.redis).incr_download(collection)

        now = timestamp_now()

        name = coll_name
        if recs != '*':
            rec_list = recs.split(',')
            if len(rec_list) == 1:
                name = recs
            else:
                name += '-' + recs
        else:
            rec_list = None

        filename = self.download_filename.format(title=quote(name),
                                                 timestamp=now)
        loader = BlockLoader()

        coll_info = self.create_coll_warcinfo(user, collection, filename)

        def iter_infos():
            for recording in collection.get_recordings(load=True):
                if rec_list and recording.name not in rec_list:
                    continue

                warcinfo = self.create_rec_warcinfo(user,
                                                    collection,
                                                    recording,
                                                    filename)

                size = len(warcinfo)
                size += recording.size
                yield recording, warcinfo, size

        def read_all(infos):
            yield coll_info

            for recording, warcinfo, _ in infos:
                yield warcinfo

                for n, warc_path in recording.iter_all_files():
                    try:
                        fh = loader.load(warc_path)
                    except Exception:
                        print('Skipping invalid ' + warc_path)
                        continue

                    for chunk in StreamIter(fh):
                        yield chunk

        response.headers['Content-Type'] = 'application/octet-stream'
        response.headers['Content-Disposition'] = "attachment; filename*=UTF-8''" + filename

        # if not transfer-encoding, store infos and calculate total size
        if not self.download_chunk_encoded:
            size = len(coll_info)
            infos = list(iter_infos())
            size += sum(size for r, i, size in infos)

            response.headers['Content-Length'] = size
            return read_all(infos)

        else:
            # stream everything
            response.headers['Transfer-Encoding'] = 'chunked'

            return read_all(iter_infos())

    def wasapi_list(self):
        username = request.query.getunicode('user')
        coll_name = request.query.getunicode('coll_name')
        user, collection = self.user_manager.get_user_coll(username, coll_name)
        if not user:
            self._raise_error(404, 'no_such_user')

        # todo: double check this
        basic_auth = request.auth
        if basic_auth:
            authed_user = self.user_manager.get_authenticated_user(basic_auth[0], basic_auth[1])
            if not authed_user or authed_user.my_id != user.my_id:
                self._raise_error(404, 'Only Valid for Current User')
        else:
            self.access.assert_is_curr_user(user)

        colls = None
        if coll_name:
            if collection:
                colls = [collection]
            else:
                self._raise_error(404, 'no_such_collection')

        else:
            colls = user.get_collections()

        files = []
        download_path = self.get_origin() + '/api/v1/download/{user}/{coll}/{filename}'

        for collection in colls:
            storage = collection.get_storage()
            for recording in collection.get_recordings():
                if not recording.is_fully_committed():
                    continue

                for name, path in recording.iter_all_files(include_index=False):
                    full_warc_path = collection.get_warc_path(name)
                    if storage.is_local_storage:
                        path = download_path.format(user=username, coll=collection.name, filename=name)
                    else:
                        path = storage.create_presigned_url(full_warc_path)

                    files.append({'content-type': 'application/warc',
                                  'filename': name,
                                  'rec_id': recording.my_id,
                                  'coll_name': collection.name,
                                  'checksum': storage.get_checksum(full_warc_path),
                                  'locations': [path]})

        return {'files': files, 'include-extra': True}

    def wasapi_download(self, user, coll_name, filename):
        user, collection = self.user_manager.get_user_coll(user, coll_name)

        if not user:
            self._raise_error(404, 'no_such_user')

        if not collection:
            self._raise_error(404, 'no_such_collection')

        # only users with write access can use wasapi
        self.access.assert_can_write_coll(collection)

        warc_key = collection.get_warc_key()
        warc_path = self.redis.hget(warc_key, filename)

        if not warc_path:
            self._raise_error(404, 'file_not_found')

        response.headers['Content-Type'] = 'application/octet-stream'
        response.headers['Content-Disposition'] = "attachment; filename*=UTF-8''" + filename
        response.headers['Transfer-Encoding'] = 'chunked'

        loader = BlockLoader()
        fh = None
        try:
            fh = loader.load(warc_path)
        except Exception:
            self._raise_error(400, 'file_load_error')

        def read_all(fh):
            for chunk in StreamIter(fh):
                yield chunk

        return read_all(fh)
