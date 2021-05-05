/// 
/// MAPS & GLOBAL VARIABLES
///

// Map
var map = L.map('map', {
    renderer: L.canvas({ tolerance: 10 }) // Set up tolerance for easier selection
}).setView([52.01799,9.03725], 22);

// Global Variables
var status = 'status'; // status of request
var progress = '0'; // progress of request
var geoJson = null; // geojson data
var bbox = null; // current bounding box
var gemeinde = null; // chosen gemeinde
//var selektion = {"type": "FeatureCollection", "name": "grenzen", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::25832" } }, "features": []}; // current gemeinde grenzen
var highlightLayer = L.Proj.geoJson(false, {
    onEachFeature: highlightStyle
}).addTo(map); // layer to show stroke on changed streets
var wegeLayer = L.Proj.geoJson(false, {
    onEachFeature: showPopupEdit
}).addTo(map); // layer to store categorized data
var grundLayer = L.Proj.geoJson(false, {
    onEachFeature: showPopupEdit
}).addTo(map); // layer to store grund data
var wegSelected = null; // variable to store active weg

// Function to style stroke layer
function highlightStyle(feature, layer) {
    layer.setStyle({
            weight: 7,
            color: '#ffffff',
            opacity: 0,
            clickable: false,
        });
}

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

// Geocoder
var osmGeocoder = new L.Control.Geocoder({
    collapsed: true,
    position: 'topleft',
    text: 'Suche',
    title: 'Suche'
}).addTo(map);

// Sidebar
var sidebar = L.control.sidebar('sidebar').addTo(map);

// ProgressBar
var bar = new ProgressBar.Line(container, {
    strokeWidth: 4,
    easing: 'easeInOut',
    duration: 1400,
    color: '#FFEA82',
    trailColor: '#eee',
    trailWidth: 1,
    svgStyle: {width: '100%', height: '100%'},
    text: {
      style: {
        // Text color.
        // Default: same as stroke color (options.color)
        color: '#999',
        position: 'absolute',
        right: '0',
        top: '30px',
        padding: 0,
        margin: 0,
        transform: null
      },
      autoStyleContainer: false
    },
    from: {color: '#FFEA82'},
    to: {color: '#ED6A5A'},
    step: (state, bar) => {
      bar.setText(Math.round(bar.value() * 100) + ' %');
    }
});

// ProgressBar Test
$('#animate').click(function() {
    var no = '45';
    var noFloat = parseFloat(no);
    var noFinal = noFloat*0.01;
    console.log(noFinal);
    bar.animate(noFinal);
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
    //selektion.features = [];
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
    /*
    var features = gemeinde.features;
    for (var i = 0; i < features.length; i++) {
        if (features[i]["properties"]["name"] == e.value) {
            selektion.features.push(features[i]);
        }
    }
    */
}

// Load test data categorized
$('#test').click(function() {
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
        var layer = 'wegeLayer';
        addGeojson(layer);
    })();
})

// Load test grund daten
$('#test-grund').click(function() {
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
        var layer = 'grundLayer';
        addGeojson(layer);
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

/// 
/// REQUEST TO CATEGORIZE FOR THE FIRST TIME
///

// VARIABLES
// WPS Url
var requestUrl = 'https://wps.livinglab-essigfabrik.online/wps?service=WPS&amp;version=1.0.0&amp;request=Execute';
// Layer Styles
var styles = {'a': '#d8000a', 'b': '#03bebe', 'c': '#ffb41d', 'd': '#447f32', 'e': '#153dcf', 'f': '#f343eb', 'g': '#70e034', 'h': '#e6ff01', 'i': '#868C30'};
var grundStyles = {
    'Klassifizierte Straße': '#C00000',
    'Kein Attribut': '#ED7D31',
    'Hauptwirtschaftsweg': '#00FFFF',
    'Wirtschaftsweg': '#FFFF00',
    'Fußweg': '#FF33CC',
    'Reitweg': '#7030A0',
    'Rad- und Fußweg': '#00FF99',
    'Radweg': '#006666'
}

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
    var layer = 'grundLayer';
    completeRequest(requestFile, features, layer);
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
    // Add gemeinde grenzen
    //var grenzen = JSON.stringify(selektion);
    //sendRequest = sendRequest.replace(/hier das Polygon als Text/g, grenzen);
    // If we are sending features, add them too
    
    if (features) {
        console.log('sending features');
        sendRequest = sendRequest.replace(/hier die editierten Ergebnisdaten im JSON-Format/g, features);
    } else {
        console.log('getting features');
    }
    
    var file = 'requestwithfeatures.txt';
    saveAs(new File([sendRequest], file, {
        type: "text/plain;charset=utf-8"
    }), file);
    
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
                        var noFloat = parseFloat(progress);
                        var noFinal = noFloat*0.01;
                        console.log(noFinal);
                        bar.animate(noFinal);
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
    // Clear layer
    window[layer].clearLayers();
    // Add features to layer
    window[layer].addData(geoJson);
    // Style features according to category
    if (layer == 'wegeLayer') {
        map.removeLayer(grundLayer);
        styleKategorie();
    } else {
        styleGrund();
    }
    map.fitBounds(window[layer].getBounds());
}

// Function to style Wege according to categories
function styleKategorie() {
    wegeLayer.eachLayer(function(feature) {
        // Style features
        var type = feature['feature']['properties']['ZWEGKAT'];
        feature.setStyle({
            color: styles[type],
            weight: 2,
            opacity: 1,
        });
        // Add attributes for change
        var attribute = ['wdm', 'zus', 'art', 'fkt', 'HANDL', 'PRIO', 'ZUHPFL', 'ZWEGKAT', 'WEGKAT'];
        for (var i in attribute) {
            var att = attribute[i];
            feature['feature']['properties'][att+'-ist'] = feature['feature']['properties'][att];
        }
        // Delete grundlayer attribut
        feature['feature']['properties']['grundLayer'] = false;
    });
}

// Function to style Wege according to grund attribute
function styleGrund() {
    grundLayer.eachLayer(function(feature) {
        // Style features
        var layer = null;
        var wdm = feature['feature']['properties']['wdm'];
        var fkt = feature['feature']['properties']['fkt'];
        var art = feature['feature']['properties']['art'];
        var zus = feature['feature']['properties']['zus'];
        if (wdm != null) {
            if (wdm == '9997') {
                layer = 'Kein Attribut';
            } else {
                layer = 'Klassifizierte Straße';
            }
        } else if (fkt != null) {
            layer = fktValues[fkt];
        } else if (art != null) {
            layer = artValues[art];
        }
        if (zus != null) {
            feature.setStyle({
                color: grundStyles[layer],
                weight: 2,
                opacity: 1,
                dashArray: '5',
            });
        } else {
            feature.setStyle({
                color: grundStyles[layer],
                weight: 2,
                opacity: 1,
            });
        }
        // Add attributes for change
        var attribute = ['wdm', 'zus', 'art', 'fkt', 'HANDL', 'PRIO', 'ZUHPFL', 'ZWEGKAT', 'WEGKAT'];
        for (var i in attribute) {
            var att = attribute[i];
            feature['feature']['properties'][att+'-ist'] = feature['feature']['properties'][att];
        }
        feature['feature']['properties']['grundLayer'] = true;
    });
}

/// 
/// REQUEST TO RE-CATEGORIZE
///

// TRIGGER
// When button is clicked, re-categorize streets
$('#recalculate').click(function() {
    // Clear FKT_PEE and FKT_WA
    /*
    grundLayer.eachLayer(function(feature) {
        feature['feature']['properties']['FKT_PEE'] = null;
        feature['feature']['properties']['FKT_WA'] = null;
    })
    */
    // Save layer as geojson
    var features = grundLayer.toGeoJSON();
    // Reproject coordinates
    reprojGeojson(features);
    // Add CRS
    let keyValues = Object.entries(features); 
    keyValues.splice(1,0, ["crs", { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::25832" } }]); 
    let newObj = Object.fromEntries(keyValues)
    // Stringify
    var featuresString = JSON.stringify(newObj);
    // Request file for re-categorization
    var requestFile = "src/request4_store_edited.xml";
    // Get bounds of layer
    //var bounds = grundLayer.getBounds();
    // Calculate bounding box 
    //getBbox(bounds);
    // Layer to add response to
    var layer = "wegeLayer";
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

// FUNCTIONS
// Function to show Popup with attribute (SOLL)
var autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});
function showPopupEdit(feature, layer) {
    layer.on({
        click: function() {
            wegSelected = layer;
            var sidebarStatus = document.getElementById("sidebar").className;
            if (sidebarStatus == 'sidebar sidebar-left leaflet-touch') {
                editAttribute();
            }
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
    // Style that something changed
    var attribute = ['wdm', 'zus', 'art', 'fkt', 'HANDL', 'PRIO', 'ZUHPFL', 'ZWEGKAT'];
    var attsChanged = 0;
    for (var i in attribute) {
        var att = attribute[i];
        if (feature['feature']['properties'][att+'-ist'] != feature['feature']['properties'][att]) {
            attsChanged = attsChanged + 1;
        };
    }
    console.log(attsChanged);
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

// Hide Table when click outside of map
map.on('click', function(e) {
    // First reset style of all features
    /*
    wegeLayer.eachLayer(function(feature) {
        feature.setStyle({
            weight: 2,
        })
        feature['feature']['properties']['selected'] = false;
    });
    */
    // Hide Sidebar
    sidebar.close();
})




