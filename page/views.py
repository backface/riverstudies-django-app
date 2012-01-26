from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.db import connection
from django.core import serializers
from django.http import HttpResponse
from page.models import Page
import datetime


def list(request):
	object_list = Page.objects.all()
	return render_to_response('page/list.html', locals(),context_instance=RequestContext(request))

def show(request, id):
	object = get_object_or_404(Page, pk=id)
	return render_to_response('page/show.html',locals(),context_instance=RequestContext(request))
	
def byname(request, name):
	object = get_object_or_404(Page, name=name)
	return render_to_response('page/show.html',locals(),context_instance=RequestContext(request))	
