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
in_file = "/data/projects/slitscan/malisca/tile-data/2011-12-13--varanasi-deshaked/track.log.csv"
gpx_file = "/data/projects/river-studies/web-data/2011-12-13--varanasi/track2.gpx"
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
###############################

# for importing labels
######################
track_id = 22


def loadTrackFromFile(in_file=in_file,verbose=True,trackPointsOnly=False):
	
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
					pxx = int(row[col_px])
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

			if hasFirst:
				t = time.strftime("%Y-%m-%d %H:%M:%S",time.strptime(utc.strip(),"%Y-%m-%dT%H:%M:%S.%fZ"))
				pnt = Point(float(lon), float(lat))
				if len(points) > 0:
					if not pnt == points[len(points)-1]:				
						trackpoint = TrackPoint(track_id=track.id,px=px, time=t, geom=pnt, speed=spd, altitude=alt, heading=brg)
						trackpoint.save()
						points.append(pnt)
					else:
						print "discard duplicate gps fix"
				else:
					trackpoint = TrackPoint(track_id=track.id,px=px, time=t, geom=pnt, speed=spd, altitude=alt, heading=brg)
					trackpoint.save()
					points.append(pnt)
		else:
			print "discard non-valid gps log for at %s, fix: %s" % (row[1],row[2])

	if not trackPointsOnly:
		linestring = LineString(points)
		track.geom=linestring
		track.save()
		length = Track.objects.length().get(id=track.id).length.km
		track.length=length
		track.save()
	
	print "importe %s trackpoints, total length: %s " % (len(points),linestring.length)
	

# Not yet working!!!!
def loadTrackPointsFromGPX(gpx_file=gpx_file,verbose=True):
	infile = os.path.abspath(os.path.join(os.path.dirname(__file__), gpx_file))
	name = os.path.basename(gpx_file)[:-4]
	dataSource = DataSource(infile)
	layer = dataSource[4]
	print layer
	print dataSource[0]
	print layer
	times = layer.get_fields('time')
	trackpoints = layer.get_geoms()
	i = 0
	for trackpoint in trackpoints:
		print trackpoint.geos, layer.get_fields('time')[i], layer.get_fields('ele')[i],  layer.get_fields('speed')[i],  layer.get_fields('fix')[i]
		i += 1
		#trackpoint = TrackPoint(track_id=13,px=px, time=t, geom=pnt, speed=spd, altitude=alt, heading=brg)

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
