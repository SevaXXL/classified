import cgi
import os
import re

from google.appengine.api import users

from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from django.utils import simplejson

class Adv_classified(db.Model):
    adv_rubrika = db.StringProperty()
    adv_content = db.TextProperty()
    adv_type = db.StringProperty(choices=set(["normal", "bold", "frame"]), default="normal")
    adv_begin = db.IntegerProperty()
    adv_end = db.IntegerProperty()

class Adv_number(db.Model):
    adv_n = db.IntegerProperty()

class MainPage(webapp.RequestHandler):
    def get(self):
        number = Adv_number.get_or_insert("num")
        template_values = {
            "number": number.adv_n,
            "logout": users.create_logout_url("/"),
            "user": users.get_current_user().nickname()
        }
        path = os.path.join(os.path.dirname(__file__), "index.html")
        self.response.out.write(template.render(path, template_values))

class RPCHandler(webapp.RequestHandler):
    def post(self):
        if (self.request.get("action") == "all"):
            classified = db.GqlQuery("SELECT * FROM Adv_classified")
            jsonRAW = []
            for adv in classified:
                jsonRAW.append({
                    "id": adv.key().id(),
                    "rubrika": adv.adv_rubrika,
                    "content": cgi.escape(adv.adv_content),
                    "type": adv.adv_type,
                    "begin": adv.adv_begin,
                    "count": adv.adv_end - adv.adv_begin
                })
        else:
            if re.search('^(\[\{")(.+)(\}\])$', self.request.get("content")):
                classifieds = simplejson.loads(self.request.get("content"))
                for adv in classifieds:
                    classified = Adv_classified()
                    classified.adv_content = adv['content']
                    classified.adv_rubrika = adv['rubrika']
                    classified.adv_type = adv['type']
                    classified.adv_begin = int(adv['begin'])
                    classified.adv_end = int(adv['begin']) + int(adv['count'])
                    classified.put()
                jsonRAW = {"id":"!!!_reload_page_by_javascript_!!!"}
            else:
                if (self.request.get("id")):
                    classified = Adv_classified.get_by_id(int(self.request.get("id")))
                else:
                    classified = Adv_classified()
                classified.adv_content = self.request.get("content")
                classified.adv_rubrika = self.request.get("rubrika")
                classified.adv_type = self.request.get("type")
                classified.adv_begin = int(self.request.get("begin"))
                classified.adv_end = int(self.request.get("begin")) + int(self.request.get("count"))
                classified.put()
                jsonRAW = {"id":"%s" % classified.key().id()}

        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(simplejson.dumps(jsonRAW))

class Num(webapp.RequestHandler):
    def get(self):
        number = Adv_number.get_or_insert("num")
        if self.request.get("number"):
            number.adv_n = int(self.request.get("number"))
            number.put()
        self.redirect("/")

class Export(webapp.RequestHandler):
    def post(self):
        self.response.headers["Content-Type"] = "text/plain"
        self.response.headers["Content-Disposition"] = "attachment; filename='%s'" % self.request.get("filename")
        self.response.out.write(self.request.get("data"))

class Delete(webapp.RequestHandler):
    def get(self):
        number = Adv_number.get_by_key_name("num")
        classified = db.GqlQuery("SELECT * FROM Adv_classified WHERE adv_end < :1", number.adv_n)
        db.delete(classified)
        self.redirect("/")

application = webapp.WSGIApplication(
                                     [("/", MainPage),
                                      ("/rpc", RPCHandler),
                                      ("/num", Num),
                                      ("/export", Export),
                                      ("/del", Delete)],
                                     debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
