import os, sys
sys.path.append('/home/mash/data/projects/river-studies/django/apps/')
os.environ['DJANGO_SETTINGS_MODULE'] = 'riverstudies.settings'

import django.core.handlers.wsgi

application = django.core.handlers.wsgi.WSGIHandler()
