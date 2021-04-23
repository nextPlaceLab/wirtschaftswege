/// 
/// MAPS & GLOBAL VARIABLES
///

var map = L.map('map', {
    renderer: L.canvas({ tolerance: 10 }) // Set up tolerance for easier selection
}).setView([52.01799,9.03725], 13);

// Global Variables
var status = 'status'; // status of request
var geoJson = null; // geojson data
var bbox = null; // current bounding box
var gemeinde = null;
var selektion = {"type": "FeatureCollection", "name": "grenzen", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::25832" } }, "features": []}; // current gemeinde grenzen
var wegeLayer = L.Proj.geoJson(false, {
    onEachFeature: showPopupEdit
}).addTo(map); // layer to store geojson data
var wegSelected = null;

// Set up Base-Layers for each Map
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

// Set up OSM tile layer 
var OSM_Layer_Map = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 22,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiYWJqYXJkaW0iLCJhIjoiY2tmZmpyM3d3MGZkdzJ1cXZ3a3kza3BybiJ9.2CgI2GbcJysBRHmh7WwdVA'
});

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

// Load test data
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
    if (table.style.display == 'none') {
        // Resize Map
        // And show graph
        var mapDiv = document.getElementById('map');
        var graph = document.getElementById('graph');
        if (mapDiv.style.marginLeft == '50%') {
            graph.style.display = "block";
        } else {
            table.style.display = 'none';
            mapDiv.style.width = '50%';
            mapDiv.style.marginLeft = '50%';
            map.invalidateSize();
            graph.style.display = "block";
        }
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
    //var requestFile = "src/request4_store.xml";
    var requestFile = "src/request4_store_selektion_text.xml";
    // Get current bounds of the map
    //var bounds = map.getBounds();
    // Calculate bounding box 
    //getBbox(bounds);
    // Set features to false because it's a new request, so we're not
    // sending any features
    var features = false;
    // Call function to make request
    // Hide FirstPage
    document.getElementById("firstPage").style.display = 'none';
    // Make map fullscreen
    document.getElementById("map").style.width = '100%';
    document.getElementById("map").style.marginLeft = '0';
    map.invalidateSize();
    completeRequest(requestFile, features);
})

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
    sendRequest = sendRequest.replace(/hier das Polygon als Json/g, grenzen);
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
        success: function (response) {
            // Get status url from the response
            var statusUrl = response.split('statusLocation="').pop().split('"')[0];
            // Check status every X seconds, until it is succeeded
            while (!status.includes("ProcessSucceeded")) {
                setTimeout(getStatus(statusUrl), 3000);
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




