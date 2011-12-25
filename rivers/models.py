#from django.db import models
from django.contrib.gis.db import models


class River(models.Model):
	name = models.CharField(max_length=50)
	desc = models.TextField(blank=True)	
	geom = models.LineStringField()
	
	objects = models.GeoManager()
	
	class Meta:
		verbose_name_plural = "Rivers"

	def __unicode__(self):
		return self.name
