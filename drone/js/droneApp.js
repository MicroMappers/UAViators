$(function()
{

    var cloudmade = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    var map = L.map('map',{zoom: 15}).addLayer(cloudmade);
    var osmGeocoder = new L.Control.OSMGeocoder();
    map.addControl(osmGeocoder);
    map.addControl( L.control.zoom({position: 'bottomright'}) );

    var markers = new L.MarkerClusterGroup({maxClusterRadius:1});
    $("#commentDialog").dialog({ autoOpen: false, modal: true, buttons: [ { text: "Cancel", click: function() { $(this).dialog("close"); } }, { text: "Submit", click: submitFlag } ] });
    $("#deleteDialog").dialog({ autoOpen: false, modal: true, buttons: [ { text: "Cancel", click: function() { $(this).dialog("close"); } }, { text: "Submit", click: submitDelete } ] });
    $(".ui-icon").text("X");
    var listRetrieved = false;
    var openVidId = null;
    var openVidEmail = null;
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

    var autoGeoRefresh = setInterval(
                function ()  // Call out to get the time
                {
                    var requestURL = "http://qcricl1linuxvm2.cloudapp.net:8081/AIDRDRONE/rest/web/jsonp/getdrones" //'http://gis.micromappers.org/drone/rest/web/jsonp/getdrones';
                    if(typeof indexID != 'undefined' ){
                        requestURL = 'http://qcricl1linuxvm2.cloudapp.net:8081/AIDRDRONE/rest/web/jsonp/drones/after/' + indexID; //'http://gis.micromappers.org/drone/rest/web/jsonp/drones/after/'
                    }

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
        $.each(data, function(i, field){
            // alert(field.info.email);
            field.info.email = 'david@spatialcollective.com';

            dataCount++;
            geoDatColection.push( field );
            mapDataCollection = geoDatColection;
        });

        if(dataCount > 0){
            displayAllRow(data);
            populateMakers();
            map.addLayer(markers);
            map.fitBounds(markers.getBounds());
        }
    }

    function populateMakers(){
        for( var i in mapDataCollection){
            var item = mapDataCollection[i];
            if(!checkDuplicateEntry(item.info.url)){
                 var layName = L.geoJson(item.features, {
                    onEachFeature: function (features, layer) {
                        indexID = item.info.id;

                        layer.on("click", function (e){
                            var src = getSrcUrl(getSelectedLayerURL(layer));
                            $("#uavVideo").attr('src', src);
                            window.location.href='#uavOpenModal';
                            openVidId = getSelectedLayerID(layer);
                            openVidEmail = getSelectedLayerEmail(layer);
                        });
                        geoLayerCollection.push( new layerInfo(layer, item.info.url, item.info.id, item.info.email) ) ;
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
                displayTxt =  displayTxt + '<p><b>'+ field.info.displayName +'</b></p>';
                displayTxt =  displayTxt + '<p>'+ field.info.created +'</p></a>';

                var hiddenURL = '<input name = "uavVideURL" id="uavVideURL" email="' + field.info.email + '" type="hidden" value = "'+ field.info.url +'"/>';
                displayTxt = displayTxt + hiddenURL;
                $( "#tweetList" ).prepend($("<li class='ui-widget-content' name='" + field.info.id + "'></li>").html(displayTxt));
                $("#tweetList li").unbind("click").click(function(evt) {
                    // console.log("clicker!!!");
                    // var answer = $(evt.currentTarget).text();
                    // var answer2 =$(evt.currentTarget).children('#uavVideURL');
                    var src = getSrcUrl($(evt.currentTarget).children('#uavVideURL').attr('value'));
                    $("#uavVideo").attr('src', src);
                    openVidId = $(evt.currentTarget).attr('name');
                    openVidEmail = $(evt.currentTarget).children('#uavVideURL').attr('email');
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
            //console.log(email);
            //console.log(vURL);
            //console.log(geoInfoProperty);
           //$('#submit').text('Request has been sent. Thank you!');
           // $('input[type="submit"]').attr('disabled','disabled');
           // alert(geoInfoProperty);
           // $("#testForm").submit();

            var info = new Object();
            info.email = email;
            info.url = vURL;

            var data = new Object();
            data.features = geoInfoProperty;
            data.info = info;

            var myString = JSON.stringify(data);
           // myString = "jsonp(" + myString + ");"
           // console.log("myString: " + myString);
            var urlPost = "http://qcricl1linuxvm2.cloudapp.net:8081/AIDRDRONE/rest/web/add";


            $.post( urlPost, myString );
            //$('#submit').text('Request has been sent. Thank you!');
            //$('#submit').attr('disabled','disabled');
            window.location.href='#close';
        }
    });

    $("#flag-btn").click(reportVideo);
    $("#delete-btn").click(deleteVideoConfirm);

    function reportVideo() {
        $("#commentDialog .error").remove();
        $("#commentDialog").dialog("open");
    }

    function deleteVideoConfirm() {
        $("#deleteDialog .error").remove();
        $("#deleteDialog input").val("").show();
        $("#deleteDialog label").show();
        $("#deleteDialog").dialog( "option", "buttons", [ { text: "Cancel", click: function() { $(this).dialog("close"); } }, { text: "Submit", click: submitDelete } ] );
        $("#deleteDialog").dialog("open");
    }

    function submitFlag() {
        var comment = $("#commentDialog #flagComment").val();
        if (comment == "" || comment == undefined) {
            $("#commentDialog label").after("<div class='error'>You must add a comment</div>");
        } else {
            jsonData = JSON.stringify({ "id": openVidId, "comment": comment });
            $.post("http://qcricl1linuxvm2.cloudapp.net:8081/AIDRDRONE/rest/report/post", jsonData);
            $("#commentDialog").dialog("close");
            $("#commentDialog #flagComment").val("");
        }
    }

    function submitDelete() {
        var email = $("#deleteDialog input").val();
        if (true) { // email == openVidEmail
            jsonData = JSON.stringify({ "id": openVidId, "email": email });
            $.post("http://qcricl1linuxvm2.cloudapp.net:8081/AIDRDRONE/rest/web/jsonp/delete/" + openVidId + "/" + email, jsonData, function(data, response) {
                alert(response);
            });
            $("#deleteDialog").dialog("close");
            $("#tweetList li[name=" + openVidId + "]").remove();
            window.location.href='#close';
        } else {
            $("#deleteDialog label").after("<div class='error'>That email is not correct.</div>");
            $("#deleteDialog label").hide();
            $("#deleteDialog input").hide();
            $("#deleteDialog").dialog( "option", "buttons", [ { text: "Cancel", click: function() { $(this).dialog("close"); } } ] );
        }
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

    function layerInfo(layer, vURL, id, email) {
        this.layer=layer;
        this.url = vURL;
        this.id = id;
        this.email = email;
    }

    function getSelectedLayerURL(layer) {
        for( var i in geoLayerCollection){
            var item = geoLayerCollection[i];
            if(item.layer == layer){
                return item.url;
            }
        }
    }

    function getSelectedLayerID(layer){
        for( var i in geoLayerCollection){
            var item = geoLayerCollection[i];
            if(item.layer == layer){
                return item.id;
            }
        }
    }

    function getSelectedLayerEmail(layer){
        for( var i in geoLayerCollection){
            var item = geoLayerCollection[i];
            if(item.layer == layer){
                return item.email;
            }
        }
    }

    $("#agree").change(function() {
        if ($(this).is(":checked"))
            $("#submit").removeAttr('disabled');
        else
            $("#submit").attr('disabled','disabled');
    });
});
