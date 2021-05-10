/// 
/// MAPS & GLOBAL VARIABLES
///

// Map
var map = L.map('map', {
    renderer: L.canvas({ tolerance: 10 }), // Set up tolerance for easier selection
    center: [52.01799,9.03725],
    zoom: 18,
    maxZoom: 18,
});

// Default projections to convert from/to
proj4.defs([
    [
      'EPSG:4326',
      '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'],
    [
      'EPSG:25832',
      '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    ]
]);

// Global Variables
var status = 'status'; // status of request
var progress = '0'; // progress of request
var geoJson = null; // geojson data
var bbox = null; // current bounding box
var grundBbox = null;
var gemeinde = null; // chosen gemeinde
var highlightLayer = L.Proj.geoJson(false, {
    onEachFeature: highlightStyle
}).addTo(map);
var highlightGrund = L.geoJSON(false, {
    onEachFeature: highlightStyle
}).addTo(map); // layer to show stroke on changed streets
var wegSelected = null; // variable to store active weg
var owsrootUrl = 'https://geoserver.livinglab-essigfabrik.online/geoserver/wfs';

// Function to style stroke layers
function highlightStyle(feature, layer) {
    layer.setStyle({
            weight: 7,
            color: '#ffffff',
            opacity: 0,
            clickable: false,
    });
}

// Geocoder
var osmGeocoder = new L.Control.Geocoder({
    collapsed: true,
    position: 'topleft',
    text: 'Suche',
    title: 'Suche'
}).addTo(map);

// Sidebar
var sidebar = L.control.sidebar('sidebar').addTo(map);

// Set up Base-Layers 
// Set up Luftbild Layer
var NRW_Luftbild_Map = L.tileLayer.wms("https://www.wms.nrw.de/geobasis/wms_nw_dop", {
    layers: 'nw_dop_rgb',
    format: 'image/png',
    version: '1.1.0',
    transparent: true,
    opacity: 0.5,
    attribution: "",
    tiled: true,
    maxZoom: 22,
    minZoom: 6,
}).addTo(map);
// Set up Amtliche Basiskarte Layer
var ABK_Layer = L.tileLayer.wms("https://www.wms.nrw.de/geobasis/wms_nw_dtk", {
    layers: 'wms_nw_dtk',
    format: 'image/png',
    //version: '1.1.0',
    transparent: true,
    opacity: 0.5,
    attribution: "",
    tiled: true,
    maxZoom: 22,
    minZoom: 6,
});
// Set up OSM tile layer 
var OSM_Layer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiYWJqYXJkaW0iLCJhIjoiY2tmZmpyM3d3MGZkdzJ1cXZ3a3kza3BybiJ9.2CgI2GbcJysBRHmh7WwdVA'
});

// Set up Info-Layers 
// Set up Feldblöcke Layer
var Feldbloecke = L.tileLayer.wms("https://geoserver.livinglab-essigfabrik.online/geoserver/WWA/ows?", {
    layers: 'WWA:feldbloecke',
    format: 'image/png',
    //version: '1.1.0',
    transparent: true,
    opacity: 0.5,
    attribution: "",
    tiled: true,
    maxZoom: 22,
    minZoom: 6,
});
// Set up Gesamtwegenetz Layer
var Gesamtwegenetz = L.tileLayer.wms("https://geoserver.livinglab-essigfabrik.online/geoserver/WWA/ows?", {
    layers: ['ver01_l','ver02_l'],
    format: 'image/png',
    //version: '1.1.0',
    transparent: true,
    opacity: 0.5,
    attribution: "",
    tiled: true,
    maxZoom: 22,
    minZoom: 6,
});

// Add gemeinde from file
var gemeindeLayer = L.Proj.geoJson().addTo(map);
var json = (function() {
    var json = null;
    $.ajax({
      'async': false,
      'global': false,
      'url': "data/gemeinde.geojson",
      'dataType': "json",
      'success': function(data) {
          json = data;
      }
    });
    gemeinde = json;
    gemeindeLayer.addData(json);
    // Style
    gemeindeLayer.eachLayer(function(feat) {
        feat.setStyle(
            {
                fillColor: 'white',
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0
            }
        )
    })
    // Zoom in
    map.fitBounds(gemeindeLayer.getBounds());
})();

// Set up BaseLayer-Groups
// Base Layers
var baseLayers = [
	{
		name: "Luftbild",
		layer: NRW_Luftbild_Map
	},
	{
		name: "Amtliche Basiskarte",
		layer: ABK_Layer
	},
	{
		name: "OpenStreetMap",
		layer: OSM_Layer
	},

];
// Info Layers
var infoDatenLayers = [
{
    group: "Info-Layer",
    layers: [
        {
            active: false,
            name: "Feldblöcke",
            icon: '<i class="icon icon-feldbloecke"></i>',
            layer: Feldbloecke
        },
        {
            active: false,
            name: "Gesamtwegenetz",
            icon: '<i class="icon icon-gesnetz"></i>',
            layer: Gesamtwegenetz
        },
        {
            active: true,
            name: "Gemeindegrenzen",
            icon: '<i class="icon icon-gemgrenz"></i>',
            layer: gemeindeLayer
        },
    ]
    
}
];

// Layer Controls
var panelControl = new L.Control.PanelLayers(baseLayers, infoDatenLayers, {
    collapsibleGroups: true,
    title: 'Legende',
});
map.addControl(panelControl);

// Scale
var scale = L.control.scale({position: "bottomright"}).addTo(map); 

// Loading Wheel
var loadingControl = L.Control.loading({
    spinjs: true
});
map.addControl(loadingControl);

// Info Layers
// Empty layers
var tourZieleLayers = null;
var markerLayers = null;
var markerKatLayers = null;
var lufZieleLayers = null;

// Ajax Functions
function ajaxTourZiele(response) {
		
	tourZieleLayers = L.geoJSON(response, {
		onEachFeature: showPopupTourZiele,
	}).addTo(map);
	
	panelControl.addOverlay({
			active: false,
			layer: tourZieleLayers,
			icon: '<i class="fa fa-camera" aria-hidden="true"></i>',
		},
		'Touristische Ziele',
        'Info-Layer'
	);
}

function ajaxMarker(response) {
	markerLayers = L.geoJSON(response, {
		onEachFeature: showPopupMarker,
	}).addTo(map);
	
	panelControl.addOverlay({
			active: false,
			layer: markerLayers,
			icon: '<i class="icon icon-marker"></i>',
		},
		'Vorschläge',
        'Info-Layer'
	);

}

function ajaxMarkerKat(response) {
	markerKatLayers = L.geoJSON(response, {
		onEachFeature: showPopupMarker,
	}).addTo(map);
	
	panelControl.addOverlay({
			layer: markerKatLayers,
			icon: '<i class="icon icon-marker"></i>',
            active: false,
		},
		'Vorschläge Kat',
        'Info-Layer'
	);
}

function ajaxLufZiele(response) {
		
	lufZieleLayers = L.geoJSON(response, {
		onEachFeature: showPopupLufZiele,
	}).addTo(map);
	
	panelControl.addOverlay({
			active: true,
			layer: lufZieleLayers,
			icon: '<i class="icon icon-farm"></i>',
			//collapsed: true
		},
		'land-/forstw. Gebäude',
        'Info-Layer'
	);
}

// Dictionaries
// Dictionary for tourist poi
var touristPOI = {
	TF_KircheSchlossBurg: 'Kirche, Schloss, Burg',
	TF_SonstigesBauwerk: 'Sonstiges Bauwerk',
	TF_ArchaeologischesBauwerk: 'Archaeologisches Bauwerk',
	TF_Natur: 'Natur',
	TF_Aussichtspunkt: 'Aussichtspunkt',
    "": " - ",
}

var touristArt = {
	3010: 'Kirche',
	3011: 'Kirchenruine', 
	3012: 'Ehemalige Kirche', 
	3015: 'Kapelle', 
	3017: 'Ehemalige Kapelle', 
	3020: 'Kloster', 
	3021: 'Klosterruine', 
	3022: 'Ehemaliges Kloster', 
	3025: 'Synagoge',  
	3040: 'Wegekreuz, Bildstock', 
	3050: 'Schloss', 
	3051: 'Schlossruine', 
	3053: 'Gut, Herrenhaus', 
	3060: 'Burg', 
	3061: 'Burgruine',  
	3063: 'Burghügel', 
	3131: 'Hügelgrab', 
	3132: 'Steingrab', 
	3210: 'Wassermühle', 
	3211: 'Windmühle', 
	3242: 'Aussichtsturm', 
	3255: 'Denkmal', 
	3279: 'Sonstige technische Sehenswürdigkeit', 
	3330: 'Naturdenkmal', 
    "": " - ",
}

// PopUp Functions
function showPopupTourZiele(feature, layer) {
	//layer.setIcon('<i class="fa fa-camera" aria-hidden="true"></i>');
	layer.setIcon(L.divIcon({className: 'fa fa-camera'}));

	var popupContent = '<table border="0" rules="groups"><thead><tr><th>Gml-ID: </th><th>' + (feature.properties['objid'] !== null ? autolinker.link(feature.properties['objid'].toLocaleString()) : '') + '</th></tr></thead><tr>\
		<tr>\
			<th scope="row">Name: </th>\
			<td>' + (feature.properties['nam'] !== null ? autolinker.link(feature.properties['nam'].toLocaleString()) : '') + '</td>\
		</tr>\
		<tr>\
			<th scope="row">Typ: </th>\
			<td>' + (feature.properties['objart_txt'] !== null ? autolinker.link(touristPOI[feature.properties['objart_txt'].toLocaleString()]) : '') + '</td>\
		</tr>'
	if (feature.properties['fkt']) {
			popupContent = popupContent + '<tr>\
				<th scope="row">Funktion: </th>\
				<td>' + (feature.properties['fkt'] !== null ? autolinker.link(touristArt[feature.properties['fkt'].toLocaleString()]) : '') + '</td>\
			</tr>';
		}
	popupContent = popupContent + '</table>';

    layer.bindPopup(popupContent, {maxHeight: 400});
}

function showPopupMarker(feature, layer) {

	var popupContent = '<table border="0" rules="groups"><thead><tr><th>Gemeinde: </th><th>' + (feature.properties['gemeinde'] !== null ? autolinker.link(feature.properties['gemeinde'].toLocaleString()) : '') + '</th></tr></thead><tr>\
		<tr>\
			<th scope="row">Datum: </th>\
			<td>' + (feature.properties['timestamp'] !== null ? autolinker.link(feature.properties['timestamp'].toLocaleString()) : '') + '</td>\
		</tr>\
		<tr>\
			<th scope="row">Beschreibung: </th>\
			<td>' + (feature.properties['beschreibung'] !== null ? autolinker.link(feature.properties['beschreibung'].toLocaleString()) : '') + '</td>\
		</tr>'
	popupContent = popupContent + '</table>';

    layer.bindPopup(popupContent, {maxHeight: 400});
}

function showPopupLufZiele(feature, layer) {
	layer.setIcon(L.divIcon({className: 'icon icon-farm'}));

	var popupContent = '<table border="0" rules="groups"><thead><tr><th>Gml-ID: </th><th>' + (feature.properties['oid'] !== null ? autolinker.link(feature.properties['oid'].toLocaleString()) : '') + '</th></tr></thead><tr>\
		<tr>\
			<th scope="row">Funktion: </th>\
			<td>' + (feature.properties['funktion'] !== null ? autolinker.link(feature.properties['funktion'].toLocaleString()) : '') + '</td>\
		</tr>\
		<tr>\
			<th scope="row">Gebäudenutzungsbezeichnung: </th>\
			<td>' + (feature.properties['gebnutzbez'] !== null ? autolinker.link(feature.properties['gebnutzbez'].toLocaleString()) : '') + '</td>\
		</tr>\
		</table>';

    layer.bindPopup(popupContent, {maxHeight: 400});
}

// Ajax Requests

var tourParameters = {
	service : 'WFS',
	version : '2.0',
	request : 'GetFeature',
	typeName : [('swd01_p'),('swd02_p'),('swd03_p')],
	//PropertyName: 'objid,fkt,nam,wdm,art,zus',
	outputFormat : 'text/javascript',
	format_options : 'callback:getJson',
	SrsName : 'EPSG:4326',
	//bbox: map.getBounds().toBBoxString()+',EPSG:4326'
	bbox: '8.6401953530565052,51.9211967806497228,9.1981613107454372,52.1944330584483041,EPSG:4326'
};

var tourParametersExt = L.Util.extend(tourParameters);
var tourURL = owsrootUrl + L.Util.getParamString(tourParametersExt);

var ajaxTour = $.ajax({
	url : tourURL,
	dataType : 'jsonp',
	jsonpCallback : 'getJson',
	success : ajaxTourZiele
});

var markerParameters = {
	service : 'WFS',
	version : '2.0',
	request : 'GetFeature',
	typeName : 'WWA:marker_crowd_sourcing',
	outputFormat : 'text/javascript',
	format_options : 'callback:getJson',
	SrsName : 'EPSG:4326',
	//bbox: map.getBounds().toBBoxString()+',EPSG:4326'
	bbox: '8.6401953530565052,51.9211967806497228,9.1981613107454372,52.1944330584483041,EPSG:4326'
};

var markerParametersExt = L.Util.extend(markerParameters);
var markerURL = owsrootUrl + L.Util.getParamString(markerParametersExt);

var ajaxMarkers = $.ajax({
	url : markerURL,
	dataType : 'jsonp',
	jsonpCallback : 'getJson',
	success : ajaxMarker
});

var lufParameters = {
	service : 'WFS',
	version : '2.0',
	request : 'GetFeature',
	typeName : 'WWA:luf_gebaeude',
	//PropertyName: 'objid,fkt,nam,wdm,art,zus',
	outputFormat : 'text/javascript',
	//format_options : 'callback:getJson',
	SrsName : 'EPSG:4326',
	//bbox: map.getBounds().toBBoxString()+',EPSG:4326'
	bbox: '8.6401953530565052,51.9211967806497228,9.1981613107454372,52.1944330584483041,EPSG:4326',
	// CQL_FILTER: "funktion='Land- und forstwirtschaftliches Betriebsgebäude' or funktion='land- und forstwirtschaftliches Wohn- und Betriebsgebäude' and BBOX(geom,8.6401953530565052,51.9211967806497228,9.1981613107454372,52.1944330584483041) and geom=centroid(geom)",
	
	// "funktion" = 'Forsthaus' OR "funktion" = 'Gebäude für Land- und Forstwirtschaft' OR "funktion" = 'Land- und forstwirtschaftliches Betriebsgebäude' OR "funktion" = 'Scheune' OR "funktion" = 'Scheune und Stall'
};

var lufParametersExt = L.Util.extend(lufParameters);
var lufURL = owsrootUrl + L.Util.getParamString(lufParametersExt);

var request = new XMLHttpRequest();
request.open('GET', lufURL, true);

var req = new XMLHttpRequest();
req.overrideMimeType("application/json");
req.open('GET', lufURL, true);
req.onload  = function() {
    var response = req.responseText;
    var data = response.substring(14, response.length-1);
    var jsonResponse = JSON.parse(data);
    ajaxLufZiele(jsonResponse);
    // do something with jsonResponse
};
req.send(null);

// When a gemeinde is chosen
function chooseGemeinde(e) {
    //selektion.features = [];
    gemeindeLayer.eachLayer(function(feat) {
        if (feat.feature.properties.name == e.value) {
            var bounds = feat.getBounds();
            // Calculate bounding box 
            getBbox(bounds);
            map.fitBounds(bounds);
        } 
    })
}

// Markers Kat
function addKatMarkers() {
    var markerParameters = {
        service : 'WFS',
        version : '2.0',
        request : 'GetFeature',
        typeName : 'WWA:marker_crowd_sourcing_kat',
        outputFormat : 'text/javascript',
        format_options : 'callback:getJson',
        SrsName : 'EPSG:4326',
        //bbox: map.getBounds().toBBoxString()+',EPSG:4326'
        bbox: '8.6401953530565052,51.9211967806497228,9.1981613107454372,52.1944330584483041,EPSG:4326'
    };
    
    var markerParametersExt = L.Util.extend(markerParameters);
    var markerURL = owsrootUrl + L.Util.getParamString(markerParametersExt);
    
    var ajax = $.ajax({
        async: false,
        url : markerURL,
        dataType : 'jsonp',
        jsonpCallback : 'getJson',
        success : ajaxMarkerKat
    });
}

// Load test data categorized
$('#test').click(function() {
    // Remove grund layers
    for (layer of grundWege) {
        map.removeLayer(layer);
        panelControl.removeLayer(layer);
    }
    // Remove markers grund
    map.removeLayer(markerLayers);
    panelControl.removeLayer(markerLayers);
    // Remove highlight grundlayer
    map.removeLayer(highlightGrund);
    // Add layers from file
    var json = (function() {
        var json = null;
        $.ajax({
        'async': false,
        'global': false,
        'url': "data/ergebnis-test3.geojson",
        'dataType': "json",
        'success': function(data) {
            json = data;
        }
        });
        geoJson = json;
        var layer = 'wege';
        addGeojson(layer);
    })();
})

/// 
/// LAYERS INFORMATION
///

// Categorized Wege Layers
var wegeKategorien = [
    {
        group: "Kernwegenetz",
        layers: [
            {
                name: 'Kategorie A',
                property: 'WEGKAT',
                value: 'a',
                icon: '<i class="icon icon-a"></i>'
            },
            {
                name: 'Kategorie B',
                property: 'WEGKAT',
                value: 'b',
                icon: '<i class="icon icon-b"></i>'
            },
            {
                name: 'Kategorie C',
                property: 'WEGKAT',
                value: 'c',
                icon: '<i class="icon icon-c"></i>'
            },
            {
                name: 'Kategorie D',
                property: 'WEGKAT',
                value: 'd',
                icon: '<i class="icon icon-d"></i>'
            },
            {
                name: 'Kategorie I',
                property: 'WEGKAT',
                value: 'i',
                icon: '<i class="icon icon-i"></i>'
            },
        ] 
    },
    {
        group: "untergeordnetes Wegenetz",
        layers: [
            {
                name: 'Kategorie E',
                property: 'WEGKAT',
                value: 'e',
                icon: '<i class="icon icon-e"></i>'
            },
            {
                name: 'Kategorie F',
                property: 'WEGKAT',
                value: 'f',
                icon: '<i class="icon icon-f"></i>'
            },
            {
                name: 'Kategorie G',
                property: 'WEGKAT',
                value: 'g',
                icon: '<i class="icon icon-g"></i>'
            },
            {
                name: 'Kategorie H',
                property: 'WEGKAT',
                value: 'h',
                icon: '<i class="icon icon-h"></i>'
            },
        ]
    }
];
var wegeLayers = {};
var katWege = [];

// Grund Wege Layers
var grundKategorien = [
	{
		name: 'Klassifizierte Straße',
		property: 'wdm',
		value: ['1301','1303','1305','1306','1307'],
		icon: '<i class="icon icon-classified"></i>'
	},
	{
		name: 'Kein Attribut',
		property: 'wdm',
		value: ['9997'],
		icon: '<i class="icon icon-none"></i>'
	},
	{
		name: 'Hauptwirtschaftsweg',
		property: 'fkt',
		value: ['5211'],
		icon: '<i class="icon icon-hww"></i>'
	},
	{
		name: 'Wirtschaftsweg',
		property: 'fkt',
		value: ['5212'],
		icon: '<i class="icon icon-ww"></i>'
	},
	{
		name: 'Reitweg',
		property: 'art',
		value: ['1107'],
		icon: '<i class="icon icon-none"></i>'
	},
	{
		name: 'Fußweg',
		property: 'art',
		value: ['1103'],
		icon: '<i class="icon icon-fussw"></i>'
	},
	{
		name: 'Radweg',
		property: 'art',
		value: ['1106'],
		icon: '<i class="icon icon-none"></i>'
	},
	{
		name: 'Fuß- und Radweg',
		property: 'wdm',
		value: ['1110'],
        icon: '<i class="icon icon-rufw"></i>'
	}
];
var grundLayers = {};
var grundWege = [];

// Function to create separate layers
function createLayers(layer) {
    if (layer == 'wege') {
        for (group of wegeKategorien) {
            for (kat of group['layers']) {
                wegeLayers[kat] = L.Proj.geoJson(geoJson, {
                    filter: function(feature, layer) {
                        return feature.properties[kat['property']] == kat['value'];
                    },
                    onEachFeature: showPopupEdit,
                    style: {
                        color: wegeStyles[kat['value']],
                        weight: 2,
                        opacity: 1,
                    }
                }).addTo(map);
                wegeLayers[kat].eachLayer(function(feature) {
                    // Copy WEGKAT to ZWEGKAT
                    feature['feature']['properties']['ZWEGKAT'] = feature['feature']['properties']['WEGKAT'];
                    // Add attributes for change
                    var attribute = ['ZWEGKAT', 'WEGKAT'];
                    for (var i in attribute) {
                        var att = attribute[i];
                        if (att in feature.feature.properties) {
                            feature['feature']['properties'][att+'-ist'] = feature['feature']['properties'][att]; 
                        } else {
                            feature['feature']['properties'][att] = null;
                            feature['feature']['properties'][att+'-ist'] = null;
                        }
                    }
                    feature['feature']['properties']['grundLayer'] = false;
                    var zus = feature['feature']['properties']['zus'];
                    if (zus != null) {
                        feature.setStyle({
                            dashArray: '10'
                        });
                    } else {
                        feature.setStyle({
                            dashArray: null
                        });
                    }
                });
                panelControl.addOverlay({
                    active: true,
                    layer: wegeLayers[kat],
                    icon: kat['icon']
                },
                kat['name'],
                group['group']
                );
                katWege.push(wegeLayers[kat]);
            }
        }
    } else {
        highlightGrund.addData(geoJson);
        for (kat of grundKategorien) {
            grundLayers[kat] = L.geoJSON(geoJson, {
                filter: function(feature, layer) {
                    return kat['value'].includes(feature.properties[kat['property']]);
                },
                onEachFeature: showPopupGrund,
                style: {
                    color: grundStyles[kat['name']],
                    weight: 2,
                    opacity: 1,
                }
            }).addTo(map);
            grundLayers[kat].eachLayer(function(feature) {
                // Add attributes for change
                var attribute = ['wdm', 'fkt', 'art', 'zus'];
                for (var i in attribute) {
                    var att = attribute[i];
                    if (att in feature.feature.properties) {
                        feature['feature']['properties'][att+'-ist'] = feature['feature']['properties'][att]; 
                    } else {
                        feature['feature']['properties'][att] = null;
                        feature['feature']['properties'][att+'-ist'] = null;
                    }
                }
                feature['feature']['properties']['grundLayer'] = true;
                var zus = feature['feature']['properties']['zus'];
                if (zus != null) {
                    feature.setStyle({
                        dashArray: '10'
                    });
                } else {
                    feature.setStyle({
                        dashArray: null
                    });
                }
            });
            panelControl.addOverlay({
                active: true,
                layer: grundLayers[kat],
                icon: kat['icon']
            },
            kat['name'],
            'Wegenetz'
            );
            grundWege.push(grundLayers[kat]);
        }
    }
}

/// 
/// LOAD GRUND DATEN
///

// TRIGGER
// Load grund daten
$('#test-grund').click(function() {

    var defaultParameters = {
        service : 'WFS',
        version : '2.0',
        request : 'GetFeature',
        typeName : [('ver01_l'),('ver02_l')],
        outputFormat : 'text/javascript',
        format_options : 'callback:getJson',
        SrsName : 'EPSG:4326',
        bbox: grundBbox,
    };

    var parameters = L.Util.extend(defaultParameters);
    var URL = owsrootUrl + L.Util.getParamString(parameters);

    var ajax = $.ajax({
        url : URL,
        dataType : 'jsonp',
        jsonpCallback : 'getJson',
        success : function (response) {
            var layer = 'grund';
            geoJson = response;
            createLayers(layer);
        }
    });

    // Activate Categorize/Edit Panel
    sidebar.close();
    document.getElementById("start-tab").className = "disabled";
    document.getElementById("grund-tab").className = "";
    document.getElementById("request-tab").className = "";

})

// FUNCTIONS
// Function to calculate bounding box
function getBbox(bounds) {

    grundBbox = bounds.toBBoxString()+',EPSG:4326';

    /// Calculate map bounding box ///
    var swLng = bounds.getSouthWest().lng;
    var swLat = bounds.getSouthWest().lat;
    var neLng = bounds.getNorthEast().lng;
    var neLat = bounds.getNorthEast().lat;
    // Reproject it
    var swCorner = {x: swLng, y: swLat};
    var neCorner = {x: neLng, y: neLat};
    var swCornerProj = proj4('EPSG:25832', swCorner);
    var neCornerProj = proj4('EPSG:25832', neCorner);
    // Round to 1 decimal place
    var swLngProj = swCornerProj.x.toFixed(1);
    var swLatProj = swCornerProj.y.toFixed(1);
    var neLngProj = neCornerProj.x.toFixed(1);
    var neLatProj = neCornerProj.y.toFixed(1);
    // Final bbox (write it on global variable)
    bbox = swLngProj + ',' + swLatProj + ',' + neLngProj + ',' + neLatProj;
}

// Download geojson to machine
$('#download').click(function() {
    // Save layer as geojson
    json = {
		"type": "FeatureCollection",
		"name": "name",
		"crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::25832" } },
		"features": []
	}
    // Iterate through layers and export to geojson
    for (layer of katWege) {
        layer.eachLayer(function(feature) {
            feature['feature']['properties']['grundLayer'] = false;
        })
        features = layer.toGeoJSON().features;
        json.features = json.features.concat(features);
    }
    // Reproject
    reprojGeojson(json);
    var file = 'wegenetz.geojson';
    saveAs(new File([JSON.stringify(json)], file, {
        type: "text/plain;charset=utf-8"
    }), file);
})

/// 
/// REQUEST TO CATEGORIZE 
///

// VARIABLES
// WPS Url
var requestUrl = 'https://wps.livinglab-essigfabrik.online/wps?service=WPS&amp;version=1.0.0&amp;request=Execute';
// Layer Styles
var wegeStyles = {'a': '#d8000a', 'b': '#03bebe', 'c': '#ffb41d', 'd': '#447f32', 'e': '#153dcf', 'f': '#f343eb', 'g': '#70e034', 'h': '#e6ff01', 'i': '#868C30'};
var grundStyles = {
    'Klassifizierte Straße': '#007ea7',
    'Kein Attribut': '#a7ffe4',
    'Hauptwirtschaftsweg': '#80ced7',
    'Wirtschaftsweg': '#e6e6cb',
    'Fußweg': '#f5e4d7',
    'Reitweg': '#8b9ad7',
    'Rad- und Fußweg': '#e4e4e4',
    'Radweg': '#d7cbe6'
}

// TRIGGER
// When button is clicked, categorize streets
$('#recalculate').click(function() {
    map.fireEvent('dataloading');
    // Save layer as geojson
    json = {
		"type": "FeatureCollection",
		"name": "name",
		"crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::25832" } },
		"features": []
	}
    // Iterate through layers and export to geojson
    for (layer of grundWege) {
        layer.eachLayer(function(feature) {
            feature['feature']['properties']['grundLayer'] = false;
        })
        features = layer.toGeoJSON().features;
        json.features = json.features.concat(features);
        map.removeLayer(layer);
        panelControl.removeLayer(layer);
    }
    // Reproject
    reprojGeojson(json);
    // Stringify
    var featuresString = JSON.stringify(json);
    // Request file for re-categorization
    var requestFile = "src/request4_store_edited.xml";
    // Layer to add response to
    var layer = "wege";
    // Remove markers grund
    map.removeLayer(markerLayers);
    panelControl.removeLayer(markerLayers);
    // Remove highlight grundlayer
    map.removeLayer(highlightGrund);
    // Make request
    completeRequest(requestFile, featuresString, layer);
});

// FUNCTIONS
// Function to reproject geojson
function reprojGeojson(Geojson) {
    // Projection Source and Destination
    var source = new proj4.Proj('EPSG:4326');
    var dest = new proj4.Proj('EPSG:25832');
    features = Geojson.features;
    for (var i = 0; i < features.length; i++) {
        var coords = Geojson.features[i].geometry.coordinates;
        for (var j = 0; j < coords.length; j++) {
          var coordList = Geojson.features[i].geometry.coordinates[j];
          if (Array.isArray(coordList[0])) {
            for (var k = 0; k < coordList.length; k++) {
              var coordPair = Geojson.features[i].geometry.coordinates[j][k];
              // Create point
              var pt = {x: Number(coordPair[0].toFixed(6)), y: Number(coordPair[1].toFixed(6))};
              var ptRproj = proj4(source, dest, pt);
              var coordRproj = [ptRproj.x, ptRproj.y];
              // Replace original coordinate in the geojson
              Geojson.features[i].geometry.coordinates[j][k] = coordRproj;
            };
          } else {
            var coordPair = Geojson.features[i].geometry.coordinates[j];
            // Create point
            var pt = {x: Number(coordPair[0].toFixed(6)), y: Number(coordPair[1].toFixed(6))};
            var ptRproj = proj4(source, dest, pt);
            var coordRproj = [ptRproj.x, ptRproj.y];
            // Replace original coordinate in the geojson
            Geojson.features[i].geometry.coordinates[j] = coordRproj;
          }
        }
    }
};

// Function to make whole Request
function completeRequest(requestFile, features, layer) {
    // Variable to save when request started
    // to calculate how long it took later
    var t0 = performance.now()
    
    // First clear global variables, in case an old request was made
    status = 'status';
    geoJson = null;
    // Read Request File
    var requestHttp = new JKL.ParseXML.Text(requestFile);
    var requestData = requestHttp.parse();
    // Replace bounding boxes
    var sendRequest = requestData.replace(/502584.3,5757482.8,513527.9,5766634.9/g, bbox);
    // If we are sending features, add them too
    if (features) {
        console.log('sending features');
        sendRequest = sendRequest.replace(/hier die editierten Ergebnisdaten im JSON-Format/g, features);
    } else {
        console.log('getting features');
    }
    
    // Make Request
    var ajax = $.ajax({
        type: 'POST',
        url: requestUrl,
        data: sendRequest,
        dataType: 'text',
        //async: false,
        success: function (response) {
            // Get status url from the response
            var statusUrl = response.split('statusLocation="').pop().split('"')[0];
            console.log(statusUrl);
            // Check status every X seconds, until it is succeeded
            while (!status.includes("ProcessSucceeded")) {
                if (status.includes("ProcessFailed")) {
                    console.log("Process failed");
                    break;
                } else {
                    var percentage = status.split('percentCompleted="').pop().split('"')[0];
                    if ((percentage != progress) && (percentage != 'status') && (percentage != '')) {
                        progress = percentage;
                        console.log(progress);
                    }
                    setTimeout(getStatus(statusUrl), 10000);
                }
            }
            // When succeeded, check if features are in the response or in a link
            if (status.includes('href=')) {
                // If link, get Url
                var geojsonUrl = status.split('href="').pop().split('"')[0];
                // Request features and add to layer
                getGeojson(geojsonUrl);
                addGeojson(layer);
            } else {
                // If they're in response, parse and add to layer
                var statusFeatures = status.split('<![CDATA[').pop().split(']]>')[0];
                geoJson = JSON.parse(statusFeatures);
                addGeojson(layer);
            }
            // Log how long the request took
            var t1 = performance.now();
            console.log("Call to load roads took " + ((t1 - t0)/1000) + " seconds.");
        },
        // If error, show on console
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
        }
    });
}

// Function to ask for process status
function getStatus(url) {
    var answer = null;
    $.ajax({
      'async': false,
      'global': false,
      'url': url,
      'dataType': "text",
      'success': function(response) {
          answer = response;
      }
    });
    // Write status on global variable
    status = answer;
};

// Function to ask for result (geojson features) of the process
function getGeojson(url) {
    var answer = null;
    $.ajax({
      'async': false,
      'global': false,
      'url': url,
      'dataType': "json",
      'success': function(response) {
          answer = response;
      }
    });
    // Write geojson on global variable
    geoJson = answer;
};

// Function to add result features into map
function addGeojson(layer) {
    // Clear highlight layer
    highlightLayer.clearLayers();
    // Add features to highlight layer
    highlightLayer.addData(geoJson);
    // Add highlight layer to legende
    /*
    panelControl.addOverlay({
        active: true,
        layer: highlightLayer,
        icon: '<i class="icon icon-gesnetz"></i>',
        },
        'Änderungen');
    */
    // Clear layer
    createLayers(layer);
    map.fitBounds(highlightLayer.getBounds());
    // Add markers kat
    addKatMarkers();
    map.fireEvent('dataload');
    // Disable Edit-grund & enable Edit-Kat
    sidebar.close();
    document.getElementById("grund-tab").className = "disabled";
    document.getElementById("request-tab").className = "disabled";
    document.getElementById("kat-tab").className = "";
    document.getElementById("compare-tab").className = "";
    document.getElementById("download-tab").className = "";

}

/// 
/// ATTRIBUTE TABELLE
///

// VARIABLES
// Dictionary of WDM Values
var wdmValues = {
    "": " - ",
    "1301": "Bundesautobahn",
    "1303": "Bundesstraße",
    "1305": "Landesstraße, Staatstraße",
    "1306": "Kreisstraße",
    "1307": "Gemeindestraße",
    "9997": "Attribut trifft nicht zu",
    "9999": "Sonstiges",
}
// Dictionary of ZUS Values
var zusValues = {
    "": " - ",
    "2100": "Außer Betrieb, stillgelegt, verlassen",
    "4000": "Im Bau"
}
// Dictionary of HANDL Values
var HANDLValues = {
    "": " - ",
    "a": "Erhaltung wie Bestand (normale Unterhaltung)",
    "b": "den Unterbau einschließende Sanierung (gleiche Kategorie)",
    "c": "Umbau / andere Bauweise (veränderte Kategorie)",
    "d": "Rückbau / Aufhebung",
    "e": "Neubau (neue Trasse)"
}
// Dictionary of ART Values
var artValues = {
    "": " - ",
    "1103": "Fußweg",
    "1106": "Radweg",
    "1107": "Reitweg",
    "1110": "Rad- und Fußweg"
}
// Dictionary of PRIO Values
var PRIOValues = {
    "": " - ",
    "Kurzfristig": "Kurzfristig",
    "Mittelfristig": "Mittelfristig",
    "Langfristig": "Langfristig"
}
// Dictionary of ZUHPFL Values
var ZUHPFLValues = {
    "": " - ",
    "Gemeinde": "Gemeinde",
    "Kreis": "Kreis",
    "Land": "Land",
    "Bundesrepublik Deutschland": "Bundesrepublik Deutschland",
    "Natürliche Personen des Privatrechts": "Natürliche Personen des Privatrechts",
    "Juristichen Personen des Privatrechts": "Juristichen Personen des Privatrechts",
    "Sonstige": "Sonstige"
}
// Dictionary of ZWEGKAT Values
var ZWEGKATValues = {
    "": " - ",
    "a": 'A_klassifiziert',
    "b": "B_multifunktionaler Verbindungsweg",
    "c": "C_Hauptwirtschaftsweg",
    "d": "D_untergeordneter Wirtschaftsweg mit Fußgängerverkehr",
    "e": "E_untergeordneter Erschließungsweg mit luf Verkehr",
    "f": "F_Einzelerschließung kaum luf Verkehr",
    "g": "G_Binnenerschließung, entbehrlich für das Wegenetz",
    "h": "H_keine Funktion",
    "i": "I_Rad-, Reit-, Fußweg"
}
// Dictionary of WEGKAT Values
var WEGKATValues = {
    "": " - ",
    "a": 'A_klassifiziert',
    "b": "B_multifunktionaler Verbindungsweg",
    "c": "C_Hauptwirtschaftsweg",
    "d": "D_untergeordneter Wirtschaftsweg mit Fußgängerverkehr",
    "e": "E_untergeordneter Erschließungsweg mit luf Verkehr",
    "f": "F_Einzelerschließung kaum luf Verkehr",
    "g": "G_Binnenerschließung, entbehrlich für das Wegenetz",
    "h": "H_keine Funktion",
    "i": "I_Rad-, Reit-, Fußweg"
}
// Dictionary of fkt Values
var fktValues = {
    "": " - ",
    "5211": "Hauptwirtschaftsweg",
    "5212": "Wirtschaftsweg"
}
// Dictionary of Bauart Values
var BAUARTValues = {
    "": " - ",
    "a": 'befestigt',
    "b": "teilbefestigt",
    "c": "wassergebunden",
    "d": "ohne Befestigung",
    "e": "Kreuzungsbauwerk"
}
// Dictionary of Bauzustand Values
var BAUZUSValues = {
    "": " - ",
    "a": 'in Ordnung',
    "b": "Einzelmaßnahmen erforderlich",
    "c": "Gesamtsanierung erforderlich"
}
// Dictionary of Tragfähigkeit Values
var TRAGFValues = {
    "": " - ",
    "a": 'hoch',
    "b": "mittel",
    "c": "gering"
}
// Dictionary of Unterhaltungspflicht Values
var UHPFLValues = {
    "": " - ",
    "Gemeinde": "Gemeinde",
    "Kreis": "Kreis",
    "Land": "Land",
    "Bundesrepublik Deutschland": "Bundesrepublik Deutschland",
    "Natürliche Personen des Privatrechts": "Natürliche Personen des Privatrechts",
    "Juristichen Personen des Privatrechts": "Juristichen Personen des Privatrechts",
    "Sonstige": "Sonstige",
    "OFFEN": "ungeklärt"
}
// Dictionary of Nutzungshäufigkeit Landwirtschaft Values
var FKT_LWValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Nutzungshäufigkeit Forstwirtschaft Values
var FKT_FWValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Nutzungshäufigkeit Touristmus, Erholung, Freizeit Values
var FKT_TFEValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Nutzungshäufigkeit Wandernutzung
var FKT_WAValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Nutzungshäufigkeit Reiter
var FKT_REValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Nutzungshäufigkeit Radfahrer
var FKT_RAValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Nutzungshäufigkeit Darseinsvorsorge und Mobilität
var FKT_DMValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Nutzungshäufigkeit siedlungsstrukturelle Entwicklungen
var FKT_SEValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Nutzungshäufigkeit Produktion erneuerbarer Energien
var FKT_PEEValues = {
    "": " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}
// Dictionary of Funktion ökologische Wertigkeit Wege, Verkersflächen
var FKT_OEWWValues = {
    "": " - ",
    "0": "nicht vorhanden",
    "1": "vorhanden",
    "2": "stark ausgeprägt"
}
// Dictionary of Funktion ökologische Wertigkeit Säume
var FKT_OEWSValues = {
    "": " - ",
    "0": "nicht vorhanden",
    "1": "vorhanden",
    "2": "stark ausgeprägt"
}

// FUNCTIONS
// Function to show Popup in the categorized data
var autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});

function updatePopupKat(feature) {
    var popupContentKat = '<table border="0" rules="groups"><thead><tr><th>Wegenummer: </th><th>' + (feature.properties['sts'] !== null ? autolinker.link(feature.properties['sts'].toLocaleString()) : '') + '</th></tr></thead><tr>\
        <tr>\
            <th scope="row">Straßenname: </th>\
            <td>' + (feature.properties['nam'] !== null ? autolinker.link(feature.properties['nam'].toLocaleString()) : '') + '</td>\
        </tr>\
        <tr>\
            <th scope="row">Wegekategorie: </th>\
            <td>' + (feature.properties['WEGKAT'] !== null ? autolinker.link(feature.properties['WEGKAT'].toLocaleString()) : '') + '</td>\
        </tr>\
        <tr>\
            <th scope="row">Zukünftige Wegekat.: </th>\
            <td>' + (feature.properties['ZWEGKAT'] !== null ? autolinker.link(feature.properties['ZWEGKAT'].toLocaleString()) : '') + '</td>\
        </tr>\
        <tr>\
            <th scope="row">Abschnittslänge (m): </th>\
            <td>' + (feature.properties['LAENGE'] !== null ? autolinker.link(feature.properties['LAENGE'].toLocaleString()) : '') + '</td>\
        </tr>\
        <tr>\
            <th scope="row">Handlungsempfehlung: </th>\
            <td>' + (feature.properties['HANDL'] !== null ? autolinker.link(HANDLValues[feature.properties['HANDL']].toLocaleString()) : '') + '</td>\
        </tr>\
    </table>\
    <br>\
    <button class="btn btn-outline-primary btn-sm" id="edit-attribute" onclick="editAttribute()">Editieren</button>';
    return popupContentKat;
}

function showPopupEdit(feature, layer) {

    layer.bindPopup(updatePopupKat(feature), {maxHeight: 400});

    layer.on({
        click: function() {

            wegSelected = layer;
            var sidebarStatus = document.getElementById("sidebar").className;
            if (sidebarStatus == 'sidebar sidebar-left leaflet-touch') {
                editAttribute();
            }
            layer._popup.setContent(updatePopupKat(feature));
        }
    });

}

// Function to show Popup in the grund data
function showPopupGrund(feature, layer) {
    layer.on({
        click: function() {
            wegSelected = layer;
            var sidebarStatus = document.getElementById("sidebar").className;
            if (sidebarStatus == 'sidebar sidebar-left leaflet-touch') {
                editGrundAttribute();
            }
        }
    });
    var popupContent = '<table border="0" rules="groups"><thead><tr><th>Wegenummer: </th><th>' + (feature.properties['sts'] !== null ? autolinker.link(feature.properties['sts'].toLocaleString()) : '') + '</th></tr></thead><tr>\
            <tr>\
                <th scope="row">Straßenname: </th>\
                <td>' + (feature.properties['nam'] !== null ? autolinker.link(feature.properties['nam'].toLocaleString()) : '') + '</td>\
            </tr>\
        </table>\
        <br>\
        <button class="btn btn-outline-primary btn-sm" id="edit-attribute" onclick="editGrundAttribute()">Editieren</button>';
    layer.bindPopup(popupContent, {maxHeight: 400});
}

// Block other dropdowns when one is changed (for wdm, fkt and art)
function blockOthers(e) {
    var wdm = document.getElementById("wdm");
    var art = document.getElementById("art");
    var fkt = document.getElementById("fkt");
    var changed = e.id;
    var value = e.value;
    
    if ((changed == "wdm") && (value != "")) {
        art.value = "";
        fkt.value = "";
    } else if ((changed == "art") && (value != "")) {
        wdm.value = "";
        fkt.value = "";
    } else if ((changed == "fkt") && (value != "")) {
        wdm.value = "";
        art.value = "";
    }
}

// Function to show attributes in the table when a Weg is clicked
function editAttribute () {
    var feature = wegSelected;
    console.log(feature);
    if (feature['feature']['properties']['grundLayer']) {
        sidebar.open("edit-grund");
    } else {
        sidebar.open("edit-soll");
    }
    // Then fill attribute table
    // Select all table tags
    var entries = document.querySelectorAll("td");
    // Loop
    for (var i in entries) {
        var row = entries[i];
        // If row has an id
        if ((row.id != "") && (row.id != undefined)) {
            if (row.id != "LAENGE") {
                var value = feature['feature']['properties'][row.id];
                if (value == null) {
                    value = "";
                } 
                var values = null;
                var id = row.id;
                id = id.split("-")[0];
                values = id + "Values";
                row.innerHTML = window[values][value];
                var select = document.getElementById(id);
                var valueKorrigiert = feature['feature']['properties'][id];
                if (valueKorrigiert == null) {
                    valueKorrigiert = "";
                }
                select.value = valueKorrigiert;
                // If it's length, round it
            } else if (row.id == "LAENGE") {
                var laenge = feature['feature']['properties'][row.id];
                var rounded = laenge.toFixed(2);
                row.innerHTML = rounded;
            }
        }
    }
    // Select all select tags
    var selectLst = document.querySelectorAll("select");
    for (var i in selectLst) {
        var select = selectLst[i];
        var id = select.id;
        if ((id != "WEGKAT") && (id != "ZWEGKAT")) {
            var value = feature['feature']['properties'][id];
            if (value == null) {
                value = "";
            }
            select.value = value;
        }
    }
    // Select all input tags
    var inputs = ['DKBREIT', 'DFBREIT', 'KBREIT', 'DATUM'];
    for (att of inputs) {
        var input = document.getElementById(att);
        input.value = feature['feature']['properties'][att];
    }
};

// Function to show attributes in the table when a Weg is clicked
function editGrundAttribute () {
    var feature = wegSelected;
    if (feature['feature']['properties']['grundLayer']) {
        sidebar.open("edit-grund");
    } else {
        sidebar.open("edit-soll");
    }
    // Then fill attribute table
    // Select all table tags
    var entries = document.querySelectorAll("td");
    var attribute = ['wdm-ist', 'fkt-ist', 'art-ist', 'zus-ist'];
    // Loop
    for (var i in entries) {
        var row = entries[i];
        // If row has an id
        if ((row.id != "") && (row.id != undefined)) {
            if (attribute.includes(row.id)) {
                var value = feature['feature']['properties'][row.id];
                if (value == null) {
                    value = "";
                } 
                var values = null;
                var id = row.id;
                id = id.split("-")[0];
                values = id + "Values";
                row.innerHTML = window[values][value];
                var select = document.getElementById(id);
                var valueKorrigiert = feature['feature']['properties'][id];
                if (valueKorrigiert == null) {
                    valueKorrigiert = "";
                }
                select.value = valueKorrigiert;
            } 
        }
    }
};

// Function to change attributes when edit is confirmed
function confirmEditGrund () {
    var feature = wegSelected;
    // Select all table tags
    var entries = document.querySelectorAll("td");
    var attribute = ['wdm-ist', 'fkt-ist', 'art-ist', 'zus-ist'];
    // Loop
    for (var i in entries) {
        var row = entries[i];
        // If row has an id
        if ((row.id != "") && (row.id != undefined)) {
            if (attribute.includes(row.id)) {
                var id = row.id;
                id = id.split("-")[0];
                var oldValue = feature['feature']['properties'][id];
                var select = document.getElementById(id);
                var newValue = select.value;
                if (newValue == "") {
                    newValue = null;
                }
                if (newValue != oldValue) {
                    feature['feature']['properties'][id] = newValue;
                }
            }
        }
    }
    // Style that something changed
    var attsChanged = 0;
    var attributen = ['wdm', 'fkt', 'art', 'zus'];
    for (var i in attributen) {
        var att = attributen[i];
        if (feature['feature']['properties'][att+'-ist'] != feature['feature']['properties'][att]) {
            attsChanged = attsChanged + 1;
        };
    }
    if (attsChanged > 0) {
        highlightGrund.eachLayer(function(hFeature) {
            var hLine = hFeature.feature;
            var sLine = feature.feature;
            var intersection = (hLine.geometry == sLine.geometry);
            if (intersection) {
                hFeature.setStyle(show());
            }
        })
    } else {
        highlightGrund.eachLayer(function(hFeature) {
            var hLine = hFeature.feature;
            var sLine = feature.feature;
            var intersection = (hLine.geometry == sLine.geometry);
            if (intersection) {
                hFeature.setStyle(hide());
            }
        })
    }
    // Style ZUS
    var zus = feature['feature']['properties']['zus'];
    if (zus != null) {
        feature.setStyle({
            dashArray: '10'
        });
    } else {
        feature.setStyle({
            dashArray: null
        });
    }
};

// Function to change attributes when edit is confirmed
function confirmEdit () {
    var feature = wegSelected;
    // Select all table tags
    var entries = document.querySelectorAll("td");
    // Loop
    for (var i in entries) {
        var row = entries[i];
        // If row has an id
        if ((row.id != "") && (row.id != undefined)) {
            if (row.id != "LAENGE") {
                var id = row.id;
                id = id.split("-")[0];
                var oldValue = feature['feature']['properties'][id];
                var select = document.getElementById(id);
                var newValue = select.value;
                if (newValue == "") {
                    newValue = null;
                }
                if (newValue != oldValue) {
                    feature['feature']['properties'][id] = newValue;
                }
            }
        }
    }

    // Select all select tags
    var selectLst = document.querySelectorAll("select");
    for (var i in selectLst) {
        var select = selectLst[i];
        var id = select.id;
        if ((id != "WEGKAT") && (id != "ZWEGKAT")) {
            var oldValue = feature['feature']['properties'][id];
            var newValue = select.value;
            if (newValue == "") {
                newValue = null;
            }
            if (newValue != oldValue) {
                feature['feature']['properties'][id] = newValue;
            }
        }
    }

    // Select all input tags
    var inputs = ['DKBREIT', 'DFBREIT', 'KBREIT', 'DATUM'];
    for (att of inputs) {
        var input = document.getElementById(att);
        var oldValue = feature['feature']['properties'][att];
        var newValue = input.value;
        if (newValue == "") {
            newValue = null;
        }
        if (newValue != oldValue) {
            feature['feature']['properties'][att] = newValue;
        }
    }

    // Style that something changed
    var attributen = ['HANDL', 'PRIO', 'ZUHPFL', 'ZWEGKAT', 'WEGKAT', 'BAUART', 'BAUZUS', 'TRAGF', 'UHPFL', 'FKT_LW', 'FKT_FW', 'FKT_TFE', 'FKT_WA', 'FKT_RE', 'FKT_RA', 'FKT_DM', 'FKT_SE', 'FKT_PEE', 'FKT_OEWW', 'FKT_OEWS', 'DKBREIT', 'DFBREIT', 'KBREIT', 'DATUM'];
    var attsChanged = 0;
    for (var i in attributen) {
        var att = attributen[i];
        if (feature['feature']['properties'][att+'-ist'] != feature['feature']['properties'][att]) {
            attsChanged = attsChanged + 1;
        };
    }
    if (attsChanged > 0) {
        highlightLayer.eachLayer(function(hFeature) {
            var hLine = hFeature.feature;
            var sLine = feature.feature;
            var intersection = (hLine.geometry == sLine.geometry);
            if (intersection) {
                hFeature.setStyle(show());
            }
        })
    } else {
        highlightLayer.eachLayer(function(hFeature) {
            var hLine = hFeature.feature;
            var sLine = feature.feature;
            var intersection = (hLine.geometry == sLine.geometry);
            if (intersection) {
                hFeature.setStyle(hide());
            }
        })
    }
    // Style Kategorie
    feature.setStyle({
        color: wegeStyles[feature['feature']['properties']['ZWEGKAT']]
    });

    // Update Popup
    feature.closePopup();
    feature._popup.setContent(updatePopupKat(feature.feature));
    feature.openPopup();
};

// Show and hide features (used for the gemeinde and highlight layers)
// Function to show layer
function show() {
    return {
        opacity: 1,
    };
}
// Function to hide layer
function hide() {
    return {
        opacity: 0,
    };
}

// Hide Table when click outside of map
map.on('click', function(e) {
    // Hide Sidebar
    sidebar.close();
})



