from django.contrib.gis import admin
from models import Track
from models import TrackPoint
from models import Label

class TrackAdmin(admin.OSMGeoAdmin):
	list_display = ('title', 'time','river')
	list_filter=('title','river')
	search_fields = ('title',)

class TrackPointAdmin(admin.OSMGeoAdmin):
	list_display = ('id','track')
	list_filter=('track',)
	search_fields = ('track',)

class LabelAdmin(admin.ModelAdmin):
	list_display = ('name','track')
	list_filter=('track',)
	search_fields = ('track',)		

admin.site.register(Track,TrackAdmin )
admin.site.register(TrackPoint, TrackPointAdmin)
admin.site.register(Label,LabelAdmin)
