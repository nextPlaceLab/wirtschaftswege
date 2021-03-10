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

// Layer Styles
var styles = {'a': '#d8000a', 'b': '#03bebe', 'c': '#ffb41d', 'd': '#51ad37', 'e': '#153dcf', 'f':'#f343eb', 'g': '#51ad37'};

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

// Add geojson to map
var wegeLayer = L.Proj.geoJson(json).addTo(map);

// Style features according to layer type
wegeLayer.eachLayer(function(feature) {
    var type = feature['feature']['properties']['WEGKAT'];
    feature.setStyle({
        color: styles[type],
        weight: 2,
        opacity: 1,
    })
});