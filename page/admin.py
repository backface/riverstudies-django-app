from django.contrib import admin
from models import Page

class PageAdmin(admin.ModelAdmin):
	list_display = ('name','title')
	list_filter=('id',)
	search_fields = ('title','content')		

admin.site.register(Page,PageAdmin )
