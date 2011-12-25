from django.contrib.gis import admin
from models import River


admin.site.register(River, admin.GeoModelAdmin)

