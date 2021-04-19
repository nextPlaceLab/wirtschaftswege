/// 
/// MAP
///

// Initiate maps
var map = L.map('map', {
    renderer: L.canvas({ tolerance: 10 }) // Set up tolerance for easier selection
}).setView([52.01799,9.03725], 13);

var mapEdit = L.map('map-edit', {
    renderer: L.canvas({ tolerance: 10 }) // Set up tolerance for easier selection
}).setView([52.01799,9.03725], 13);

// Set up Base-Layers
// Set up Luftbild Layer
var NRW_Luftbild = L.tileLayer.wms("https://www.wms.nrw.de/geobasis/wms_nw_dop", {
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

var NRW_Luftbild = L.tileLayer.wms("https://www.wms.nrw.de/geobasis/wms_nw_dop", {
    layers: 'nw_dop_rgb',
    format: 'image/png',
    version: '1.1.0',
    transparent: true,
    opacity: 0.5,
    attribution: "",
    tiled: true,
    maxZoom: 22,
    minZoom: 6,
}).addTo(mapEdit);

// Set up OSM tile layer 
var OSM_Layer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
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

// Synchronize maps
mapEdit.sync(map);
map.sync(mapEdit);

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
var geoJson = null; // geojson data
var bbox = null; // current bounding box
var wegeLayer = L.Proj.geoJson(false, {
    onEachFeature: onclick
}).addTo(map); // layer to store geojson data
var showIst = true;

// Toggle maps
$('#hide').click(function() {
    var mapDiv = document.getElementById('map');
    var mapEditDiv = document.getElementById('map-edit');
    if (mapDiv.style.display == 'none') {
        mapDiv.style.display = 'block';
        mapEditDiv.style.width = '50%';
        mapEditDiv.style.marginLeft = '50%';
        mapEdit.invalidateSize();
        document.getElementById('hide').innerHTML = "IST ausblenden";
    } else {
        mapDiv.style.display = 'none';
        mapEditDiv.style.width = '100%';
        mapEditDiv.style.marginLeft = '0%';
        mapEdit.invalidateSize();
        document.getElementById('hide').innerHTML = "IST zeigen";
    }
});

/// 
/// REQUEST TO CATEGORIZE FOR THE FIRST TIME
///

// VARIABLES
// WPS Url
var requestUrl = 'https://wps.livinglab-essigfabrik.online/wps?service=WPS&amp;version=1.0.0&amp;request=Execute';
// Layer Styles
var styles = {'a': '#d8000a', 'b': '#03bebe', 'c': '#ffb41d', 'd': '#51ad37', 'e': '#153dcf', 'f':'#f343eb', 'i': '#51ad37'};

// TRIGGER
// When button is clicked, categorize streets
$('#request-exe').click(function() {
    // Request file for NEW categorization
    var requestFile = "src/request4_store.xml";
    // Get current bounds of the map
    var bounds = map.getBounds();
    // Calculate bounding box 
    getBbox(bounds);
    // Set features to false because it's a new request, so we're not
    // sending any features
    var features = false;
    // Call function to make request
    completeRequest(requestFile, bbox, features);
})

// FUNCTIONS
// Function to calculate bounding box
function getBbox(bounds) {
    /// Calculate map bounding box ///
    //var bounds = map.getBounds();
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
    console.log(geoJson);
};

// Function to add result features into map
function addGeojson(url) {
    // Add features to layer
    wegeLayer.addData(geoJson);
    console.log(wegeLayer);
    // Style features according to category
    wegeLayer.eachLayer(function(feature) {
        // Style features
        var type = feature['feature']['properties']['WEGKAT'];
        feature.setStyle({
            color: styles[type],
            weight: 2,
            opacity: 1,
        })
        // Add attributes for change
        feature['feature']['properties']['wdm-neue'] = null;
        feature['feature']['properties']['zus-neue'] = null;
        feature['feature']['properties']['selected'] = false;
    });
    // Show Layer Panel
    document.getElementById("layer-control").style.display = "block";
}

/// 
/// REQUEST TO RE-CATEGORIZE
///

// TRIGGER
// When button is clicked, re-categorize streets
$('#recalculate').click(function() {
    // Change attributes
    wegeLayer.eachLayer(function(feature) {
        var properties = feature['feature']['properties'];
        properties['selected'] = false;
        properties['wdm-or'] = properties['wdm'];
        properties['zus-or'] = properties['zus'];
        properties['wdm'] = properties['wdm-neue'];
        properties['zus'] = properties['zus-neue'];
    });
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

// FUNCTIONS
// Onclick function
function onclick(feature, layer) {
    layer.on({
        click: attributes
    });
}
// Add atributes function
function attributes(e) {
    // Avoid that click on street activates click on map
    L.DomEvent.stopPropagation(e);
    // First reset style of all features
    wegeLayer.eachLayer(function(feature) {
        feature.setStyle({
            weight: 2,
        })
        feature['feature']['properties']['selected'] = false;
    });
    // Then highlight clicked feature
    feature = e.target;
    feature.setStyle({
        weight: 5,
    });
    // Mark feature as selected
    feature['feature']['properties']['selected'] = true;
    // Show attribut tabelle
    document.getElementById("tabelle").style.display = "block";
    // Then fill attribute table
    // Attributes that can't be changed
    // Select all table tags
    var entries = document.querySelectorAll("td");
    // Loop
    for (var i in entries) {
        var row = entries[i];
        // If row has an id
        if (row.id != "") {
            // If it is WDM or ZUS get value from dictionary
            if ((row.id == "wdm") || (row.id == "zus")) {
                var value = feature['feature']['properties'][row.id];
                var values = row.id + "Values";
                row.innerHTML = window[values][value];
                // If it's length, round it
            } else if (row.id == "LAENGE") {
                var laenge = feature['feature']['properties'][row.id];
                var rounded = laenge.toFixed(2);
                row.innerHTML = rounded;
                // Any other value, get from feature properties
            } else {
                var value = feature['feature']['properties'][row.id];
                if (value) {
                    row.innerHTML = value;
                } else {
                    row.innerHTML = " - ";
                }
            }
        }
    }
    // Changeable attributes
    var wdmSelect = document.getElementById("wdm-neue");
    var wdmValue = feature['feature']['properties']['wdm-neue'];
    if (wdmValue) {
        wdmSelect.value = wdmValue;
    } else {
        wdmSelect.value = "";
    }
    var zusSelect = document.getElementById("zus-neue");
    var zusValue = feature['feature']['properties']['zus-neue'];
    if (zusValue) {
        zusSelect.value = zusValue;
    } else {
        zusSelect.value = "";
    }
}

// Attribute change
function changeAttribute(e) {
    // Find selected feature
    wegeLayer.eachLayer(function(feature) {
        if (feature['feature']['properties']['selected']) {
            // Change attribute
            var attNeue = e.id;
            var attOld = attNeue.substr(0, attNeue.indexOf('-'));
            var oldValue = feature['feature']['properties'][attOld];
            var newValue = e.value;
            if ((newValue != oldValue) && (newValue != "")) {
                feature['feature']['properties'][attNeue] = e.value;
            } else {
                feature['feature']['properties'][attNeue] = null;
            }
            // Change style
            if ((newValue != oldValue) && (newValue != "")) {
                feature.setStyle(changed());
            } else {
                feature.setStyle(notChanged());
            }
        }
    });
}

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

/// 
/// IN CASE WE NEED IT
///

/*
// Add layers from file
var json = (function() {
    var json = null;
    $.ajax({
      'async': false,
      'global': false,
      'url': "data/layers.geojson",
      'dataType': "json",
      'success': function(data) {
          json = data;
      }
    });
    return json;
})();


// Make test request
$('#test').click(function() {

    var answer = null;
    $.ajax({
      'async': false,
      'global': false,
      'url': "src/status-with-features.xml",
      'dataType': "text",
      'success': function(response) {
          answer = response;
      }
    });
    if (status.includes('href=')) {
        console.log('nope');
    } else {
        var statusFeatures = answer.split('<![CDATA[').pop().split(']]>')[0];
        console.log(statusFeatures);
        var json = JSON.parse(statusFeatures);
        console.log(json);
        var testlayer = L.Proj.geoJson(json).addTo(map);
    }
})
*/




