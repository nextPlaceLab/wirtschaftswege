/// 
/// MAP
///

// Initiate map
var map = L.map('map', {
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

//
// Barplott
//

//// Data for Barplott
$('#sumup').click(function() { //Button
    console.log("test")
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

/*     wegeLayer.eachLayer(function(feature) {
        var laenge = feature['feature']['properties']['LAENGE'];
        // console.log(laenge);
        sum_all = sum_all + laenge
    });
    console.log(sum_all); // 100% */


    //
    wegeLayer.eachLayer(function(feature) {
        var kat = feature['feature']['properties']['WEGKAT'];
        var laenge = feature['feature']['properties']['LAENGE'];
        //console.log(kat); 
        switch (kat) {
          case "a":
            console.log("kategorie a");
            console.log(laenge);
            sum_kat_a = sum_kat_a + laenge;
            break;
          case "b":
            console.log("kategorie b");
            sum_kat_b = sum_kat_b + laenge;
            break;
          case "c":
            console.log("kategorie c");
            sum_kat_c = sum_kat_c + laenge;
            break;
          case "d":
            console.log("kategorie d");
            sum_kat_d = sum_kat_d + laenge;
            break;
          case "e":
            console.log("kategorie e");
            sum_kat_e = sum_kat_e + laenge;
            break;
          case "f":
            console.log("kategorie f");
            sum_kat_f = sum_kat_f + laenge;
            break;
          case "g":
            console.log("kategorie g");
            sum_kat_g = sum_kat_g + laenge;
            break;
          case "h":
            console.log("kategorie h");
            sum_kat_h = sum_kat_h + laenge;
            break;
          case "i":
            console.log("kategorie i");
            sum_kat_i = sum_kat_i + laenge;
            break;
          default:
            console.log("Unkategorisiert");
            sum_rest = sum_rest + laenge;
        }

       
    });

    console.log("kategorie a");
    console.log(sum_kat_a);

    console.log("kategorie b");
    console.log(sum_kat_b);

    console.log("kategorie c");
    console.log(sum_kat_c);

    console.log("kategorie d");
    console.log(sum_kat_d);

    console.log("kategorie e");
    console.log(sum_kat_e);

    console.log("kategorie f");
    console.log(sum_kat_f);

    console.log("kategorie g");
    console.log(sum_kat_g);

    console.log("kategorie h");
    console.log(sum_kat_h);

    console.log("kategorie i");
    console.log(sum_kat_i);

    console.log("Unkategorisiert");
    console.log(sum_rest);

//// Create a Data Set



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
 ]; */
 

 var data1 = [
    {group: "A", value: 5252},
    {group: "B", value: 52152},
    {group: "C", value: 48946},
    {group: "D", value: 65488},
    {group: "E", value: 3216},
    {group: "F", value: 0},
    {group: "G", value: 4536456},
    {group: "H", value: 2345},
    {group: "I", value: 0},
    {group: "Rest", value: 0}
 ];

 // create 2 data_set

 
 var data2 = [
    {group: "A", value: 7},
    {group: "B", value: 1},
    {group: "C", value: 20},
    {group: "D", value: 10}
 ];
 
 // set the dimensions and margins of the graph
 var margin = {top: 30, right: 30, bottom: 70, left: 60},
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
 
 // Initialize the X axis
 var x = d3.scaleBand()
   .range([ 0, width ])
   .padding(0.2);
 var xAxis = svg.append("g")
   .attr("transform", "translate(0," + height + ")")
 
 // Initialize the Y axis
 var y = d3.scaleLinear()
   .range([ height, 0]);
 var yAxis = svg.append("g")
   .attr("class", "myYaxis")
 
 
 // A function that create / update the plot for a given variable:
 function update(data) {
 
   // Update the X axis
   x.domain(data.map(function(d) { return d.group; }))
   xAxis.call(d3.axisBottom(x))
 
   // Update the Y axis
   y.domain([0, d3.max(data, function(d) { return d.value }) ]);
   yAxis.transition().duration(1000).call(d3.axisLeft(y));
 
   // Create the u variable
   var u = svg.selectAll("rect")
     .data(data)
 
   u
     .enter()
     .append("rect") // Add a new rect for each new elements
     .merge(u) // get the already existing elements as well
     .transition() // and apply changes to all of them
     .duration(1000)
       .attr("x", function(d) { return x(d.group); })
       .attr("y", function(d) { return y(d.value); })
       .attr("width", x.bandwidth())
       .attr("height", function(d) { return height - y(d.value); })
       .attr("fill", "#69b3a2")
 
   // If less group in the new dataset, I delete the ones not in use anymore
   u
     .exit()
     .remove()
 }
 
 // Initialize the plot with the first dataset
 update(data1)


 

});




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




