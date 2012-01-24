import os
from django.contrib.gis.utils import LayerMapping
from django.contrib.gis.gdal import DataSource
from django.contrib.gis.geos import Point
from django.contrib.gis.geos import LineString
from models import River
from riverstudies import settings

#example
gpx_file = 'data/danube.gpx'

def loadRiverFromGPX(gpx_file,verbose=True):
	infile = os.path.abspath(os.path.join(os.path.dirname(__file__), gpx_file))
	name = os.path.basename(gpx_file)[:-4]
	dataSource = DataSource(infile)
	layer = dataSource[4]
	times = layer.get_fields('time')
	trackpoints = layer.get_geoms()
	points = []
	for trackpoint in trackpoints:
		points.append(trackpoint.geos)
	linestring = LineString(points)
	river = River(name=name, geom=linestring.wkt)
	river.save()

def run():
	loadRiverFromGPX(gpx_file,True)

