/// 
/// MAP
///

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

// Read request file template
var requestFile = "src/request4_store.xml";
var requestHttp = new JKL.ParseXML.Text(requestFile);
var requestData = requestHttp.parse();
// WPS Url
var requestUrl = 'https://wps.livinglab-essigfabrik.online/wps?service=WPS&amp;version=1.0.0&amp;request=Execute';
// Empty variables to store request information
var status = 'status';
var geoJson = null;
var wegeLayer = L.Proj.geoJson(false, {onEachFeature: onclick}).addTo(map);

function getBbox() {
    /// Calculate map bounding box ///
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
    // Round to 1 decimal place
    var swLngProj = swCornerProj.x.toFixed(1);
    var swLatProj = swCornerProj.y.toFixed(1);
    var neLngProj = neCornerProj.x.toFixed(1);
    var neLatProj = neCornerProj.y.toFixed(1);
    // Final bbox
    var bbox = swLngProj + ',' + swLatProj + ',' + neLngProj + ',' + neLatProj;
    
    return bbox;
}

/*
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

// When button is clicked, make request
$('#request-exe').click(function() {
    var t0 = performance.now()

    // First clear variables, in case an old request was made
    status = 'status';
    geoJson = null;
    wegeLayer.clearLayers();

    var bbox = getBbox();
    // Replace bounding boxes
    var sendRequest = requestData.replace(/502584.3,5757482.8,513527.9,5766634.9/g, bbox);

    var ajax = $.ajax({
        type: 'POST',
        url: requestUrl,
        data: sendRequest,
        dataType: 'text',
        success : function (response) {
            // Get status url from the response
            var statusUrl = response.split('statusLocation="').pop().split('"')[0];
            // Check status every X seconds, until it is succeeded
            while (!status.includes("ProcessSucceeded")) {
                setTimeout(getStatus(statusUrl), 3000);
            }
            // When succeeded, check if features are in the response or in a link
            if (status.includes('href=')) {

                var t1 = performance.now();
                console.log("Call to load roads took " + ((t1 - t0)/1000) + " seconds.");

                // If link, get Url
                var geojsonUrl = status.split('href="').pop().split('"')[0];
                // Request features and add to 
                getGeojson(geojsonUrl);
                addGeojson();


            } else {
                // If they're in response, parse and add to layer
                var statusFeatures = status.split('<![CDATA[').pop().split(']]>')[0];
                geoJson = JSON.parse(statusFeatures);
                addGeojson();
            }
        },
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
        }
    });
})

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
    geoJson = answer;
};

// Function to add result features into map
function addGeojson(url) {

    wegeLayer.addData(geoJson);

    wegeLayer.eachLayer(function(feature) {
        var type = feature['feature']['properties']['WEGKAT'];
        feature.setStyle({
            color: styles[type],
            weight: 2,
            opacity: 1,
        })
    });

}

// Layer Styles
var styles = {'a': '#d8000a', 'b': '#03bebe', 'c': '#ffb41d', 'd': '#51ad37', 'e': '#153dcf', 'f':'#f343eb', 'i': '#51ad37'};

/*
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
*/

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

/*
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
*/

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




