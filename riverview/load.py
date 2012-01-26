from django.contrib.gis.utils import LayerMapping
from django.contrib.gis.gdal import DataSource
from django.contrib.gis.geos import Point
from django.contrib.gis.geos import LineString
from models import Track, TrackPoint, Label
from riverstudies import settings

import os
import csv, time
import re

#tile_width = 48
#tile_offset = 650
#river_id=1
# import settings

# for importing trackfile
######################
track_id = 38
gpx_file = ""
########################################################
if False:
	in_file = "/data/projects/river-studies/web-data/2012-01-08--guwahati-north/track.log.csv"
	name="North Guwahati"
	camera="Elphel NCL353L"
	tile_width = 2592
	tile_offset = 6000
	import_offset = 33696
	MaxResolution = 2048.0
	zoomlevels = 11
	total_width = 469152
	data_path = "/media/data/2012-01-08--guwahati-north"
	river_id=4
	delimiter=";"
if False:
	in_file = "/data/projects/river-studies/web-data/2011-12-13--varanasi/track.log.csv"
	name="Varansi (deshaked)"
	camera="Elphel NCL353L"
	tile_width = 2592
	tile_offset = 6000
	MaxResolution = 2048.0
	zoomlevels = 11
	total_width = 311040
	data_path = "/media/data/2011-12-13--varanasi"
	river_id=3
	delimiter=";"
if False:
	in_file = "/data/projects/river-studies/web-data/2011-12-13--varanasi-east/track.log.csv"
	name="Varansi (East)"
	camera="Elphel NCL353L"
	tile_width = 2592
	tile_offset = 6000
	MaxResolution = 2048.0
	zoomlevels = 12
	total_width = 282528
	data_path = "/media/data/2011-12-13--varanasi-east"
	river_id=3
	delimiter=";"	
if False:
	in_file = "/data/projects/river-studies/web-data/2011-12-16--chunar-banares/track.log.csv"
	name="Chunar - Banares"
	camera="Elphel NCL353L"
	import_offset = 0;
	tile_width = 2592
	tile_offset = 0
	MaxResolution = 4096.0
	zoomlevels = 13
	total_width = 1016064
	data_path = "/media/data/2011-12-16--chunar-banares"
	river_id=3
	import_offset = 69984;
	trackPointsOnly=False
if False:
	in_file = "/data/projects/river-studies/web-data/2011-07-12--donaukanal/track.log.csv"
	name="Vienna Danube Canal"
	camera="Elphel NCL353L"
	import_offset = 0;
	tile_width = 2592
	tile_offset = 4500
	MaxResolution = 8192.0
	zoomlevels = 13
	total_width = 1666152
	data_path = "/media/data/2011-07-12--donaukanal"
	river_id=1
	trackPointsOnly=False
if True:
	in_file = "/data/projects/river-studies/web-data/2011-06-17--linz-krems/track2.log.csv"
	name="Linz - Krems"
	camera="Elphel NCL353L"
	import_offset = 10368;
	tile_width = 1296
	tile_offset = 4500
	MaxResolution = 8192.0
	zoomlevels = 13
	total_width = 2060640
	data_path = "/media/data/2011-06-17--linz-krems"
	river_id=1
	trackPointsOnly=True	
if False:
	in_file = "/data/projects/river-studies/web-data/2006-12-26--cairo/track.log.csv"
	name="Cairo"
	camera="Sony DCR-PC100E"
	import_offset = 0;
	tile_width = 720
	tile_offset = 0
	MaxResolution = 512.0
	zoomlevels = 9
	total_width = 72720
	data_path = "/media/data/2006-12-26--cairo"
	river_id=2
	trackPointsOnly=False
	



def loadTrackFromFile(in_file=in_file,track_id=track_id,verbose=True,trackPointsOnly=trackPointsOnly):
	
	infile = os.path.abspath(os.path.join(os.path.dirname(__file__), in_file))
	ext = os.path.basename(infile)[-3:]

	if ext == "log":
		delimiter = " "
		col_px = 0
		col_utc = 1
		col_date = 1
		col_lat = 2
		col_lon = 3
		col_spd = 5
		col_alt = 4
		col_brg = 6
	else:
		delimiter = ";"
		col_px = 0;
		col_utc = 1
		col_date = 1
		col_lat = 3
		col_lon = 4
		col_spd = 5
		col_alt = 6
		col_brg = 8

	logReader = csv.reader(open(infile, 'rb'), delimiter=delimiter, quotechar='"')

	i = 0
	hasFirst = False
	trackSaved = False
	points = []
	pattern1 = "none";
	pattern2 = "1970-01-01T00:00:00.0Z"
			
	for row in logReader:
	
		if not re.search(pattern1, row[col_utc]) and not re.search(pattern2, row[2]):
			utc = row[col_utc]
			lat = row[col_lat]
			lon = row[col_lon]
			alt = row[col_alt]
			spd = row[col_spd]
			brg = row[col_brg]

			if ext == "log":
				pxx = int(row[col_px])
				px = i * tile_width + pxx
				if pxx > tile_width-30:
					i += 1;
				hasFirst = True
			else:
				if i > 0: #ignore first line
					pxx = int(row[col_px]) - import_offset
					px = pxx;
					#px = (pxx - tile_offset) * tile_width
					hasFirst = True
				else:
					i+=1
					
			if hasFirst and not trackSaved and not trackPointsOnly:
				t = time.strftime("%Y-%m-%d %H:%M:%S",time.strptime(utc.strip(),"%Y-%m-%dT%H:%M:%S.%fZ"))
				print t
				track = Track(name=name, time=t, river_id=river_id, title=name, camera=camera,
					offset=tile_offset, width=total_width, maxResolution=MaxResolution, numZoomLevels=zoomlevels,
					data_path=data_path, height=tile_width  )
				track.save()
				trackSaved = True
				track_id = track.id

			if hasFirst:
				t = time.strftime("%Y-%m-%d %H:%M:%S",time.strptime(utc.strip(),"%Y-%m-%dT%H:%M:%S.%fZ"))
				pnt = Point(float(lon), float(lat))
				if len(points) > 0:
					if not pnt == points[len(points)-1]:				
						trackpoint = TrackPoint(track_id=track_id,px=px, time=t, geom=pnt, speed=spd, altitude=alt, heading=brg)
						trackpoint.save()
						points.append(pnt)
					else:
						print "discard duplicate gps fix"
				else:
					trackpoint = TrackPoint(track_id=track_id,px=px, time=t, geom=pnt, speed=spd, altitude=alt, heading=brg)
					trackpoint.save()
					points.append(pnt)
		else:
			print "discard non-valid gps log for at %s, fix: %s" % (row[1],row[2])

	linestring = LineString(points)

	if not trackPointsOnly:
		track.geom=linestring
		if brg > 0:
			track.direction = brg
		track.save()
		length = Track.objects.length().get(id=track.id).length.km
		track.length=length
		track.save()

	track = Track.objects.get(id=track_id)
	length = Track.objects.length().get(id=track_id).length.km
	track.geom=linestring
	track.save()		

	print "imported %s trackpoints, total length: %s " % (len(points),length)
	

# Not yet working!!!!
#def loadTrackFromGPX(gpx_file=gpx_file,trackPointsOnly=False,verbose=True):
#	infile = os.path.abspath(os.path.join(os.path.dirname(__file__), gpx_file))
#	name = os.path.basename(gpx_file)[:-4]
#	dataSource = DataSource(infile)
#	layer = dataSource[4]
#	times = layer.get_fields('time')
#	trackpoints = layer.get_geoms()
	#print layer.get_fields('time')

#	t = layer.get_fields('time')[0]
#	if not trackPointsOnly:
#		track = Track(name=name, time=t, river_id=river_id, title=name, camera=camera,
#			offset=tile_offset, width=total_width, maxResolution=MaxResolution, numZoomLevels=zoomlevels,
#			data_path=data_path, height=tile_width )
#		track.save();
#		track_id = track.id
						
#	i = 0
#	points = []
	
#	for trackpoint in trackpoints:
#		#print  trackpoint.geos, layer.get_fields('time')[i], layer.get_fields('ele')[i],  layer.get_fields('speed')[i],  #layer.get_fields('fix'), layer.get_fields('cmt')[i]
#		#i += 1
#		
#		trackpoint = TrackPoint(track_id=track.id,
#			px= layer.get_fields('cmt')[i] - import_offset,
#			time=layer.get_fields('time')[i],
#			geom=trackpoint.geos,
#			speed=layer.get_fields('speed')[i],
#			altitude=layer.get_fields('ele')[i],
#			heading=layer.get_fields('')[i],
#		)
#		trackpoint.save()
#		print  layer.get_fields('time')[i]
#		i += 1
#
#	points.append(trackpoint.geos)
#	linestring = LineString(points)
#
#	track.geom=linestring
#	track.save()
#	length = Track.objects.length().get(id=track.id).length.km
#	track.length=length
#	track.save()
#
#	print "imported %s trackpoints, total length: %s " % (len(points),linestring.length)


def loadLabelsFromFile(in_file,track_id=track_id):
	
	infile = os.path.abspath(os.path.join(os.path.dirname(__file__), in_file))
	logReader = csv.reader(open(infile, 'rb'), delimiter="\t", quotechar='"')
	for row in logReader:
		y = row[0]
		x= row[1]
		name = row[2].title()
		desc = row[3].title()
		point = "POINT(%s %s)" % (x, y)
		label = Label(name=name, geom=point, track_id=track_id )
		label.save()
		print point, name,  track_id
		

def run():
	loadTrackFromFile(in_file)
