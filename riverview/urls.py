from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
	(r'^$','riverstudies.riverview.views.view'),

	(r'^tracklist$',
		'riverstudies.riverview.views.list_fragment'),	
	
	(r'^(?P<id>\d+)/$',
		'riverstudies.riverview.views.view'),
	(r'^(?P<id>\d+)/(?P<offset>\d+)$',
		'riverstudies.riverview.views.view'),
	
	(r'^get_tracksegment/(?P<id>\d+)/(?P<start>\d+)/(?P<stop>\d+)/$',
		'riverstudies.riverview.views.get_tracksegment'),

	(r'^get_trackpoints/$',
		'riverstudies.riverview.views.get_trackpoints'),
	(r'^get_trackpoints/(?P<id>\d+)/$',
		'riverstudies.riverview.views.get_trackpoints'),
	(r'^get_trackpoints/(?P<id>\d+)/(?P<start>\d+)/(?P<stop>\d+)/$',
		'riverstudies.riverview.views.get_trackpointsInSegment'),

		
		
	(r'^get_nearest_px/(?P<id>\d+)/$',
		'riverstudies.riverview.views.get_nearest_px'),
	(r'^labels/(?P<id>\d+)/$',
		'riverstudies.riverview.views.labels'),
	(r'^get_meta/(?P<id>\d+)/$',
		'riverstudies.riverview.views.get_meta'),
	(r'^get_track/(?P<id>\d+)/$',
		'riverstudies.riverview.views.get_track'),
		
	(r'^(?P<name>\w+)/$',
		'riverstudies.riverview.views.view_by_name'),		
	(r'^(?P<name>\w+)/(?P<offset>\d+)$',
		'riverstudies.riverview.views.view_by_name'),


		
	
)

