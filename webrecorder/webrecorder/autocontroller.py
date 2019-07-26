from webrecorder.basecontroller import BaseController
from webrecorder.models.auto import Auto
from bottle import request, response
import requests
import os


# ============================================================================
class AutoController(BaseController):
    def init_routes(self):
        behaviors_api = os.environ.get('BEHAVIOR_API', 'http://behaviors:3030')

        # CREATE AUTO
        @self.app.post('/api/v1/auto')
        def create_auto():
            user, collection = self.load_user_coll()

            autoid = collection.create_auto(request.json)

            return {'auto': autoid}

        # QUEUE URLS
        @self.app.post('/api/v1/auto/<autoid>/queue_urls')
        def add_urls(autoid):
            user, collection, auto = self.load_user_coll_auto(autoid)

            data = request.json or {}

            return auto.queue_urls(data.get('urls'))

        # START
        @self.app.post('/api/v1/auto/<autoid>/start')
        def add_urls(autoid):
            user, collection, auto = self.load_user_coll_auto(autoid)

            data = request.json or {}

            return auto.start(timeout=data.get('timeout', 0),
                              headless=data.get('headless', False),
                              screenshot_uri=data.get('screenshot_uri'))

        # STOP
        @self.app.post('/api/v1/auto/<autoid>/stop')
        def add_urls(autoid):
            user, collection, auto = self.load_user_coll_auto(autoid)

            return auto.stop()

        # GET AUTO
        @self.app.get('/api/v1/auto/<autoid>')
        def get_auto(autoid):
            user, collection, auto = self.load_user_coll_auto(autoid)

            return {'auto': auto.serialize()}

        # GET AUTO IS DONE
        @self.app.get('/api/v1/auto/<autoid>/done')
        def get_auto_done(autoid):
            user, collection, auto = self.load_user_coll_auto(autoid)

            return {'done': auto.is_done()}

        # DELETE AUTO
        @self.app.delete('/api/v1/auto/<autoid>')
        def delete_auto(autoid):
            user, collection, auto = self.load_user_coll_auto(autoid)

            auto.delete_me()

            return {'deleted_id': auto.my_id}

        # Load behavior from behavior server
        # (only for proxy/standalone
        @self.app.get('/api/v1/behavior/behavior')
        def proxy_behavior():
            query = dict(request.query)
            res = requests.get(behaviors_api + '/behavior', params=query)
            response.content_type = 'application/json'
            return res.content

    def load_user_coll_auto(self, autoid, user=None, coll_name=None):
        user, collection = self.load_user_coll(user=user, coll_name=coll_name)

        self.require_admin_beta_access(collection)

        return user, collection, self.load_auto(collection, autoid)

    def load_auto(self, collection, autoid):
        auto = collection.get_auto(autoid)
        if not auto:
            self._raise_error(404, 'Automation not found', api=True,
                              id=autoid)

        return auto




