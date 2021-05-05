var progressBar = $('#progress-bar');

var test = '50%';

progressBar.css('width', test);

/// 
/// MAPS & GLOBAL VARIABLES
///

var map = L.map('map', {
    renderer: L.canvas({ tolerance: 10 }) // Set up tolerance for easier selection
}).setView([52.01799,9.03725], 13);

// Global Variables
var status = 'status'; // status of request
var progress = '0%'; // progress of request
var geoJson = null; // geojson data
var bbox = null; // current bounding box
var gemeinde = null;
var selektion = {"type": "FeatureCollection", "name": "grenzen", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::25832" } }, "features": []}; // current gemeinde grenzen
var wegeLayer = L.Proj.geoJson(false, {
    onEachFeature: showPopupEdit
}).addTo(map); // layer to store geojson data
var wegSelected = null;

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




// Set up Layer-Groups/Categories

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

// Grunddatenlayer
var grundDatenLayers = [
    {
    group: "Diese Kategorie braucht einen Namen",
    layers: [
        {
            active: true,
            name: "Wie heißt dieser Layer?",
            layer: {
                type: "geoJson",
                args: []
            }
        },
        {
            active: true,
            name: "Und dieser hier?",
            layer: {
                type: "geoJson",
                args: []
            }
        }
    ]
    
},
{
    group: "Ländliche Wege",
    layers: [
        {
            active: true,
            name: "Fußweg",
            layer: {
                type: "geoJson",
                args: []
            }
        },
        {
            active: true,
            name: "Radweg",
            layer: {
                type: "geoJson",
                args: []
            }
        },
        {
            active: true,
            name: "Reitweg",
            layer: {
                type: "geoJson",
                args: []
            }
        },
        {
            active: true,
            name: "(Kletter-)Steig im Gebirge",
            layer: {
                type: "geoJson",
                args: []
            }
        },
        {
            active: true,
            name: "Rad- und Fußweg",
            layer: {
                type: "geoJson",
                args: []
            }
        }
    ]
    
},
{
    group: "Info-Layer",
    layers: [
        {
            active: false,
            name: "Feldblöcke",
            layer: Feldbloecke
        },
        {
            active: false,
            name: "Gesamtwegenetz",
            layer: Gesamtwegenetz
        }
    ]
    
}
];

var kategorisierteLayers = [
    {
        group: "Kernwegenetz",
        layers: [
            {
                active: true,
                name: "Kategorie A",
                layer: {
                    type: "geoJson",
                    args: []
                }
            },
            {
                active: true,
                name: "Kategorie B",
                layer: {
                    type: "geoJson",
                    args: []
                }
            },
            {
                active: true,
                name: "Kategorie C",
                layer: {
                    type: "geoJson",
                    args: []
                }
            },
            {
                active: true,
                name: "Kategorie D",
                layer: {
                    type: "geoJson",
                    args: []
                }
            },
            {
                active: true,
                name: "Kategorie I",
                layer: {
                    type: "geoJson",
                    args: []
                }
            }
        ]
        
    },
    {
        group: "Untergeordnetes Wegenetz",
        layers: [
            {
                active: true,
                name: "Kategorie E",
                layer: {
                    type: "geoJson",
                    args: []
                }
            },
            {
                active: true,
                name: "Kategorie F",
                layer: {
                    type: "geoJson",
                    args: []
                }
            },
            {
                active: true,
                name: "Kategorie G",
                layer: {
                    type: "geoJson",
                    args: []
                }
            },
            {
                active: true,
                name: "Kategorie H",
                layer: {
                    type: "geoJson",
                    args: []
                }
            }
        ]
        
    },
{
    group: "Info-Layer",
    layers: [
        {
            active: false,
            name: "Feldblöcke",
            layer: Feldbloecke
        },
        {
            active: false,
            name: "Gesamtwegenetz",
            layer: Gesamtwegenetz
        }
    ]
    
}
];


var grundDatenLayersPanel = new L.Control.PanelLayers(baseLayers, grundDatenLayers, { 
	compact: true,
    title: "Grunddaten nach Basis-DLM",
	//collapsed: true,
	collapsibleGroups: false
});

var kategorisierteLayersPanel = new L.Control.PanelLayers(baseLayers, kategorisierteLayers, {
	compact: true,
    title: "Kategorisiertes Wegenetz",
	//collapsed: true,
	collapsibleGroups: false
});


map.addControl(grundDatenLayersPanel);

/////////////////////////////////////////

//
////Mouse-over-info in der Legende
//

// Create dictionary for MouseOver-Info  <-- Vielleicht in die Dictionary-Kategorie packen?
var mouseoverInfo = {
    null: " - ",
    "Kategorie A": 'Kategorie A = klassifiziertes Straßennetz inkl. Gemeindestraßen; maßgebliches Verkehrsmittel: allgemeiner KFZ-Verkehr',
    "Kategorie B": 'Kategorie B = Multifunktionale Wege, d.h. für den land- und forstwirtschaftlichen (luf) Verkehr und / oder den eingeschränkten KFZ-Verkehr sowie den Radverkehr,; Maßgebliche Funktion: Sicherung kleinräumiger Verbindungen und Erschließung; maßgebliche Verkehrsmittel: Radverkehr, luf Verkehr, Anliegerverkehr; Indizien für diese Kategorie-Einteilung: regelmäßig angefahrene Ziele im Außenbereich, z.B. luf Betriebe, öffentliche Ver- und Entsorgungsanlagen, touristische Ziele etc. zusätzlich alle überregionalen Radrouten/-wege (Verbindungswege gem. RLW)',
    "Kategorie C": 'Kategorie C = Wege zur Sicherstellung luf Verbindungen oder Erschließung ganzer Bewirtschaftungsblöcke; maßgeblicher Verkehr: luf Verkehr, lokaler Wander- und Radverkehr (Hauptwirtschaftswege oder Wirtschaftswege gem. RLW',
    "Kategorie D": 'Kategorie D = Untergeordnete Wege mit Bedeutung für Fußgänger, d.h. Wege, die grundsätzlich der Erschließungssicherung von kleineren Feldblöcken dienen oder dienen könnten und über die regelmäßig Fußgänger laufen oder Wanderrouten; maßgeblicher Verkehr lokaler Wander- und Radverkehr u. luf. Verkehr (Wirtschaftswege gem. RLW)',
    "Kategorie E": 'Kategorie E = Wege mit untergeordneter Erschließungsfunktion, z.B. zu kleineren Feldblöcken für einzelne Anlieger, kein unmittelbares öffentliches Interesse; maßgebliches Verkehrsmittel: luf Verkehr (Wirtschaftswege gem. RLW)',
    "Kategorie F": 'Kategorie F = Erschließungswege, die Einzelinteressen dienen; alle Verkehrsarten, aber nur in geringer Menge, z.B. Zufahrten zu einzeln gelegenen Wohnhäusern ohne luf Bedeutung, Windkraftanlagen, Scheunen etc.',
    "Kategorie G": 'Kategorie G = im Netzzusammenhang weniger wichtige Wege, die ausschließlich der Feinverteilung innerhalb eines Feldblocks dienen oder zur Gewährleistung einer funktionierenden Verbindung bzw. Erschließung von geringer oder keiner Bedeutung sind.',
    "Kategorie H": 'Kategorie H = nicht mehr vorhandene oder genutzte Wege"',
    "Kategorie I": 'Kategorie I = reine Fuß- Reit- bzw. Radwege, die als selbständige Wege für luf-Verkehr nicht nutzbar sind (sonstige Wege gem. RLW).',
    "Feldblöcke": "Die gesamten Feldblöcke in NRW",
    "Gesamtwegenetz": "Das gesamte Wegenetz von NRW",
    "Fußweg": "'Fußweg' ist ein Weg, der auf Grund seines Ausbauzustandes nur von Fußgängern zu begehen ist.",
    "Radweg": "'Radweg' ist ein Weg, der als besonders gekennzeichneter und abgegrenzter Teil einer Straße oder mit selbständiger Linienführung für den Fahrradverkehr bestimmt ist.",
    "Reitweg": "'Reitweg' ist ein besonders ausgebauter Weg, auf dem ausschließlich das Reiten zugelassen ist.",
    "(Kletter-)Steig im Gebirge": "'(Kletter-)Steig im Gebirge' ist ein stellenweise mit Drahtseilen gesicherter Pfad, der zur Überwindung besonders steiler Stellen mit Leitern versehen sein kann.",
    "Rad- und Fußweg": "'Rad- und Fußweg'ist ein Weg, der als besonders gekennzeichneter und abgegrenzter Teil einer Straße oder mit selbständiger Linienführung ausschließlich für den Fahrrad- und Fußgängerverkehr bestimmt ist." 
}



// Get spans
var spans = Array.from(document.getElementsByTagName("span"));
// Listen for mouseOver

spans.forEach(function(span) {

  span.addEventListener('mouseover', function() {
       //console.log(span.innerHTML);
       var key = span.innerHTML;
       var legendeText = mouseoverInfo[key];
       console.log(legendeText);
       //TODO: Tooltip zeigen
       
  }); 
  
 });



/////////////////////////////////////////





// Geocoder
var osmGeocoder = new L.Control.Geocoder({
    collapsed: true,
    position: 'topleft',
    text: 'Suche',
    title: 'Suche'
}).addTo(map);



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

// When a gemeinde is chosen
function chooseGemeinde(e) {
    selektion.features = [];
    gemeindeLayer.eachLayer(function(feat) {
        if (feat.feature.properties.name == e.value) {
            feat.setStyle(show());
            var bounds = feat.getBounds();
            // Calculate bounding box 
            getBbox(bounds);
            map.fitBounds(bounds);
        } else {
            feat.setStyle(hide());
        }
    })
    var features = gemeinde.features;
    for (var i = 0; i < features.length; i++) {
        if (features[i]["properties"]["name"] == e.value) {
            selektion.features.push(features[i]);
        }
    }
}

// Load test data
$('#test').click(function() {
    // Hide FirstPage
    document.getElementById("firstPage").style.display = 'none';
    // Make map fullscreen
    document.getElementById("map").style.width = '100%';
    document.getElementById("map").style.marginLeft = '0';
    map.invalidateSize();
    // Add layers from file
    var json = (function() {
        var json = null;
        $.ajax({
        'async': false,
        'global': false,
        'url': "data/ist.geojson",
        'dataType': "json",
        'success': function(data) {
            json = data;
        }
        });
        geoJson = json;
        addGeojson();
    })();
})

// Download geojson to machine
$('#download').click(function() {
    var features = wegeLayer.toGeoJSON();
    var file = 'wegenetz.geojson';
    saveAs(new File([JSON.stringify(features)], file, {
        type: "text/plain;charset=utf-8"
    }), file);
})

// Show Graph
$('#compare').click(function() {
    var table = document.getElementById("tabelle");
    var mapDiv = document.getElementById('map');
    var graph = document.getElementById('graph');
    if (table.style.display == 'none') {
        // Resize Map
        // And show graph
        if (mapDiv.style.marginLeft == '50%') {
            graph.style.display = "block";
        } else {
            table.style.display = 'none';
            mapDiv.style.width = '50%';
            mapDiv.style.marginLeft = '50%';
            map.invalidateSize();
            graph.style.display = "block";
        }
    } else {
        table.style.display = 'none';
        graph.style.display = 'block';
    }
})

/// 
/// REQUEST TO CATEGORIZE FOR THE FIRST TIME
///

// VARIABLES
// WPS Url
var requestUrl = 'https://wps.livinglab-essigfabrik.online/wps?service=WPS&amp;version=1.0.0&amp;request=Execute';
// Layer Styles
var styles = {'a': '#d8000a', 'b': '#03bebe', 'c': '#ffb41d', 'd': '#447f32', 'e': '#153dcf', 'f': '#f343eb', 'g': '#70e034', 'h': '#e6ff01', 'i': '#868C30'};

// TRIGGER
// When button is clicked, categorize streets
$('#request-exe').click(function() {
    // Request file for NEW categorization
    var requestFile = "src/request4_store.xml";
    //var requestFile = "src/req_amanda.xml";
    // Set features to false because it's a new request, so we're not
    // sending any features
    var features = false;
    // Call function to make request
    // Hide FirstPage
    //document.getElementById("firstPage").style.display = 'none';
    // Make map fullscreen
    //document.getElementById("map").style.width = '100%';
    //document.getElementById("map").style.marginLeft = '0';
    //map.invalidateSize();
    completeRequest(requestFile, features);
});

// FUNCTIONS
// Function to calculate bounding box
function getBbox(bounds) {
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

// Function to make whole Request
function completeRequest(requestFile, features) {
    // Variable to save when request started
    // to calculate how long it took later
    var t0 = performance.now()
    
    // First clear global variables, in case an old request was made
    status = 'status';
    geoJson = null;
    wegeLayer.clearLayers();
    // Read Request File
    var requestHttp = new JKL.ParseXML.Text(requestFile);
    var requestData = requestHttp.parse();
    // Replace bounding boxes
    var sendRequest = requestData.replace(/502584.3,5757482.8,513527.9,5766634.9/g, bbox);
    // Add gemeinde grenzen
    var grenzen = JSON.stringify(selektion);
    sendRequest = sendRequest.replace(/hier das Polygon als Text/g, grenzen);
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
                    var percentage = status.split('percentCompleted="').pop().split('"')[0] + "%";
                    if ((percentage != progress) && (percentage != 'status%') && (percentage != '%')) {
                        progress = percentage;
                        //progressUpdate();
                        progressBar.css('width', progress);
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
                addGeojson();
            } else {
                // If they're in response, parse and add to layer
                var statusFeatures = status.split('<![CDATA[').pop().split(']]>')[0];
                geoJson = JSON.parse(statusFeatures);
                addGeojson();
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

// Function to update progress
function progressUpdate() {
    $('[id="progress-size"]').css('width', progress);
    $('[id="progress-value"]').html(progress);
}

// Function to add result features into map
function addGeojson(url) {
    // Add features to layer
    wegeLayer.addData(geoJson);
    // Style features according to category
    wegeLayer.eachLayer(function(feature) {
        // Style features
        var type = feature['feature']['properties']['WEGKAT'];
        feature.setStyle({
            color: styles[type],
            weight: 2,
            opacity: 1,
        });
        // Add attributes for change
        var attribute = ['wdm', 'zus', 'art', 'HANDL', 'PRIO', 'ZUHPFL', 'ZWEGKAT', 'FKT'];
        for (var i in attribute) {
            var att = attribute[i];
            feature['feature']['properties'][att+'-ist'] = feature['feature']['properties'][att];
        }
    });
    map.fitBounds(wegeLayer.getBounds());
    console.log(geoJson);
}

/// 
/// REQUEST TO RE-CATEGORIZE
///

// TRIGGER
// When button is clicked, re-categorize streets
$('#recalculate').click(function() {
    // Save layer as geojson
    var features = wegeLayer.toGeoJSON();
    // Reproject coordinates
    reprojGeojson(features);
    // Stringify
    var featuresString = JSON.stringify(features);
    // Request file for re-categorization
    var requestFile = "src/request4_store_edited.xml";
    // Get bounds of layer
    var bounds = wegeLayer.getBounds();
    // Calculate bounding box 
    getBbox(bounds);
    // Make request
    completeRequest(requestFile, featuresString)
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

/// 
/// ATTRIBUTE TABELLE
///

// VARIABLES
// Dictionary of WDM Values
var wdmValues = {
    null: " - ",
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
    null: " - ",
    "2100": "Außer Betrieb, stillgelegt, verlassen",
    "4000": "Im Bau"
}
// Dictionary of HANDL Values
var HANDLValues = {
    null: " - ",
    "a": "Erhaltung wie Bestand (normale Unterhaltung)",
    "b": "den Unterbau einschließende Sanierung (gleiche Kategorie)",
    "c": "Umbau / andere Bauweise (veränderte Kategorie)",
    "d": "Rückbau / Aufhebung",
    "e": "Neubau (neue Trasse)"
}
// Dictionary of ART Values
var artValues = {
    null: " - ",
    "1103": "Fußweg",
    "1106": "Radweg",
    "1107": "Reitweg",
    "1110": "Rad- und Fußweg"
}
// Dictionary of PRIO Values
var PRIOValues = {
    null: " - ",
    "Kurzfristig": "Kurzfristig",
    "Mittelfristig": "Mittelfristig",
    "Langfristig": "Langfristig"
}
// Dictionary of ZUHPFL Values
var ZUHPFLValues = {
    null: " - ",
    "Gemeinde": "Gemeinde",
    "Kreis": "Kreis",
    "Land": "Land",
    "Bundesrepublik Deutschland": "Bundesrepublik Deutschland",
    "Natürliche Personen des Privatrechts": "Natürliche Personen des Privatrechts",
    "Juristichen Personen des Privatrechts": "Juristichen Personen des Privatrechts",
    "Sonstige": "Sonstige"
}

// Dictionary of Zukünftige Wegekategorien Values
var ZWEGKATValues = {
    null: " - ",
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

var FKTValues = {
    null: " - ",
    "5211": "Hauptwirtschaftsweg",
    "5212": "Wirtschaftsweg"
}

///////////// Nachgetragene Dictionarys: 

// Dictionary of Wegekategorien Values
var WEGKATValues = {
    null: " - ",
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


// Dictionary of Bauart Values
var BAUARTValues = {
    null: " - ",
    "a": 'befestigt',
    "b": "teilbefestigt",
    "c": "wassergebunden",
    "d": "ohne Befestigung",
    "e": "Kreuzungsbauwerk"
}

// Dictionary of Bauzustand Values
var BAUZUSValues = {
    null: " - ",
    "a": 'in Ordnung',
    "b": "Einzelmaßnahmen erforderlich",
    "c": "Gesamtsanierung erforderlich"
}

// Dictionary of Tragfähigkeit Values
var TRAGFValues = {
    null: " - ",
    "a": 'hoch',
    "b": "mittel",
    "c": "gering"
}

// Dictionary of Unterhaltungspflicht Values
var UHPFLValues = {
    null: " - ",
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
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Nutzungshäufigkeit Forstwirtschaft Values
var FKT_FWValues = {
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Nutzungshäufigkeit Touristmus, Erholung, Freizeit Values
var FKT_TFEValues = {
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Nutzungshäufigkeit Wandernutzung
var FKT_WAValues = {
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Nutzungshäufigkeit Reiter
var FKT_REValues = {
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Nutzungshäufigkeit Radfahrer
var FKT_RAValues = {
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Nutzungshäufigkeit Darseinsvorsorge und Mobilität
var FKT_DMValues = {
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Nutzungshäufigkeit siedlungsstrukturelle Entwicklungen
var FKT_SEValues = {
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Nutzungshäufigkeit Produktion erneuerbarer Energien
var FKT_PEEValues = {
    null: " - ",
    "0": "nie / selten",
    "1": "gelegentlich / saisonal",
    "2": "häufig"
}

// Dictionary of Funktion ökologische Wertigkeit Wege, Verkersflächen
var FKT_OEWWalues = {
    null: " - ",
    "0": "nicht vorhanden",
    "1": "vorhanden",
    "2": "stark ausgeprägt"
}

// Dictionary of Funktion ökologische Wertigkeit Säume
var FKT_OEWS = {
    null: " - ",
    "0": "nicht vorhanden",
    "1": "vorhanden",
    "2": "stark ausgeprägt"
}


////////////

// FUNCTIONS
// Onclick function
function onclick(feature, layer) {
    layer.on({
        click: attributes
    });
}

// Function to show Popup with attribute (SOLL)
var autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});
function showPopupEdit(feature, layer) {
    layer.on({
        click: function() {
            wegSelected = layer;
        }
    });
    if ("STS" in feature.properties) {
        var popupContent = '<table border="0" rules="groups"><thead><tr><th>Wegenummer: </th><th>' + (feature.properties['STS'] !== null ? autolinker.link(feature.properties['STS'].toLocaleString()) : '') + '</th></tr></thead><tr>\
            <tr>\
                <th scope="row">Straßenname: </th>\
                <td>' + (feature.properties['NAM'] !== null ? autolinker.link(feature.properties['NAM'].toLocaleString()) : '') + '</td>\
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
                <td>' + (feature.properties['HANDL'] !== null ? autolinker.link(feature.properties['HANDL'].toLocaleString()) : '') + '</td>\
            </tr>\
        </table>\
        <br>\
        <button class="button" id="edit-attribute" onclick="editAttribute()">Editieren</button>';
    } else {
        var popupContent = '<table border="0" rules="groups"><thead><tr><th>Wegenummer: </th><th>' + (feature.properties['sts'] !== null ? autolinker.link(feature.properties['sts'].toLocaleString()) : '') + '</th></tr></thead><tr>\
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
                    <td>' + (feature.properties['HANDL'] !== null ? autolinker.link(feature.properties['HANDL'].toLocaleString()) : '') + '</td>\
                </tr>\
            </table>\
            <br>\
            <button class="button" id="edit-attribute" onclick="editAttribute()">Editieren</button>';
    }
    layer.bindPopup(popupContent, {maxHeight: 400});
}

// Edit attribute
function editAttribute () {
    var feature = wegSelected;
    var table = document.getElementById("tabelle");
    var graph = document.getElementById("graph");
    if (table.style.display == 'none') {
        // Resize Map
        // And show attribut tabelle
        var mapDiv = document.getElementById('map');
        if (mapDiv.style.marginLeft == '50%') {
            graph.style.display = "none";
            table.style.display = "block";
        } else {
            mapDiv.style.width = '50%';
            mapDiv.style.marginLeft = '50%';
            map.invalidateSize();
            graph.style.display = "none";
            table.style.display = "block";
        }
    }
    // Then fill attribute table
    // Attributes that can't be changed
    // Select all table tags
    var entries = document.querySelectorAll("td");
    // Loop
    for (var i in entries) {
        var row = entries[i];
        // If row has an id
        if ((row.id != "") && (row.id != undefined)) {
            // If it is WDM or ZUS get value from dictionary
            if (row.id != "LAENGE") {
                var value = feature['feature']['properties'][row.id]; 
                var values = null;
                var id = row.id;
                id = id.split("-")[0];
                values = id + "Values";
                row.innerHTML = window[values][value];
                var select = document.getElementById(id);
                var valueKorrigiert = feature['feature']['properties'][id];
                select.value = valueKorrigiert;
                // If it's length, round it
            } else if (row.id == "LAENGE") {
                var laenge = feature['feature']['properties'][row.id];
                var rounded = laenge.toFixed(2);
                row.innerHTML = rounded;
            }
        }
    }
};

$('#edit-confirm').click(function() {
    var feature = wegSelected;
    // Select all table tags
    var entries = document.querySelectorAll("td");
    // Loop
    for (var i in entries) {
        var row = entries[i];
        // If row has an id
        if ((row.id != "") && (row.id != undefined)) {
            // If it is WDM or ZUS get value from dictionary
            if (row.id != "LAENGE") {
                var id = row.id;
                id = id.split("-")[0];
                var oldValue = feature['feature']['properties'][id];
                var select = document.getElementById(id);
                var newValue = select.value;
                if (newValue != oldValue) {
                    feature['feature']['properties'][id] = newValue;
                    feature.setStyle(changed());
                } else {
                    feature.setStyle(notChanged());
                }
            }
        }
    }
    var wegkat = feature['feature']['properties']['WEGKAT'];
    var zwegkat = feature['feature']['properties']['ZWEGKAT'];
    if (wegkat != zwegkat) {
        feature.setStyle({
            color: styles[zwegkat],
        })
    }
    console.log(feature);
});

// Function to show that layer has attributes changed
function changed() {
    return {
        dashArray: '5',
    }
}
// Function to show that layer has no changes
function notChanged() {
    return {
        dashArray: null,
    }
}

// Hide Table when click outside of map
map.on('click', function(e) {
    // First reset style of all features
    wegeLayer.eachLayer(function(feature) {
        feature.setStyle({
            weight: 2,
        })
        feature['feature']['properties']['selected'] = false;
    });
    // Hide table
    document.getElementById("tabelle").style.display = "none";
    document.getElementById("graph").style.display = "none";
    document.getElementById("map").style.width = "100%";
    document.getElementById("map").style.marginLeft = "0";
    map.invalidateSize();
})

/// 
/// LAYER CONTROL
///

// Turn Layers on and off
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

// Get checkboxes
var checkboxes = document.querySelectorAll("input[type=checkbox]");
console.log(checkboxes);

// Listen for changes
checkboxes.forEach(function(checkbox) {
  checkbox.addEventListener('change', function() {
    wegeLayer.eachLayer(function(feature) {
        var type = feature['feature']['properties']['WEGKAT'];
        if (type == checkbox.id) {
            if (checkbox.checked) {
                feature.setStyle(show());
                L.control()
            } else {
                feature.setStyle(hide());
            }
        }
    })
  });
});


//
// Barplott
//

//// Data for Barplott
$('#sumup').click(function() { //Button 
    map.removeControl(grundDatenLayersPanel);  // Zu Testzwecken hier, später bei der Kategorisierung aufrufen
    map.addControl(kategorisierteLayersPanel); // Zu Testzwecken hier, später bei der Kategorisierung aufrufen

    console.log("test")
    //reset values
    var sum_all = 0 
    var sum_kat_a = 0
    var sum_kat_b = 0
    var sum_kat_c = 0
    var sum_kat_d = 0
    var sum_kat_e = 0
    var sum_kat_f = 0
    var sum_kat_g = 0
    var sum_kat_h = 0
    var sum_kat_i = 0
    var sum_rest = 0
    //
    var sum_zkat_a = 0
    var sum_zkat_b = 0
    var sum_zkat_c = 0
    var sum_zkat_d = 0
    var sum_zkat_e = 0
    var sum_zkat_f = 0
    var sum_zkat_g = 0
    var sum_zkat_h = 0
    var sum_zkat_i = 0
    var sum_zrest = 0

/*     wegeLayer.eachLayer(function(feature) {
        var laenge = feature['feature']['properties']['LAENGE'];
        // console.log(laenge);
        sum_all = sum_all + laenge
    });
    console.log(sum_all); // 100% */


// WEGKAT Summen berechnen
    wegeLayer.eachLayer(function(feature) {
        var kat = feature['feature']['properties']['WEGKAT'];
        var laenge = feature['feature']['properties']['LAENGE'];
        //console.log(kat); 
        switch (kat) {
          case "a":
            //console.log("kategorie a");
            //console.log(laenge);
            sum_kat_a = sum_kat_a + laenge;
            break;
          case "b":
            //console.log("kategorie b");
            sum_kat_b = sum_kat_b + laenge;
            break;
          case "c":
            //console.log("kategorie c");
            sum_kat_c = sum_kat_c + laenge;
            break;
          case "d":
            //console.log("kategorie d");
            sum_kat_d = sum_kat_d + laenge;
            break;
          case "e":
            //console.log("kategorie e");
            sum_kat_e = sum_kat_e + laenge;
            break;
          case "f":
            //console.log("kategorie f");
            sum_kat_f = sum_kat_f + laenge;
            break;
          case "g":
            //console.log("kategorie g");
            sum_kat_g = sum_kat_g + laenge;
            break;
          case "h":
            //console.log("kategorie h");
            sum_kat_h = sum_kat_h + laenge;
            break;
          case "i":
            //console.log("kategorie i");
            sum_kat_i = sum_kat_i + laenge;
            break;
          default:
            //console.log("Unkategorisiert");
            sum_rest = sum_rest + laenge;
        }

    });


    wegeLayer.eachLayer(function(feature) {
        var laenge = feature['feature']['properties']['LAENGE'];
        var zkat = feature['feature']['properties']['ZWEGKAT'];

// ZWEGKAT Summen berechnen

        switch (zkat) {
            case "a":
            //console.log("kategorie a");
            // console.log(laenge);
            sum_zkat_a = sum_zkat_a + laenge;
            break;
            case "b":
            //console.log("kategorie b");
            sum_zkat_b = sum_zkat_b + laenge;
            break;
            case "c":
            // console.log("kategorie c");
            sum_zkat_c = sum_zkat_c + laenge;
            break;
            case "d":
            //console.log("kategorie d");
            sum_zkat_d = sum_zkat_d + laenge;
            break;
            case "e":
            //console.log("kategorie e");
            sum_zkat_e = sum_zkat_e + laenge;
            break;
            case "f":
            //console.log("kategorie f");
            sum_zkat_f = sum_zkat_f + laenge;
            break;
            case "g":
            //console.log("kategorie g");
            sum_zkat_g = sum_zkat_g + laenge;
            break;
            case "h":
            //console.log("kategorie h");
            sum_zkat_h = sum_zkat_h + laenge;
            break;
            case "i":
            // console.log("kategorie i");
            sum_zkat_i = sum_zkat_i + laenge;
            break;
            default:
            // console.log("Unkategorisiert");
            sum_zrest = sum_zrest + laenge;
        }
    });
  
// Ergebnisse der Berechnung loggen

    console.log("kategorie a");
    console.log(sum_kat_a);
    console.log(sum_zkat_a);

    console.log("kategorie b");
    console.log(sum_kat_b);
    console.log(sum_zkat_b);
    console.log("kategorie c");
    console.log(sum_kat_c);
    console.log(sum_zkat_c);
    console.log("kategorie d");
    console.log(sum_kat_d);
    console.log(sum_zkat_d);
    console.log("kategorie e");
    console.log(sum_kat_e);
    console.log(sum_zkat_e);
    console.log("kategorie f");
    console.log(sum_kat_f);
    console.log(sum_zkat_f);
    console.log("kategorie g");
    console.log(sum_kat_g);
    console.log(sum_zkat_g);

    console.log("kategorie h");
    console.log(sum_kat_h);
    console.log(sum_zkat_h);

    console.log("kategorie i");
    console.log(sum_kat_i);
    console.log(sum_zkat_i);
    console.log("Unkategorisiert");
    console.log(sum_rest);
    console.log(sum_zrest);


//// Create a Data Set <--- Here starts the D3-Part

 /* var data1 = [
    {group: "A", value: sum_kat_a},
    {group: "B", value: sum_kat_b},
    {group: "C", value: sum_kat_c},
    {group: "D", value: sum_kat_d},
    {group: "E", value: sum_kat_e},
    {group: "F", value: sum_kat_f},
    {group: "G", value: sum_kat_g},
    {group: "H", value: sum_kat_h},
    {group: "I", value: sum_kat_i},
    {group: "Rest", value: sum_rest}
 ]; 

var data2 = [
    {group: "A", value: sum_zkat_a},
    {group: "B", value: sum_zkat_b},
    {group: "C", value: sum_zkat_c},
    {group: "D", value: sum_zkat_d},
    {group: "E", value: sum_zkat_e},
    {group: "F", value: sum_zkat_f},
    {group: "G", value: sum_zkat_g},
    {group: "H", value: sum_zkat_h},
    {group: "I", value: sum_zkat_i},
    {group: "Rest", value: sum_zrest}
 ];  */




// set the dimensions and margins of the graph
var margin = {top: 10, right: 30, bottom: 20, left: 50},
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");



  // List of subgroups = header of the csv files = soil condition here
  var subgroups = data.columns.slice(1)

  // List of groups = species here = value of the first column called group -> I show them on the X axis
  var groups = d3.map(data, function(d){return(d.group)}).keys()

  // Add X axis
  var x = d3.scaleBand()
      .domain(groups)
      .range([0, width])
      .padding([0.2])
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickSizeOuter(0));

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, 100])
    .range([ height, 0 ]);
  svg.append("g")
    .call(d3.axisLeft(y));

  // color palette = one color per subgroup
  var color = d3.scaleOrdinal()
    .domain(subgroups)
    .range(['#e41a1c','#377eb8','#4daf4a'])

  // Normalize the data -> sum of each group must be 100!
  console.log(data)
  dataNormalized = []
  data.forEach(function(d){
    // Compute the total
    tot = 0
    for (i in subgroups){ name=subgroups[i] ; tot += +d[name] }
    // Now normalize
    for (i in subgroups){ name=subgroups[i] ; d[name] = d[name] / tot * 100}
  })

  //stack the data? --> stack per subgroup
  var stackedData = d3.stack()
    .keys(subgroups)
    (data)

  // Show the bars
  svg.append("g")
    .selectAll("g")
    // Enter in the stack data = loop key per key = group per group
    .data(stackedData)
    .enter().append("g")
      .attr("fill", function(d) { return color(d.key); })
      .selectAll("rect")
      // enter a second time = loop subgroup per subgroup to add all rectangles
      .data(function(d) { return d; })
      .enter().append("rect")
        .attr("x", function(d) { return x(d.data.group); })
        .attr("y", function(d) { return y(d[1]); })
        .attr("height", function(d) { return y(d[0]) - y(d[1]); })
        .attr("width",x.bandwidth())


 
}); 



/// 
/// TOGGLE
///
/*
// Toggle-BaseLayers
// Funktion beim laden der Seite aufrufen
window.addEventListener("load", function() {

     // Der ID den Event-Handler 'click' hinzufügen,
     // als Event die Funktion 'toggleModes' aufrufen.
     document.getElementById("baselayerSwitcher").addEventListener("click", toggleBaselayer);
    }
   );
    function toggleBaselayer() {

        if (document.getElementById("baselayerSwitcher").checked) {
        map.addLayer(OSM_Layer),
        map.removeLayer(NRW_Luftbild);
        } else {
        map.removeLayer(OSM_Layer),
        map.addLayer(NRW_Luftbild);
        }
}
*/




