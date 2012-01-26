from django.db import models
from datetime import datetime

class Page(models.Model):
	name = models.CharField(max_length=255)
	title = models.CharField(max_length=255)
	content = models.TextField(blank=True)
	date_created = models.DateTimeField(default=datetime.now,editable=False)
	date_modified = models.DateTimeField(editable=False)

	def save(self):
		self.date_modified = datetime.now()
		super(Page, self).save()	

	def __unicode__(self):
		return self.title	

