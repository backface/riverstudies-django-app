# Create your views here.

def get_river(request,id):
	river = River.objects.get(id=id)
	river.geom = track.geom.simplify(0.0001)
	response = HttpResponse()
	serializers.serialize("json", [track], stream=response)
	return response
