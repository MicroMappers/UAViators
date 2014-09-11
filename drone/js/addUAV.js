
var tinyMap = null;

var point;

var damageLayer;

var cityLayer;

var drawControls = {};


// This function creates the map, the layers, and sets up the map
function initialize() {
    tinyMap = new OpenLayers.Map('map_canvas', {
        controls: [
            new OpenLayers.Control.Navigation(),
            new OpenLayers.Control.PanZoom(),

            new OpenLayers.Control.MousePosition({displayProjection: new OpenLayers.Projection("EPSG:4326")})
            ],
        zoom: 12
    });

    // Layers
    // Open Street Map (default layer)
    tinyMap.addLayer(new OpenLayers.Layer.OSM("Open Street Map"));

    // Icon for the City Marker
    var styleMapCity = new OpenLayers.StyleMap({
        pointRadius: 0
    });

    // Icon for the typhoon/tornado Marker
    var styleDamage = new OpenLayers.StyleMap({
        pointRadius: 15,
        externalGraphic: 'media/images/drone/pin34.png'
    });

    // Layer for placing the city marker
    cityLayer = new OpenLayers.Layer.Vector("City marker", {
        styleMap: styleMapCity
    });
    tinyMap.addLayer(cityLayer);

    // Layer for placing the damage/impact marker
    damageLayer = new OpenLayers.Layer.Vector("Damage/Impact Layer", {
        styleMap: styleDamage
    });
    tinyMap.addLayer(damageLayer);


    disablePoint = function(feature) {
        if ($("#answerbtn").hasClass("disabled")) {
            $("#answerbtn").removeClass('disabled');
        }

        $("#lat").text(feature.geometry.y);
        var tmp = feature.geometry.clone();
        tmp.transform(
                tinyMap.getProjectionObject(), // from Spherical Mercator Projection
                new OpenLayers.Projection("EPSG:4326") // to transform from WGS 1984
        );
        $("#lon").text(tmp.x);
        $("#lat").text(tmp.y);
        toggleControl('point');
    }

    // Default location to load the map
    var lonLat = new OpenLayers.LonLat(-0.1279688 ,51.5077286 )
        .transform(
            new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
            new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
        );

    // Enable drag & drop in the damage/impact Layer
    var drag = new OpenLayers.Control.DragFeature(damageLayer, {
        onComplete: function() {
            var geojson = new OpenLayers.Format.GeoJSON({
                                                           'internalProjection': tinyMap.baseLayer.projection,
                                                           'externalProjection': new OpenLayers.Projection("EPSG:4326")
                                                           });

            var damagePoint = damageLayer.features[0].geometry
            var tmp = damagePoint.clone();
            tmp.transform(
                    tinyMap.getProjectionObject(), // from Spherical Mercator Projection
                    new OpenLayers.Projection("EPSG:4326") // to transform from WGS 1984
            );

            geoInfoProperty = JSON.parse(geojson.write(damageLayer.features[0]));

            $("#lon").text(tmp.x);
            $("#lat").text(tmp.y);

           // alert("loc:" + tmp.x + "  lat" + tmp.y);
        }

    });
    // Add the drag & drop control into the map
    tinyMap.addControl(drag);
    // Activate drag & drop
    drag.activate();

    drawControls = {
        point:      new OpenLayers.Control.DrawFeature(damageLayer, OpenLayers.Handler.Point,
                    { 'featureAdded': disablePoint})
    }

    // Add them to the map
    for (var key in drawControls) {
        tinyMap.addControl(drawControls[key]);
    }

}

// Function to enable/disable the map drawing controls.
// Only one can be active at a time
function toggleControl(control) {
    for (key in drawControls) {
        ctrl = drawControls[key];
        //if (!$("#point").hasClass("disabled")) {
            if ( (control == key) && (!ctrl.active) ) {
                ctrl.activate();
            }
            else {
                ctrl.deactivate();
          //      $("#navigate").addClass("active");
          //      $("#point").addClass("active");
            }
        //}
         ctrl.deactivate();
    }
}

// This function will load the marker of the city, and center the map on it
function search(city) {

    if (city) {
        var place = city;
        $("#searchingError").hide();
    }
    else {
        $("#searching").show();
        $("#searchingError").hide();
        if ($('#locationRef').val()) {
            var place = $("#locationRef").val();
        }
        else {
            $("#searching").hide();
            alert("Please, paste the location city or country to search in the map");
            return
        }
    }

    // Geocode the place using Nominatim OSM service
    $.getJSON('http://nominatim.openstreetmap.org/search/' + place + '?format=json', function(output) {
        if (output.length >= 1) {
            //console.log("Lon: "+ output[0].lon + " Lat: " + output[0].lat);
            // Clean previous markers
            var geojson = new OpenLayers.Format.GeoJSON({
                                                           'internalProjection': tinyMap.baseLayer.projection,
                                                           'externalProjection': new OpenLayers.Projection("EPSG:4326")
                                                           });

            toggleControl('point');
            damageLayer.removeAllFeatures();
            cityLayer.removeAllFeatures();
            $("#answerbtn").addClass("disabled");

            var lonLat = new OpenLayers.LonLat(output[0].lon, output[0].lat)
                .transform(
                    new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                    tinyMap.getProjectionObject() // to Spherical Mercator Projection
                );
            // Set the marker position
            point = new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat);
            damageLayer.addFeatures([new OpenLayers.Feature.Vector(point)]);

            var damagePoint2 = damageLayer.features[0].geometry;
            geoInfoProperty = JSON.parse(geojson.write(damageLayer.features[0]));

            // Center the map
            tinyMap.setCenter(lonLat,5);
            //lonLat.transform(

            $("#lon").text(output[0].lon);
            $("#lat").text(output[0].lat);

            // Only show the messages when looking for user input
            if ($('#locationRef').val()) {
                $("#searching").hide().fadeOut();
                $("#searchingDone").show().fadeIn().delay(2000).fadeOut();
                toggleControl('point');
            }
        }
        else {
            // City not found, sorry
            // Warn the user and try with another place
            $("#searching").hide().fadeOut();
            $("#searchingError").show();
        }
    });
}

initialize();
search("Philippines");


