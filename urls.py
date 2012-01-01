from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
	(r'^list/', 'riverstudies.riverview.views.list'),
	(r'^$','riverstudies.riverview.views.index'),

	(r'^view/', include('riverstudies.riverview.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),
    (r'^media/(?P<path>.*)$', 'django.views.static.serve',{'document_root': '/data/projects/river-studies/django/apps/riverstudies/media'}),

)

