$(function() {
    var cloudmade = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    var map = L.map('map',{zoom: 15}).addLayer(cloudmade);
    var osmGeocoder = new L.Control.OSMGeocoder();
    map.addControl(osmGeocoder);
    map.addControl( L.control.zoom({position: 'bottomright'}) );

    var markers = new L.MarkerClusterGroup({ maxClusterRadius: 1 });
    $("#commentDialog").dialog({ autoOpen: false, modal: true, buttons: [ { text: "Cancel", click: function() { $(this).dialog("close"); } }, { text: "Submit", click: submitFlag } ] });
    $("#deleteDialog").dialog({ autoOpen: false, modal: true, buttons: [ { text: "Cancel", click: function() { $(this).dialog("close"); } }, { text: "Submit", click: submitDelete } ] });
    $(".ui-icon").text("X");
    var listRetrieved = false;
    var videoList = [];
    var activeVideo = {}
/**
    var requestURL = 'http://localhost:8081/AIDRTrainerAPI/rest/drone/jsonp/getdrones';
    $.ajax({
            type: 'GET',
            url: requestURL,
            dataType: 'jsonp',
            success: renderList,
            error: FailedRenderList,
            jsonp: false,
            jsonpCallback: "jsonp"
        });
**/
    var autoGeoRefresh = setInterval(function() { // Call out to get the time
        var requestURL = "http://st1.uaviators.org/drone/rest/web/jsonp/getdrones" //'http://gis.micromappers.org/drone/rest/web/jsonp/getdrones';
        if (typeof indexID != 'undefined')
            requestURL = 'http://st1.uaviators.org/drone/rest/web/jsonp/drones/after/' + indexID; //'http://gis.micromappers.org/drone/rest/web/jsonp/drones/after/'

        $.ajax({
            type: 'GET',
            url: requestURL,
            dataType: 'jsonp',
            timeout: 4000,
            success: renderList,
            error: failedRenderList,
            jsonp: false,
            jsonpCallback: "jsonp",
        });
    }, 5000);// end check

    function renderList(data) {
        var dataCount = 0;
        listRetrieved = true;
        $("#loading-gif").remove();
        $("#loading-failure").remove();

        $.each(data, function(i, field) {
            video = {
            	vidId: field.info.id, 
            	email: null, 
            	url: field.info.url, 
            	name: field.info.displayName, 
            	lat: field.features.geometry.coordinates[1], 
            	lng: field.features.geometry.coordinates[0] }
            videoList.push(video);
            mapDataCollection.push(field);
            dataCount++;
        });

        if (dataCount > 0) {
            displayAllRow(data);
            populateMakers();
            map.addLayer(markers);
            map.fitBounds(markers.getBounds());
        }
    }

    function populateMakers(){
        for (var i in mapDataCollection) {
            var item = mapDataCollection[i];
            if (!checkDuplicateEntry(item.info.url)){
                 var layName = L.geoJson(item.features, {
                    onEachFeature: function (features, layer) {
                        indexID = item.info.id;

                        layer.on("click", function (e) {
                        	var url = getSelectedLayerURL(layer);
                            var src = getSrcUrl(url);
                            $("#uavVideo").attr('src', src);
                            window.location.href='#uavOpenModal';
                            activeVideo.vidId = getSelectedLayerID(layer);
                            activeVideo.name = getSelectedLayerName(layer);
                            activeVideo.email = getSelectedLayerEmail(layer);
                            activeVideo.url = url;
                            activeVideo.lng = getSelectedLayerCoordinates(layer)[0];
                            activeVideo.lat = getSelectedLayerCoordinates(layer)[1];
                        });
                        geoLayerCollection.push( new layerInfo(layer, item.info.url, item.info.displayName, item.info.id, item.info.email, item.features.geometry.coordinates) ) ;
                    }
                });
                markers.addLayer(layName);
            }
        }
    }

    function displayAllRow(data){
        $.each(data, function(i, field){

            if(!checkDuplicateEntry(field.info.url)){
                var displayTxt = '<a href="#uavOpenModal">';
                displayTxt =  displayTxt + '<p class="displayName"><b>'+ field.info.displayName +'</b></p>';
                displayTxt =  displayTxt + '<p>'+ field.info.created +'</p></a>';

                var hiddenURL = '<input name="uavVideURL" class="uavVideURL" email="' + field.info.email + '" type="hidden" value = "'+ field.info.url +'"/>';
                var hiddenLat = '<input name="uavCoords" class="uavLat" type="hidden" value="'+ field.features.geometry.coordinates[1] +'"/>';
                var hiddenLng = '<input name="uavCoords" class="uavLng" type="hidden" value="'+ field.features.geometry.coordinates[0] +'"/>';
                var liContent = displayTxt + hiddenURL + hiddenLat + hiddenLng;
                $( "#tweetList" ).prepend($("<li class='ui-widget-content' name='" + field.info.id + "'></li>").html(liContent));
                $("#tweetList li").unbind("click").click(function(evt) {
                    // console.log("clicker!!!");
                    // var answer = $(evt.currentTarget).text();
                    // var answer2 =$(evt.currentTarget).children('#uavVideURL');
                    var url = $(evt.currentTarget).children('.uavVideURL').attr('value');
                    var src = getSrcUrl(url);
                    $("#uavVideo").attr('src', src);
                    activeVideo.vidId = $(evt.currentTarget).attr('name');
                    activeVideo.name = $(evt.currentTarget).find('.displayName').text();
                    activeVideo.lng = $(evt.currentTarget).find('.uavLng').val();
                    activeVideo.lat = $(evt.currentTarget).find('.uavLat').val();
                    activeVideo.email = $(evt.currentTarget).children('.uavVideURL').attr('email');
                    activeVideo.url = url;
                    //var vid =  $(this).attr("uavVideURL");
                    // console.log($(evt.currentTarget));
                    // console.log(this);
                    // usersid =  $(this).attr("uavVideoID");
                });
            }
         });
    }

    function getSrcUrl(origUrl) {
        if (origUrl.match(/youtube/)) {
            var vid = origUrl.match(/v=([^&]+)/)[1];
            return "http://www.youtube.com/embed/" + vid + "?autoplay=1&showinfo=1&controls=1";
        } else if (origUrl.match(/vimeo/)) {
            var vid = origUrl.substr(17);
            return "http://player.vimeo.com/video/" + vid;
        }
        return origUrl;
    }

    function failedRenderList(jqXHR, textStatus) {
        $("#loading-gif").remove();
        if (!listRetrieved & !$("#loading-failure").length)
            $("body").append("<div id='loading-failure'><h1>Sorry, couldn't retrieve drone videos. The server appears to be down, please come back later.</h1></div>");
    }

    $("#submit").click(function(e) {
        if (hasAllRequiredFields()){
            e.preventDefault();
            var email = $("input#email").val();
            var vURL = $("input#vURL").val();
            var info = new Object();
            info.email = email;
            info.url = vURL;

            var data = new Object();
            data.features = geoInfoProperty;
            data.info = info;
            if ($("input#vId").length)
          		data.id = $("input#vId").val();

            var myString = JSON.stringify(data);
            var urlPost = $("#uavInfo").attr('action');

            $.post( urlPost, myString );
            window.location.href='#close';
        }
    });

    $("#flag-btn").click(reportVideo);
    $("#edit-btn").click(editVideo);
    $("#delete-btn").click(deleteVideoConfirm);

    function reportVideo() {
        $("#commentDialog .error").remove();
        $("#commentDialog #flagComment").val("");
        $("#commentDialog").dialog("open");
    }

    function submitFlag() {
        var comment = $("#commentDialog #flagComment").val();
        if (comment == "" || comment == undefined) {
            $("#commentDialog label").after("<div class='error'>You must add a comment</div>");
        } else {
            jsonData = JSON.stringify({ "id": activeVideo.vidId, "comment": comment });
            $.post("http://st1.uaviators.org/drone/rest/report/post", jsonData);
           // $.post("http://qcricl1linuxvm2.cloudapp.net:8081/AIDRDRONE/rest/report/post", jsonData);
            $("#commentDialog").dialog("close");
            $("#commentDialog #flagComment").val("");
        }
    }

    function editVideo() {
    	$("#uavVideo").attr('src', '');
    	window.location.href='#close';

    	window.location.href='#openModal';
    	$("#openModal #locationRef").val(activeVideo.name);
    	$("#openModal .existingEmail").show();
    	$("#openModal #vURL").val(activeVideo.url);
    	$("#openModal #lon").text(activeVideo.lng);
    	$("#openModal #lat").text(activeVideo.lat);

    	damageLayer.removeAllFeatures();
    	var lonLat = new OpenLayers.LonLat(activeVideo.lng, activeVideo.lat)
            .transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                tinyMap.getProjectionObject() // to Spherical Mercator Projection
            );
    	point = new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat);
        damageLayer.addFeatures([new OpenLayers.Feature.Vector(point)]);
        tinyMap.setCenter(lonLat,5);

        $("#uavInfo").append("<input id='vId' type='hidden' value='" + activeVideo.vidId + "'></input>")
       // $("#uavInfo").attr('action', "http://qcricl1linuxvm2.cloudapp.net:8081/AIDRDRONE/rest/web/update");
        $("#uavInfo").attr('action', "http://st1.uaviators.org/drone/rest/web/update");
    }

    function deleteVideoConfirm() {
        $("#deleteDialog .error").remove();
        $("#deleteDialog input").val("").show();
        $("#deleteDialog label").show();
        $("#deleteDialog").dialog( "option", "buttons", [ { text: "Cancel", click: function() { $(this).dialog("close"); } }, { text: "Submit", click: submitDelete } ] );
        $("#deleteDialog").dialog("open");
    }

    function submitDelete() {
        var email = $("#deleteDialog input").val();
        jsonData = JSON.stringify({ "id": activeVideo.vidId, "email": email });
	$.post("http://st1.uaviators.org/drone/rest/web/jsonp/delete/" + activeVideo.vidId + "/" + email, jsonData)
                .success(function() {
                    $("#deleteDialog").dialog("close");
                    $("#tweetList li[name=" + activeVideo.vidId + "]").remove();
                    window.location.href='#close';
                })
                .fail(function() {
                    $("#deleteDialog label").after("<div class='error'>Sorry, unable to delete video. Please make sure you used the same email to submit the video.</div>");
                    $("#deleteDialog label").hide();
                    $("#deleteDialog input").hide();
                    $("#deleteDialog").dialog( "option", "buttons", [ { text: "Cancel", click: function() { $(this).dialog("close"); } } ] );
                });
    }

    function hasAllRequiredFields(){
        var email = $("input#email").val();
        var vURL = $("input#vURL").val();
        if (email == "" || email.length < 5 || geoInfoProperty == "" || typeof geoInfoProperty == 'undefined' || vURL == "" || vURL.length < 5)
            return false;

        return true;
    }

    function checkDuplicateEntry(newVideoURL){
        for( var i in geoLayerCollection) {
            if (geoLayerCollection[i].url == newVideoURL)
                return  true;
        }
        return false;
    }

    function layerInfo(layer, vURL, name, id, email, coordinates) {
        this.layer=layer;
        this.url = vURL;
        this.name = name;
        this.id = id;
        this.email = email;
        this.coordinates = coordinates;
    }

    function getSelectedLayerURL(layer) {
        for( var i in geoLayerCollection){
            var item = geoLayerCollection[i];
            if(item.layer == layer)
                return item.url;
        }
    }

    function getSelectedLayerID(layer){
        for( var i in geoLayerCollection){
            var item = geoLayerCollection[i];
            if(item.layer == layer)
                return item.id;
        }
    }

    function getSelectedLayerName(layer){
        for( var i in geoLayerCollection){
            var item = geoLayerCollection[i];
            if(item.layer == layer) {
                return item.name;
            }
        }
    }

    function getSelectedLayerEmail(layer){
        for( var i in geoLayerCollection){
            var item = geoLayerCollection[i];
            if(item.layer == layer)
                return item.email;
        }
    }

    function getSelectedLayerCoordinates(layer) {
        for( var i in geoLayerCollection){
            var item = geoLayerCollection[i];
            if(item.layer == layer)
                return item.coordinates;
        }
    }

    $("#agree").change(function() {
        if ($(this).is(":checked"))
            $("#submit").removeAttr('disabled');
        else
            $("#submit").attr('disabled','disabled');
    });

    $('#newUAV').click(function() {
    	$("#openModal #locationRef").val("");
    	$("#openModal #vURL").val("");
    	$("#openModal .existingEmail").hide();

    	$("#uavInfo #vId").remove();
        $("#uavInfo").attr('action', "http://qcricl1linuxvm2.cloudapp.net:8081/AIDRDRONE/rest/web/add");
    });
});
