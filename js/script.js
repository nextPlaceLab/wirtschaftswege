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
    minZoom: 6
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

//Geocoder
var osmGeocoder = new L.Control.Geocoder({
    collapsed: true,
    position: 'topleft',
    text: 'Suche',
    title: 'Suche'
}).addTo(map);



// Default projection to convert from
proj4.defs('EPSG:25832','+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

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
//var wegeLayer = L.Proj.geoJson(json, {onEachFeature: onclick}).addTo(map);
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
                L.control()
            } else {
                feature.setStyle(hide());
            }
        }
    })
  });
});


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




