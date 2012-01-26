from django.shortcuts import render_to_response, get_object_or_404
from django.db import connection
from django.core import serializers
from django.http import HttpResponse
from riverview.models import Track, TrackPoint, Label
import simplejson as json
import datetime

class JSONEncoder(json.JSONEncoder):
	def default(self, obj):
		if isinstance(obj, datetime.datetime):
			return obj.strftime('%Y-%m-%dT%H:%M:%S')
		else:
			return json.JSONEncoder.default(self, obj)

class JsonResponse(HttpResponse):
	def __init__(self, data):
		content = simplejson.dumps(data,indent=2,ensure_ascii=False)
		super(JsonResponse, self).__init__(content=content, mimetype='application/json; charset=utf8')


def index(request,id=0):
	if id == 0:
		tracks = Track.objects.all().order_by('-id')
		id = tracks[0].id

	track = get_object_or_404(Track, pk=id) 
	offset = 0
	return render_to_response('riverviews/riverviews.html', locals())


def list(request):
	tracks = Track.objects.all().order_by('-river__id','-id')
	last_river = ""
	return render_to_response('riverviews/riverlist.html', locals())

def list_fragment(request):
	tracks = Track.objects.all().order_by('-river__id','-time')
	last_river = ""
	return render_to_response('riverviews/tracklist_fragment.html', locals())

def view(request,id=0,offset=0):

	if id == 0:
		tracks = Track.objects.all().order_by('-id')
		id = tracks[0].id

	# if lat/lon is given find nearest track,trackpoint and offset first
	if request.GET.__contains__('lat') and request.GET.__contains__('lon'):
		lat = request.GET.get('lat')
		lon = request.GET.get('lon')

		if id != 0:
			where = "where track_id = %s" % id
		else:
			where = ""
			
		tp = TrackPoint.objects.raw('''
			select distinct
				id, track_id,
				ST_astext(geom),
				px,
				ST_distance(geom, ST_GeometryFromText('POINT(%s %s)',4326),true) as dist
			from
				riverview_trackpoint
			%s
			order by
				dist
			limit 1;''' % (lon,lat,where)
		)

		offset = tp[0].px
		id = tp[0].track_id

	# load track
	track = Track.objects.get(id=id)
	
	if offset == 0:
		offset = track.offset

	return render_to_response('riverviews/riverviews.html', locals())

def view_by_name(request,name,offset=0):
	track = get_object_or_404(Track, name=name) 
	return view(request,track.id,offset)


def get_tracksegment(request,id,start,stop):	
	cursor = connection.cursor()
	cursor.execute('''
		select
			ST_AsGeoJSON(ST_MakeLine(track.geom)) as newgeom,
			MIN(time) as time_first,
			MAX(time) as time_last,
			ST_AsText(ST_StartPoint(ST_MakeLine(track.geom))) as startpoint,
			ST_AsText(ST_EndPoint(ST_MakeLine(track.geom))) as endpoint,
			ST_Length_Spheroid(ST_MakeLine(track.geom),'SPHEROID["GRS_1980",6378137,298.257222101]') as len,
			ST_Azimuth(ST_Line_Interpolate_Point(ST_MakeLine(track.geom), 0.95), ST_EndPoint(ST_MakeLine(track.geom)))/(2*pi())*360 as degAz
		from (
			select
				id,track_id, geom, time
			from riverview_trackpoint
			where track_id=%s and px > %s and px < %s
			order by time
			) as track;''' % (id,start,stop))
	track_segment = cursor.fetchone()

	response = HttpResponse(JSONEncoder().encode(track_segment),mimetype="application/json")
	return response		

def get_trackpoints(request,id):
	points = TrackPoint.objects.filter(track=id).order_by('id')
	return render_to_response('riverviews/get_trackpoints.html', locals())
	#response = HttpResponse()
	#json_serializer = serializers.get_serializer("json")()
	#json_serializer.serialize(points, ensure_ascii=False, stream=response)
	#return response

def get_trackpointsInSegment(request,id,start,stop):
	# serializer is really slow!!!
	#points = TrackPoint.objects.filter(track=id).filter(px__gte=start).filter(px__lte=stop).order_by('id')
	#response = HttpResponse(mimetype="application/json")
	#serializers.serialize("json", points, stream=response)
	#return response
	
	cursor = connection.cursor()
	cursor.execute('select px, ST_AsText(geom), time, heading from riverview_trackpoint where track_id=%s and px > %s and px < %s order by px' % (id,start,stop))
	track_segment = cursor.fetchall()
	response = HttpResponse(JSONEncoder().encode(track_segment),mimetype="application/json")
	return response			

def get_track(request,id):
	track = Track.objects.get(id=id)
	track.geom = track.geom.simplify(0.0001)
	response = HttpResponse()
	serializers.serialize("json", [track], stream=response)
	return response

def get_meta(request,id):
	track = Track.objects.get(id=id)
	if track.geom != None:
		track.geom = track.geom.simplify(0.0001)
	response = HttpResponse()
	serializers.serialize("json", [track], stream=response)
	return response

def get_nearest_px(request,id=6):

	# if lat/lon is given find nearest track,trackpoint and offset first
	if request.GET.__contains__('lat') and request.GET.__contains__('lon'):
		lat = request.GET.get('lat')
		lon = request.GET.get('lon')
	else:
		lat = 0
		lon = 0

	query = '''
		select distinct
			id,
			px,
			ST_distance(geom, ST_GeometryFromText('POINT(%s %s)',4326),true) as dist
		from
			riverview_trackpoint
		where track_id = %s
		order by dist		
		limit 1;''' % (lon,lat,id)
			
	tp = TrackPoint.objects.raw(query)
	trackpoint = TrackPoint.objects.get(id=tp[0].id)
	response = HttpResponse()
	serializers.serialize("json", [trackpoint], stream=response)

	cursor = connection.cursor()
	cursor.execute(query)
	track_segment = cursor.fetchall()
	response = HttpResponse(JSONEncoder().encode(track_segment),mimetype="application/json")
		
	return response

def labels(request,id=0):
	from vectorformats.Formats import Django, GeoJSON
	qs = Label.objects.filter(track=id)
	djf = Django.Django(geodjango="geom", properties=['name', 'desc'])
	geoj = GeoJSON.GeoJSON()
	s = geoj.encode(djf.decode(qs))
	response = HttpResponse(s,mimetype="application/json")
	return response
	
