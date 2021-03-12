// Initiate map
var map = L.map('map').setView([52.01799,9.03725], 13);

// Set up tile layer
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiYWJqYXJkaW0iLCJhIjoiY2tmZmpyM3d3MGZkdzJ1cXZ3a3kza3BybiJ9.2CgI2GbcJysBRHmh7WwdVA'
}).addTo(map);

// Default projection to convert from
proj4.defs('EPSG:25832','+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

///
/// REQUEST
///

// Calculate map bounding box
var bounds = map.getBounds();
var swLng = bounds.getSouthWest().lng;
var swLat = bounds.getSouthWest().lat;
var neLng = bounds.getNorthEast().lng;
var neLat = bounds.getNorthEast().lat;
// Reproject it
var swCorner = {x: swLng, y: swLat};
var neCorner = {x: neLng, y: neLat};
var swCornerProj = proj4('EPSG:25832', swCorner);
var neCornerProj = proj4('EPSG:25832', neCorner);
// Final bbox
var bbox = swCornerProj.x + ',' + swCornerProj.y + ',' + neCornerProj.x + ',' + neCornerProj.y + ',';

// Read request file
var requestFile = "src/request4_store.xml";
var requestHttp = new JKL.ParseXML(requestFile);
var requestData = requestHttp.parse();
var inputs = requestData['wps:Execute']['wps:DataInputs']['wps:Input'];
// Modify bbox in file
for (var i in inputs) {
    var address = inputs[i]['wps:Reference']['xlink:href'];
    var start = address.split("&bbox=")[0];
    var end = address.split("EPSG")[1];
    var newAddress = start + "&bbox=" + bbox + "EPSG" + end;
    requestData['wps:Execute']['wps:DataInputs']['wps:Input'][i]['wps:Reference']['xlink:href'] = newAddress;
}

var sendRequest = json2xml(requestData, "");

var requestUrl = 'https://wps.livinglab-essigfabrik.online/wps?service=WPS&version=1.0.0&request=Execute';
var capabilitiesUrl = 'https://wps.livinglab-essigfabrik.online/wps?service=wps&request=GetCapabilities';

$('#request-exe').click(function() {
    var ajax = $.ajax({
        type: 'POST',
        url: requestUrl,
        data: sendRequest,
        dataType: 'application/xml',
        success : function (response) {
            console.log(response);
        }
    });
})

$('#request-cap').click(function() {
    var ajax = $.ajax({
        type: 'GET',
        url: capabilitiesUrl,
        dataType: 'application/xml',
        success : function (response) {
            console.log(response);
        }
    });
})

// Layer Styles
var styles = {'a': '#d8000a', 'b': '#03bebe', 'c': '#ffb41d', 'd': '#51ad37', 'e': '#153dcf', 'f':'#f343eb', 'i': '#51ad37'};

// Read geojson with layers
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

// Show attributes on click
// Onclick function
function onclick(feature, layer) {
    layer.on({
        click: attributes
    });
}
// Add atributes function
function attributes(e) {
    //First reset style of all features
    wegeLayer.eachLayer(function(feature) {
        feature.setStyle({
            weight: 2,
        })
    });
    // Then highlight clicked feature
    feature = e.target;
    feature.setStyle({
        weight: 5,
    });
    // Then fill attribute table
    var entries = document.querySelectorAll("td");
    for (var i in entries) {
        var row = entries[i];
        if (row.id != "") {
            row.innerHTML = feature['feature']['properties'][row.id];
        }
    }
}

// Add geojson to map with onclick function
var wegeLayer = L.Proj.geoJson(json, {onEachFeature: onclick}).addTo(map);

// Style features according to layer type
wegeLayer.eachLayer(function(feature) {
    var type = feature['feature']['properties']['WEGKAT'];
    feature.setStyle({
        color: styles[type],
        weight: 2,
        opacity: 1,
    })
});

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
            } else {
                feature.setStyle(hide());
            }
        }
    })
  });
});

// Toggle-Editmode
// Funktion beim laden der Seite aufrufen
window.addEventListener("load", function() {

     // Der ID den Event-Handler 'click' hinzufügen,
     // als Event die Funktion 'toggleModes' aufrufen.
     document.getElementById("editmode").addEventListener("click", toggleModes);
    }
   );
    function toggleModes() {

        if (document.getElementById("editmode").checked) {
        alert('You are now in Edit-Mode');
        // Vielleicht könnte hier ein roter Rahmen um die Karte angezeigt werden?
        } else {
        alert('You are now in View-Mode');

        }
}




