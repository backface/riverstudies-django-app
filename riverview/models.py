from django.contrib.gis.db import models
from rivers.models import River


class Track(models.Model):
	name = models.CharField(max_length=50)
	title = models.CharField(max_length=50,null=True,blank=True)
	desc = models.TextField(blank=True)	
	river = models.ForeignKey(River)
	time = models.DateTimeField()
	camera = models.CharField(max_length=50,blank=True,null=True)
	length = models.FloatField(null=True,blank=True)

	data_path = models.CharField(max_length=50,blank=True,null=True)
	width = models.IntegerField(null=True,blank=True)
	height = models.IntegerField(null=True,blank=True)	
	offset = models.IntegerField(null=True,blank=True)
	maxResolution = models.FloatField(null=True,blank=True)
	numZoomLevels = models.FloatField(null=True,blank=True)
	direction = models.FloatField(null=True,blank=True)
	#tileWidth = models.IntegerField(null=True,blank=True)

	geom = models.LineStringField(null=True,blank=True)
	objects = models.GeoManager()
	
	class Meta:
		verbose_name_plural = "Tracks"	
	       
	def __unicode__(self):
		return self.title


class TrackPoint(models.Model):
	track = models.ForeignKey(Track)
	px = models.IntegerField(null=True)
	speed = models.FloatField(null=True)
	altitude = models.FloatField(null=True)
	heading = models.FloatField(null=True)
	time = models.DateTimeField()
	geom = models.PointField()

	objects = models.GeoManager()

	class Meta:
		verbose_name_plural = "TrackPoints"

	def __unicode__(self):
		return str(self.id)


class Label(models.Model):
	track = models.ForeignKey(Track)
	geom = models.PointField(srid=900913)
	name = models.CharField(max_length=255)
	desc = models.TextField(blank=True)	
	class Meta:
		verbose_name_plural = "Labels"

	def __unicode__(self):
		return str(self.name)		
