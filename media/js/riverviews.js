var gps=1;
var debug=0;
var showmousepos=0;
var info=1;
var index=1;
var label_edit=0;

var river = {};
river.view = null;
river.autopanTimer = null;
river.autopan = true;
river.positionTimer = null;
river.bounds = null;
river.height = null;
river.length = null;
river.stepsize = 2.0;
river.offset = 0;
river.global_offset = 0;
river.id = 0;
river.meta_url =  "/view/get_meta/"
river.path = null;
river.hasgps = true;
river.pan_interval = 100;
river.ffstep = 500.0;

river.labels = {}
river.labels.layer = null;

river.gps = {};
river.gps.buffer = {}
river.gps.buffer.points = new Array();
river.gps.buffer.points_data = new Array();
river.gps.buffer.min_px = 0;
river.gps.buffer.max_px = 0;
river.gps.buffer.min_id = 0;
river.gps.buffer.max_id = 0;
river.gps.buffer.pxplus = 20000;
river.gps.buffer.buf = 5000;
river.gps.pointupdateInProgress = false;

river.gps.current = {};
river.gps.current.points = new Array();
river.gps.current.points_data = new Array();
river.gps.current.min_px = 0;
river.gps.current.max_px = 0;
river.gps.current.min_id = 0;
river.gps.current.max_id = 0;

var maps = {};
maps.update_cyle = 2000;
maps.re = new RegExp("^SRID=\d+;(.+)", "i");

maps.detail = {};
maps.detail.map = null;
maps.detail.layers = {};

maps.track = {};
maps.track.map = null;
maps.track.layers = {};


count = 0;

// avoid pink tiles
OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;
OpenLayers.Util.onImageLoadErrorColor = "transparent";
OpenLayers.Feature.Vector.style["default"]["strokeWidth"] = 3; // Default too thin for linestrings. 

function log(msg) {
    $("#debug").prepend( msg + "<br />");
}

function status_msg(msg,load) {
    
    if (load == true) {
		$("#status_msg").html("<blink>"+msg+"</blink>");
	} else {
		$("#status_msg").html(msg);
	}	
}

maps.track.controlClick = OpenLayers.Class(OpenLayers.Control, {                
	defaultHandlerOptions: {
		'single': false,
		'double': true,
		'pixelTolerance': 0,
		'stopSingle': false,
		'stopDouble': false
	},

	initialize: function(options) {
		this.handlerOptions = OpenLayers.Util.extend(
			{}, this.defaultHandlerOptions
		);
		OpenLayers.Control.prototype.initialize.apply(
			this, arguments
		); 
		this.handler = new OpenLayers.Handler.Click(
			this, {
				'dblclick': this.trigger
			}, this.handlerOptions
		);
	}, 

	trigger: function(e) {
		var lonlat = maps.track.map.getLonLatFromViewPortPx(e.xy);
		lonlat.transform(
			new OpenLayers.Projection("EPSG:900913"), // to Spherical Mercator Projection
			new OpenLayers.Projection("EPSG:4326") // transform from WGS 1984
		);
		url = "http://"+ window.location.host +window.location.pathname;
		url = url + "?lat="+ lonlat.lat + "&lon=" + lonlat.lon;
	
		status_msg("find nearest track point..");
		
		jQuery.getJSON( "/view/get_nearest_px/"+river.id+"/?lat="+lonlat.lat+"&lon="+lonlat.lon ,
			function(data) {
				maps.track.hide();      
				px = data[0][1];
				status_msg("jumping to new location.");
				river.jumpTo(px);
				
			});					
		//window.location.href = url
	}
});


maps.track.init = function (tr,dir) {
	          	
	track = OpenLayers.Geometry.fromWKT(tr);
	maps.track.map = new OpenLayers.Map("track_map", {controls:[]});
	maps.track.layers.base = new OpenLayers.Layer.OSM();
	maps.track.map.addLayer(maps.track.layers.base);
	maps.track.layers.vector = new OpenLayers.Layer.Vector("track_layer"); 
	maps.track.map.addLayer(maps.track.layers.vector);
	maps.track.layers.markers = new OpenLayers.Layer.Markers( "Markers" );
	maps.track.map.addLayer(maps.track.layers.markers);	
	
	maps.track.track = new OpenLayers.Feature.Vector(track.transform(
		new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
		new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
		), null, {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWidth: 5
        });  
  
	maps.track.layers.vector.addFeatures(maps.track.track);

	maps.track.layers.direction = new OpenLayers.Layer.Vector(
                "Simple Geometry",
                {
                    styleMap: new OpenLayers.StyleMap({
                        "default": {
                            externalGraphic: "/media/img/directionb.png",
                            graphicHeight: 24,
                            graphicYOffset: -12,
                            rotation: "${angle}",
                            fillOpacity: "1.0"
                        }
                    })
                }
            );
    

	points = track.getVertices();
	pt = points[points.length-1];

	 feature = 
		new OpenLayers.Feature.Vector(
			pt,
				 {angle: dir, opacity:1.0}
			);
	maps.track.layers.direction.addFeatures(feature)
	maps.track.map.addLayer(maps.track.layers.direction);


	maps.track.map.zoomToExtent(maps.track.track.geometry.getBounds());

	OpenLayers.Control.Click = maps.track.controlClick;  
	var click = new OpenLayers.Control.Click();
	maps.track.map.addControl(click);
	
	maps.track.map.addControl(new OpenLayers.Control.Attribution());
	maps.track.map.addControl(new OpenLayers.Control.PanZoom());
	click.activate();

	return true;	
}

maps.track.update = function(lat,lon) {
	var size = new OpenLayers.Size(24,24);
	var offset = new OpenLayers.Pixel(-(size.w/2), -size.h/2);
	
	var icon = new OpenLayers.Icon('/media/img/marker.png', size, offset);
	var marker = new OpenLayers.Marker(
					new OpenLayers.LonLat(lon,lat).transform(
						new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
						new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
					), icon
				);
	maps.track.layers.markers.clearMarkers();
	maps.track.layers.markers.addMarker(marker);
}

maps.track.hide = function() {
	$("#track_map").hide();
	$("#track_map_head").show();
	$("#show_track").html("show track");
}

maps.track.show = function() {
	$("#track_map").show();
	$("#show_track").html("hide track");
}

maps.detail.init = function (lat,lon) {
	maps.detail.map = new OpenLayers.Map("ol_map");

	maps.detail.layers.base = new OpenLayers.Layer.OSM();
	maps.detail.map.addLayer(maps.detail.layers.base);

	maps.detail.layers.vector = new OpenLayers.Layer.Vector("cur_track"); 
	maps.detail.map.addLayer(maps.detail.layers.vector);
	
	//maps.detail.layers.markers = new OpenLayers.Layer.Markers( "Markers" );	
	maps.detail.layers.markers = new OpenLayers.Layer.Vector(
                "Simple Geometry",
                {
                    styleMap: new OpenLayers.StyleMap({
                        "default": {
                            externalGraphic: "/media/img/direction.png",
                            graphicHeight: 24,
                            graphicYOffset: -12,
                            rotation: "${angle}",
                            fillOpacity: "1.0"
                        }
                    })
                }
            );
	maps.detail.map.addLayer(maps.detail.layers.markers);            

	maps.detail.map.setCenter(new OpenLayers.LonLat(16,48.52), 15);	
}

/*
maps.detail.updateJSON = function(json) {			
	var parser = new OpenLayers.Format.GeoJSON();
	var features = parser.read(json);

	features[0].geometry = features[0].geometry.transform(
		new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
		new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
	);
	maps.detail.layers.vector.removeFeatures(maps.detail.layers.vector.features);
	maps.detail.layers.vector.destroyFeatures();
	maps.detail.layers.vector.addFeatures(features);

	zoom = maps.detail.map.getZoom();
	maps.detail.map.setCenter(features[0].geometry.getBounds().getCenterLonLat(), zoom);
	//maps.detail.map.zoomToExtent(features[0].geometry.getBounds());
	//maps.detail.map.zoomTo(zoom)

	
	//log(features[0].geometry);
	//var y = Math.sin(dLon) * Math.cos(lat2);
	//var x = Math.cos(lat1)*Math.sin(lat2) -
    //    Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
	//var brng = Math.atan2(y, x).toDeg();
}
*/

maps.detail.updateLineString= function(linestring) {			
	ls = linestring.clone();
	
	if (maps.detail.layers.vector) {
		maps.detail.layers.vector.removeFeatures(maps.detail.layers.vector.features);
		maps.detail.layers.vector.destroyFeatures();
	}
	
	feature = new OpenLayers.Feature.Vector(ls.transform(
		new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
		new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
		), null, {
            strokeColor: "#ffff00",
            strokeOpacity: 1.0,
            strokeWidth: 5
        });
	maps.detail.layers.vector.addFeatures(feature);
	
	zoom = maps.detail.map.getZoom();
	maps.detail.map.setCenter(ls.getBounds().getCenterLonLat(), zoom);
}

maps.detail.updateHeading = function (brg,lat,lon) {
	var d =  Math.round( (parseFloat(brg) / 360.0) * 40) * 3;
	var size = new OpenLayers.Size(24,24);
	var offset = new OpenLayers.Pixel(-(size.w/2), -size.h/2);
	   
	if (maps.detail.layers.markers) {
		maps.detail.layers.markers.removeFeatures();
		maps.detail.layers.markers.destroyFeatures();
	}

	feature = 
		new OpenLayers.Feature.Vector(
			new OpenLayers.Geometry.Point(lon,lat).transform(
						new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
						new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
					),
				 {angle: brg, opacity:1.0}
			);
	maps.detail.layers.markers.addFeatures(feature);
}

maps.detail.hide = function() {
	$("#ol_map").hide();
	$("#map_button").html("show map");
}

maps.detail.show = function() {
	$("#ol_map").show();
	$("#map_button").html("hide map");
}

river.load = function() {
	load(0,0);
}

river.load = function(i,o){
	river.getTrackList();
	river.offset = o;
	river.id = i;
	river.loadMetaData(river.meta_url + i + "/");	
}

river.loadMetaData = function(url) {
	status_msg("loading meta data...",true);
	jQuery.getJSON( url,
		function(data) {
			$("#title").html(data[0].fields.title);
			//$("#camera").html(data[0].fields.camera);
			if (!info)
				$("#info").hide();
			river.init(data[0].fields);
		});
}

river.controlClick = OpenLayers.Class(OpenLayers.Control, {                
	defaultHandlerOptions: {
		'single': false,
		'double': true,
		'pixelTolerance': 0,
		'stopSingle': false,
		'stopDouble': false
	},

	initialize: function(options) {
		this.handlerOptions = OpenLayers.Util.extend(
			{}, this.defaultHandlerOptions
		);
		OpenLayers.Control.prototype.initialize.apply(
			this, arguments
		); 
		this.handler = new OpenLayers.Handler.Click(
			this, {
				'dblclick': this.trigger
			}, this.handlerOptions
		);
	}, 

	trigger: function(e) {
		alert("x");
		var lonlat = maps.track.map.getLonLatFromViewPortPx(e.xy);
		lonlat.transform(
			new OpenLayers.Projection("EPSG:900913"), // to Spherical Mercator Projection
			new OpenLayers.Projection("EPSG:4326") // transform from WGS 1984
		);
		url = "http://"+ window.location.host +window.location.pathname;
		url = url + "?lat="+ lonlat.lat + "&lon=" + lonlat.lon;
	
		// hide map now
		//maps.track.hide();              
		status_msg("find nearest track point..");
		
		jQuery.getJSON( "/view/get_nearest_px/"+river.id+"/?lat="+lonlat.lat+"&lon="+lonlat.lon ,
			function(data) {
				px = data[0][1];
				status_msg("jumping to new location.");
				river.jumpTo(px);
				
			});					
		//window.location.href = url
	}
});

river.labels.show = function () {
	river.labels.layer.display(true);
}

river.labels.hide = function () {
	river.labels.layer.display(false);
}

river.labels.add = function() {

	var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
	renderer = (renderer) ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;
	
    var stylemap = new OpenLayers.StyleMap({'default':{
                    strokeColor: "#EEEEEE",
                    strokeOpacity: 0,
                    strokeWidth: 2,
                    fillColor: "#D0D0D0",
                    fillOpacity: 0,
                    pointRadius: 4,
                    pointerEvents: "painted",
                    // label with \n linebreaks
					label : "${name}",
					fontColor: "white",
                    fontSize: "12px",
                    fontFamily: "Georgia, Times, serif",
                    fontWeight: "normal",
                    labelAlign: "cm",
                    labelXOffset: "10",
                    labelYOffset: "0"
                }
    });

	stylemap.styles['default'].addRules([
            new OpenLayers.Rule({
                minScaleDenominator: 5039716608,
                symbolizer: {fontSize: "7px",fontWeight: "normal",fontFamily: "Georgia, Times, serif",}
            }),
            new OpenLayers.Rule({
                elseFilter: true
            })
        ]);
        
	river.labels.layer = new OpenLayers.Layer.Vector(
		"GML", {
			strategies: [new OpenLayers.Strategy.Fixed()],
			protocol: new OpenLayers.Protocol.HTTP({
				url:  "/view/labels/" + river.id + "/",
				format: new OpenLayers.Format.GeoJSON()
            
			}),
         styleMap: stylemap 
     });
     river.view.addLayer(river.labels.layer);     
}


river.init = function(rec_data) {
	rec_data.bounds = [0, -rec_data.height, rec_data.width, 0];
	river.path = rec_data.data_path + "/";

	if (rec_data.geom == null) {
		gps = 0;
		status_msg("no gps data available");
	}
	var options = {
		controls: [],
		maxExtent: new OpenLayers.Bounds(
			rec_data.bounds[0],
			rec_data.bounds[1],
			rec_data.bounds[2],
			rec_data.bounds[3] ),
		maxResolution: rec_data.maxResolution,
		numZoomLevels: rec_data.numZoomLevels
	};
		
	river.bounds = new OpenLayers.Bounds(
			rec_data.bounds[0],
			rec_data.bounds[1],
			rec_data.bounds[2],
			rec_data.bounds[3] );
	river.height = rec_data.bounds[1] * -1;
	river.length = rec_data.bounds[2];
	
	river.view = new OpenLayers.Map('river', options);

	var layer = new OpenLayers.Layer.TMS( "TMS Layer", river.path,
		{  url: river.path, serviceVersion: '.', layername: '.', alpha: true,
			type: 'png', getURL: river.getTileURL 
		});

    river.view.addLayer(layer);
    river.labels.add();
    //river.labels.hide();
    
	river.view.zoomToExtent( new OpenLayers.Bounds( 0.0, -river.height, getWindowWidth(), 0.0), false );

	if (river.offset == 0)
		river.offset = rec_data.offset;
	river.global_offset = rec_data.offset;
	river.view.panTo( new OpenLayers.LonLat(river.offset, -river.height/2) );
	
	// controls
	//river.view.addControl(new OpenLayers.Control.KeyboardDefaults());	

	// enable autopan
	if (river.autopan) {		
		river.autopanTimer = window.setInterval('river.doPan()', river.pan_interval);
	}
	river.initControlButtons();

	if (!debug) {
		$("#debug").hide();
		if (showmousepos)
			river.view.addControl(new OpenLayers.Control.MousePosition());
	}
	else {
		$("#debug").show();
		river.view.addControl(new OpenLayers.Control.MousePosition());
	}
				
    if (gps) {			
			river.getPoints();
			// enable gps log info
			river.positionTimer = window.setInterval('river.updatePosition()', 1000);			
			// init real map and hide it
			maps.detail.init(45.0,18.0);
			maps.track.init(rec_data.geom,rec_data.direction);
			maps.track.hide();
			$(".geoinfo").hide();
							
	} else { // nogps data info enabled	
		$(".geoinfo").hide();
	}
	$("#ol_map").hide();
}

river.getTrackList = function() {
	$("#track_list").hide();
	$("#track_list_data").load( "/view/tracklist");
}


/*
river.updatePositionViaLineString = function() {

	l_x =  Math.max(Math.round(river.view.getExtent().toArray()[0]),0);
	r_x =  Math.round(river.view.getExtent().toArray()[2]);
	
	jQuery.get("/view/get_tracksegment/"+ river.id + "/" + l_x + "/" + r_x + "/",
		function(data) {
			pos_lx = data[3].substring(data[3].indexOf("(")+1, data[3].indexOf(")")).split(" ");
			pos_rx = data[4].substring(data[4].indexOf("(")+1, data[4].indexOf(")")).split(" ");

			$("#date_left .date").html(data[1]);
			$("#date_right .date").html(data[2]);
			$("#log_left .lat").html(parseFloat(pos_lx[1]).toFixed(4));
			$("#log_left .lon").html(parseFloat(pos_lx[0]).toFixed(4));
			$("#log_right .lat").html(parseFloat(pos_rx[1]).toFixed(4));
			$("#log_right .lon").html(parseFloat(pos_rx[0]).toFixed(4));
			$("#log_center .dist").html((parseFloat(data[5])/1000.0).toFixed(2));

			if (maps.detail.map) {
				maps.detail.updateJSON(data[0]);
				maps.detail.updateHeading(data[6],parseFloat(pos_rx[1]),parseFloat(pos_rx[0]) );
			}
		});			
}
*/

/* old version for djangos json serializer 
river.updatePositionViaPointsOLD = function() {
	if (river.gps.buffer.points_data.length > 0) {
		l_x =  Math.max(Math.round(river.view.getExtent().toArray()[0]),0);
		r_x =  Math.round(river.view.getExtent().toArray()[2]);

		if (r_x > river.gps.buffer.max_px)
			river.getPoints();
		else if(l_x < river.gps.buffer.min_px)
			river.getPoints();

		if(river.gps.current.max_px == 0 || river.gps.current.max_px <= r_x) {	
			i = river.gps.current.max_id;	
			while ( river.gps.current.max_px < r_x && i < river.gps.buffer.points_data.length) {
				river.gps.current.max_px = river.gps.buffer.points_data[i].px;
				river.gps.current.max_id = i;
				i++;	
			}
		} else if (river.gps.current.max_px > r_x) {
			i = river.gps.current.max_id;	
			while ( river.gps.current.max_px > r_x && i > 0) {
				river.gps.current.max_px = river.gps.buffer.points_data[i].px;
				river.gps.current.max_id = i;
				i--;	
			}					
		}

		if(river.gps.current.min_px == 0 || river.gps.current.min_px <= l_x) {
			i = river.gps.current.min_id;
			while ( river.gps.current.min_px <= l_x ) {
				river.gps.current.min_px = river.gps.buffer.points_data[i].px;
				river.gps.current.min_id = i;
				i++;
			}
			
		} else if (river.gps.current.min_px > l_x) {
			i = river.gps.current.min_id;
			while ( river.gps.current.min_px > l_x && l_x != 0 && i > 0) {
				river.gps.current.min_px = river.gps.buffer.points_data[i].px;
				river.gps.current.min_id = i;
				i--;
			}	
		}

		mid = Math.floor((river.gps.current.max_id  - river.gps.current.min_id) / 2);
		pos_lx = OpenLayers.Geometry.fromWKT(river.gps.buffer.points[river.gps.current.min_id].toString()).toShortString().split(",");
		pos_rx = OpenLayers.Geometry.fromWKT(river.gps.buffer.points[river.gps.current.max_id-1].toString()).toShortString().split(",");
		pos_mid = OpenLayers.Geometry.fromWKT(river.gps.buffer.points[river.gps.current.min_id + mid].toString()).toShortString().split(",");

		$("#date_left .date").html(river.gps.buffer.points_data[river.gps.current.min_id].time);
		$("#date_right .date").html(river.gps.buffer.points_data[river.gps.current.max_id].time);
		$("#log_left .lat").html(parseFloat(pos_lx[1]).toFixed(4));
		$("#log_left .lon").html(parseFloat(pos_lx[0]).toFixed(4));
		$("#log_right .lat").html(parseFloat(pos_rx[1]).toFixed(4));
		$("#log_right .lon").html(parseFloat(pos_rx[0]).toFixed(4));

		river.gps.current.points = river.gps.buffer.points.slice(
			river.gps.current.min_id,
			river.gps.current.max_id
		);

		linestring = new OpenLayers.Geometry.LineString(river.gps.current.points.slice());
		if (linestring.getLength() > 0)
			dist = linestring.getGeodesicLength()/1000;
		
		$("#log_center .dist").html(dist.toFixed(2));

		if (maps.detail.map) {
			if (linestring.getLength() > 0) {
				maps.detail.updateLineString(linestring);
				maps.detail.updateHeading(
					river.gps.buffer.points_data[river.gps.current.max_id-1].heading,
					pos_rx[1],
					pos_rx[0]);
				}
		}
		
		if (maps.track.map) {
			lat = pos_mid[1];
			lon = pos_mid[0];
			maps.track.update(lat,lon);
		}
	}
}
*/

river.updatePositionViaPoints = function() {
	if (river.gps.buffer.points_data.length > 0) {
		l_x =  Math.max(Math.round(river.view.getExtent().toArray()[0]),0);
		r_x =  Math.round(river.view.getExtent().toArray()[2]);

		if (r_x > river.gps.buffer.max_px && r_x < river.length) {
			river.getPoints();
		}
		else if(l_x < river.gps.buffer.min_px && l_x > 0) {			
			river.getPoints();
		}

		if(river.gps.current.max_px == 0 || river.gps.current.max_px < r_x) {	
			i = river.gps.current.max_id;	
			while ( river.gps.current.max_px < r_x && i < river.gps.buffer.points_data.length) {
				river.gps.current.max_px = river.gps.buffer.points_data[i][0];
				river.gps.current.max_id = i;
				i++;	
			}
		} else if (river.gps.current.max_px > r_x) {
			i = river.gps.current.max_id;	
			while ( river.gps.current.max_px > r_x && i > 0) {
				river.gps.current.max_px = river.gps.buffer.points_data[i][0];
				river.gps.current.max_id = i;
				i--;	
			}					
		}

		if(river.gps.current.min_px == 0 || river.gps.current.min_px <= l_x) {
			i = river.gps.current.min_id;
			while ( river.gps.current.min_px <= l_x ) {
				river.gps.current.min_px = river.gps.buffer.points_data[i][0];
				river.gps.current.min_id = i;
				i++;
			}
			
		} else if (river.gps.current.min_px > l_x) {
			i = river.gps.current.min_id;
			while ( river.gps.current.min_px > l_x && l_x != 0 && i > 0) {
				river.gps.current.min_px = river.gps.buffer.points_data[i][0];
				river.gps.current.min_id = i;
				i--;
			}	
		}

		mid = Math.floor((river.gps.current.max_id  - river.gps.current.min_id) / 2);
		pos_lx = OpenLayers.Geometry.fromWKT(river.gps.buffer.points[river.gps.current.min_id].toString()).toShortString().split(",");
		pos_rx = OpenLayers.Geometry.fromWKT(river.gps.buffer.points[river.gps.current.max_id-1].toString()).toShortString().split(",");
		pos_mid = OpenLayers.Geometry.fromWKT(river.gps.buffer.points[river.gps.current.min_id + mid].toString()).toShortString().split(",");

		$("#date_left .date").html(river.gps.buffer.points_data[river.gps.current.min_id][2]);
		$("#date_right .date").html(river.gps.buffer.points_data[river.gps.current.max_id][2]);
		$("#log_left .lat").html(parseFloat(pos_lx[1]).toFixed(4));
		$("#log_left .lon").html(parseFloat(pos_lx[0]).toFixed(4));
		$("#log_right .lat").html(parseFloat(pos_rx[1]).toFixed(4));
		$("#log_right .lon").html(parseFloat(pos_rx[0]).toFixed(4));

		river.gps.current.points = river.gps.buffer.points.slice(
			river.gps.current.min_id,
			river.gps.current.max_id
		);

		linestring = new OpenLayers.Geometry.LineString(river.gps.current.points.slice());
		if (linestring.getLength() > 0)
			dist = linestring.getGeodesicLength()/1000;
		
		$("#log_center .dist").html(dist.toFixed(2));

		if (maps.detail.map) {
			if (linestring.getLength() > 0) {
				maps.detail.updateLineString(linestring);
				maps.detail.updateHeading(
					river.gps.buffer.points_data[river.gps.current.max_id-1][3],
					pos_rx[1],
					pos_rx[0]);
				}
		}
		
		if (maps.track.map) {
			lat = pos_mid[1];
			lon = pos_mid[0];
			maps.track.update(lat,lon);
		}
	}
}

river.updatePosition = function () {
	if (river.gps.buffer.points_data.length > 0 && $(".geoinfo").is(':visible') )
		river.updatePositionViaPoints();
}


river.getTileURL = function(bounds) {
    var res = this.map.getResolution();
    var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
    var y = Math.round((bounds.bottom - this.maxExtent.bottom) / (res * this.tileSize.h));
    var z = this.map.getZoom();
	if (x >= 0 && y >= 0) {
		return this.url + "tiles/" + z + "/" + x + "/" + y + "." + this.type;
	} else {
        //return "http://www.maptiler.org/img/none.png";
        return "/media/img/none.png";
	}
}

river.getemptyTileURL = function(bounds) {
	return "/media/img/none.png";
}

river.doPan = function() {				
	var x = Math.round(river.view.getCenter().lon);
	var r = Math.max(Math.round(river.view.getExtent().toArray()[2]),1);

	if ( x >= river.length - (getWindowWidth()/2 / river.view.getResolution()) ) {
		river.jumpTo(river.global_offset);
	} else
		river.view.pan(river.stepsize, 0);

	count = count + river.stepsize;
	if (count >= getWindowWidth()/2) {
		river.labels.layer.redraw();
		count = 0;
	}
}

river.jumpTo = function(x) {
	river.gps.buffer.points = new Array();
	river.gps.buffer.points_data = new Array();
	river.gps.buffer.min_px = 0;
	river.gps.buffer.max_px = 0;
	river.gps.buffer.min_id = 0;
	river.gps.buffer.max_id = 0;

	river.gps.current.points = new Array();
	river.gps.current.points_data = new Array();
	river.gps.current.min_px = 0;
	river.gps.current.max_px = 0;
	river.gps.current.min_id = 0;
	river.gps.current.max_id = 0;

	river.view.panTo( new OpenLayers.LonLat(x, -river.height/2) );
	river.labels.layer.redraw();
	$(".geoinfo").hide();
	river.getPoints();
}

river.initControlButtons = function ()
{
	// button actions
    if(gps) {
		$("#map_button").click(
		function(){
			if($("#ol_map").is(':visible')) {
				maps.detail.hide();
			} else {
				maps.track.hide();
				$("#track_list").hide();
				maps.detail.show();
			}
		});

		$("#show_track").click(function() {
			if($("#track_map").is(':visible') ) {
				maps.track.hide();
			} else {
				maps.track.show();
				$("#track_list").hide();
				maps.detail.hide();
				maps.track.map.zoomToExtent(maps.track.track.geometry.getBounds());
			}
		});
		$("#close_track").click(function() {
			maps.track.hide();
		});
		$("#track_map_close").click(function() {
			maps.track.hide();
		});		
			
		//$("#close_detail").click( function() {$("#ol_map").hide() });
		
	}

    $("#play").click(
		function() {
			if (river.autopanTimer) {
				window.clearInterval(river.autopanTimer);
				river.autopanTimer=0;
				river.autopan=0;
				if (gps) {
					window.clearInterval(river.positionTimer);
					river.positionTimer=0;
				}
				$("#play").removeClass("play");
				$("#play").addClass("paused");
			} else {
				river.autopan=1;
				river.autopanTimer = window.setInterval('river.doPan()', river.pan_interval);
				if (gps)
					river.positionTimer = window.setInterval('river.updatePosition()', maps.update_cyle);
				$("#play").removeClass("paused");
				$("#play").addClass("play");
			}
	});

	$("#forward").click(
		function(){
			window.clearInterval(river.autopanTimer);
			river.autopanTimer = 0;
			river.view.pan(river.ffstep,0);
			river.updatePosition();
			river.labels.layer.redraw();
			if (river.autopan)
				river.autopanTimer = window.setInterval('river.doPan()', river.pan_interval);
	});

	$("#back").click(
		function(){
			window.clearInterval(river.autopanTimer);
			river.autopanTimer = 0;
			river.view.pan(-river.ffstep,0);
			river.updatePosition();
			river.labels.layer.redraw();
			if (river.autopan)
				river.autopanTimer = window.setInterval('river.doPan()', river.pan_interval);
	});

	$("#faster").click(
		function(){
			river.stepsize *= 2;
	});
	$("#slower").click(
		function(){
			if (river.stepsize > 1) river.stepsize /= 2;
	});
	$("#zoomin").click(
		function(){			
			river.view.zoomIn();
			if (river.view.getExtent().toArray()[0] < 0) 
				jumpTo(river.offset);
			river.updatePosition();
			river.labels.layer.redraw();
			
	});
	$("#zoomout").click(
		function(){
			if (river.view.getResolution() < 16) {
				river.view.zoomOut();
				river.updatePosition();
				river.labels.layer.redraw();
			}
		}
	);


	$("#show_all").click(
		function(){
			if($("#track_list").is(':visible')) {
				$("#track_list").hide();
			} else {
				$("#track_list").show();
				maps.track.hide();
				maps.detail.hide();
			}
			
		}
	);

	$("#track_list_close").click(
		function(){
			$("#track_list").hide();
		}
	);		

	$("#log_left .alt").hide();
	$("#log_left .spd").hide();

	$("#river").click(
		function(){
			maps.track.hide();
			maps.detail.hide();
			$("#track_list").hide();
		}
	);
										
}

/*
river.getPointsOLDforDjangoSerialize = function() {
	if (!river.gps.pointupdateInProgress) {
		var l_x =  Math.max(Math.round(river.view.getExtent().toArray()[0]),0);
		var r_x =  Math.round(river.view.getExtent().toArray()[2]);

		var min_px = Math.max(l_x - river.gps.buffer.pxplus, river.gps.buffer.max_px);
		var max_px = Math.min(r_x + river.gps.buffer.pxplus, river.length);

		river.gps.pointupdateInProgress = true;
		status_msg("loading point data...", true);
		
		if ( l_x < river.gps.buffer.min_px) {
			// back
			
			min_px = Math.max(l_x - river.gps.buffer.pxplus,0);
			max_px = river.gps.buffer.min_px;
			
			jQuery.get("/view/get_trackpoints/" + river.id + "/" + min_px + "/" + max_px + "/",
				function(data) {
					var parser = new OpenLayers.Format.WKT()
					len = data.length;
					if (len > 0) {
						var points = [];
						var points_data = [];
						
						for (i=0;i<len;i++) {
							points.push(OpenLayers.Geometry.fromWKT(data[i].fields.geom));
							points_data.push(data[i].fields);					
						}
						new_len = points.length;
						
						river.gps.buffer.points = points.concat(river.gps.buffer.points);
						river.gps.buffer.points_data = points_data.concat(river.gps.buffer.points_data);

						len = river.gps.buffer.points_data.length - 1;
						river.gps.buffer.min_px = river.gps.buffer.points_data[0].px;
						river.gps.buffer.max_px = river.gps.buffer.points_data[len].px;
						river.gps.current.min_id = Math.max(river.gps.current.min_id - new_len, 0);
						river.gps.current.max_id = Math.max(river.gps.current.max_id - new_len, 0);
						
						status_msg("point data loaded");
					}
					else {
						river.hasgps = false;
						status_msg("no point data found");
					}
					river.gps.pointupdateInProgress = false;
							
			}).error(function() {
				river.gps.pointupdateInProgress = false;
				status_msg("point update failed");
			}); 
			
		} else if (river.gps.buffer.max_px < river.length) {
			
			jQuery.get("/view/get_trackpoints/" + river.id + "/" + min_px + "/" + max_px + "/",
				function(data) {
					var parser = new OpenLayers.Format.WKT()
					len = data.length;
					
					if (len > 0) {
						var points = [];
						var points_data = [];

						for (i=0;i<len;i++) {
							points.push(OpenLayers.Geometry.fromWKT(data[i].fields.geom));
							points_data.push(data[i].fields);					
						}
						
						river.gps.buffer.points = river.gps.buffer.points.concat(points);				
						river.gps.buffer.points_data = river.gps.buffer.points_data.concat(points_data);

						len = river.gps.buffer.points_data.length - 1;

						river.gps.buffer.min_px = river.gps.buffer.points_data[0].px;
						river.gps.buffer.max_px = river.gps.buffer.points_data[len].px;
						
						status_msg("point data loaded");
						$(".geoinfo").show();
					}
					else {
						river.hasgps = false;
						status_msg("no point data found");
					}
					river.gps.pointupdateInProgress = false;
			}).error(function() {
				river.gps.pointupdateInProgress = false;
				status_msg("point update failed");
			}); 
		}
	}
	return true;
}
*/

river.getPoints = function() {
	if (!river.gps.pointupdateInProgress) {
		var l_x =  Math.max(Math.round(river.view.getExtent().toArray()[0]),0);
		var r_x =  Math.round(river.view.getExtent().toArray()[2]);

		var min_px = Math.max(l_x - river.gps.buffer.pxplus, river.gps.buffer.min_px);
		var max_px = Math.min(r_x + river.gps.buffer.pxplus, river.length);
		log("min_px=" + min_px + " max_px=" + max_px + " l_x=" + l_x + " r_x=" + r_x);

		river.gps.pointupdateInProgress = true;
		status_msg("loading point data...", true);
		
		if ( l_x < river.gps.buffer.min_px && l_x > 0) {
			// back
			log("backward");
			min_px = Math.max(l_x - river.gps.buffer.pxplus,0);
			max_px = river.gps.buffer.min_px;
			
			jQuery.get("/view/get_trackpoints/" + river.id + "/" + min_px + "/" + max_px + "/",
				function(data) {
					var parser = new OpenLayers.Format.WKT()
					len = data.length;
					
					if (len > 0) {
						var points = [];
						var points_data = [];
						
						for (i=0;i<len;i++) {
							points.push(OpenLayers.Geometry.fromWKT(data[i][1]));
							points_data.push(data[i]);					
						}
						new_len = points.length;
						
						river.gps.buffer.points = points.concat(river.gps.buffer.points);
						river.gps.buffer.points_data = points_data.concat(river.gps.buffer.points_data);

						len = river.gps.buffer.points_data.length - 1;
						river.gps.buffer.min_px = river.gps.buffer.points_data[0][0];
						river.gps.buffer.max_px = river.gps.buffer.points_data[len][0];
						river.gps.current.min_id = Math.max(river.gps.current.min_id - new_len, 0);
						river.gps.current.max_id = Math.max(river.gps.current.max_id - new_len, 0);
						
						status_msg("point data loaded");
					}
					else {
						river.hasgps = false;
						status_msg("no point data found");
					}
					river.gps.pointupdateInProgress = false;
							
			}).error(function() {
				river.gps.pointupdateInProgress = false;
				status_msg("point update failed");
			}); 
			
		} else if (river.gps.buffer.max_px < river.length) {
			
			jQuery.get("/view/get_trackpoints/" + river.id + "/" + min_px + "/" + max_px + "/",
				function(data) {
					var parser = new OpenLayers.Format.WKT()
					len = data.length;
					if (len > 0) {
						var points = [];
						var points_data = [];

						for (i=0;i<len;i++) {
							points.push(OpenLayers.Geometry.fromWKT(data[i][1]));
							points_data.push(data[i]);					
						}
						
						river.gps.buffer.points = river.gps.buffer.points.concat(points);				
						river.gps.buffer.points_data = river.gps.buffer.points_data.concat(points_data);

						len = river.gps.buffer.points_data.length - 1;

						river.gps.buffer.min_px = river.gps.buffer.points_data[0][0];
						river.gps.buffer.max_px = river.gps.buffer.points_data[len][0];
						
						status_msg("point data loaded");						
						$(".geoinfo").show();
						river.updatePosition();
					}
					else {
						river.hasgps = false;
						status_msg("no point data found");
					}
					river.gps.pointupdateInProgress = false;
			}).error(function() {
				river.gps.pointupdateInProgress = false;
				status_msg("point update failed");
			}); 
		}
	}
	return true;
}

function getWindowHeight() {
    if (self.innerHeight) return self.innerHeight;
    if (document.documentElement && document.documentElement.clientHeight)
        return document.documentElement.clientHeight;
    if (document.body) return document.body.clientHeight;
        return 0;
}

function getWindowWidth() {
    if (self.innerWidth) return self.innerWidth;
    if (document.documentElement && document.documentElement.clientWidth)
        return document.documentElement.clientWidth;
    if (document.body) return document.body.clientWidth;
        return 0;
}

function resize() {  
    var river = document.getElementById("river");  
    river.style.height = (getWindowHeight()- 0) + "px";
    river.style.width = (getWindowWidth()- 0) + "px";
	if (river.updateSize) {
		river.updateSize();
	};
}

onresize=function(){
	resize();
};




