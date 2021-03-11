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

// Table content
function attributes(feature, layer) {
    var tableContent = '<table border="0" rules="groups"><thead><tr><th>Wegenummer: </th><th>' + (feature.properties['STS'] !== null ? autolinker.link(feature.properties['STS'].toLocaleString()) : '') + '</th></tr></thead><tr>\
            <tr>\
                <th scope="row">Straßenname: </th>\
                <td>' + (feature.properties['NAM'] !== null ? autolinker.link(feature.properties['NAM'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <th scope="row">Wegekategorie: </th>\
                <td>' + (feature.properties['WEGKAT'] !== null ? autolinker.link(feature.properties['WEGKAT'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <th scope="row">Alternative Wegekat.: </th>\
                <td>' + (feature.properties['WEGKAT-ALT'] !== null ? autolinker.link(feature.properties['WEGKAT-ALT'].toLocaleString()) : '') + '</td>\
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
                <th scope="row">Priorität: </th>\
                <td>' + (feature.properties['PRIO'] !== null ? autolinker.link(feature.properties['PRIO'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <th scope="row">Handlungsempfehlung: </th>\
                <td>' + (feature.properties['HANDL'] !== null ? autolinker.link(feature.properties['HANDL'].toLocaleString()) : '') + '</td>\
            </tr>\
        </table>';
}

// Onclick selection

