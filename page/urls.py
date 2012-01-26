from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
(r'^$', 'riverstudies.page.views.list'),
(r'^(?P<id>\d+)/$', 'riverstudies.page.views.show'),
(r'^(?P<name>\w+)$', 'riverstudies.page.views.byname'),
)
