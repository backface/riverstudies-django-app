from django.contrib.gis import admin
from models import Track
from models import TrackPoint

class TrackAdmin(admin.GeoModelAdmin):
	list_display = ('title', 'time','river')
	list_filter=('title','river')
	search_fields = ('title',)

class TrackPointAdmin(admin.GeoModelAdmin):
	list_display = ('id','track')
	list_filter=('track',)
	search_fields = ('track',)	

admin.site.register(Track,TrackAdmin )
admin.site.register(TrackPoint, TrackPointAdmin)
