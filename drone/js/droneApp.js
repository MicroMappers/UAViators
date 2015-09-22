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

    var webUrl = 'http://st1.uaviators.org/drone'; // production
    //var webUrl = 'http://qa.map.uaviators.org/drone'; // test server
    //var webUrl = 'http://localhost:8080/MMDRONE'; //local



  function fetchDroneList(){
    var requestURL = webUrl + "/rest/web/jsonp/getdrones"
      if (typeof indexID != 'undefined')
          requestURL = webUrl + '/rest/web/jsonp/drones/after/' + indexID; //'http://gis.micromappers.org/drone/rest/web/jsonp/drones/after/'
      $.ajax({
          type: 'GET',
          url: requestURL,
          dataType: 'jsonp',
          timeout: 20000,
          success: renderList,
          error: failedRenderList,
          jsonp: false,
          jsonpCallback: "jsonp",
      });
  }
    //fetch Drone list First time
    fetchDroneList();

    //refreshing data in every 40 seconds
    var autoGeoRefresh = setInterval(function() { // Call out to get the time
      fetchDroneList();
    }, 40000);// end check



    function renderList(data) {
        var dataCount = 0;
        listRetrieved = true;
        $("#loading-gif").hide();
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
    var currentItem = -1;
    function populateMakers(){
        for (var i in mapDataCollection) {
            var item = mapDataCollection[i];
            if (!checkDuplicateEntry(item.info.url)){
                 var layName = L.geoJson(item.features, {
                    onEachFeature: function (features, layer) {
                        indexID = item.info.id;
                        layer.index = i;
                        layer.on("click", function (e) {
                          currentItem = i;

                        	var url = getSelectedLayerURL(layer);
                            populateVideo(url, layer.index);
                            window.location.href='#uavOpenModal';
                            activeVideo.vidId = getSelectedLayerID(layer);
                            activeVideo.name = getSelectedLayerName(layer);
                            activeVideo.email = getSelectedLayerEmail(layer);
                            activeVideo.url = url;
                            activeVideo.lng = getSelectedLayerCoordinates(layer)[0];
                            activeVideo.lat = getSelectedLayerCoordinates(layer)[1];
                            activeVideo.index = layer.index;
                        });
                        geoLayerCollection.push( new layerInfo(layer, item.info.url, item.info.displayName, item.info.id, item.info.email, item.features.geometry.coordinates, item) ) ;
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
                var hiddenIndex = '<input name="index" class="index" type="hidden" value="'+ i +'"/>';
                var liContent = displayTxt + hiddenURL + hiddenLat + hiddenLng + hiddenIndex;
                $( "#tweetList" ).prepend($("<li class='ui-widget-content' name='" + field.info.id + "'></li>").html(liContent));
                $("#tweetList li").unbind("click").click(function(evt) {
                    // console.log("clicker!!!");
                    // var answer = $(evt.currentTarget).text();
                    // var answer2 =$(evt.currentTarget).children('#uavVideURL');
                    var url = $(evt.currentTarget).children('.uavVideURL').attr('value');
                    populateVideo(url, $(evt.currentTarget).find('.index').val());
                    activeVideo.vidId = $(evt.currentTarget).attr('name');
                    activeVideo.name = $(evt.currentTarget).find('.displayName').text();
                    activeVideo.lng = $(evt.currentTarget).find('.uavLng').val();
                    activeVideo.lat = $(evt.currentTarget).find('.uavLat').val();
                    activeVideo.email = $(evt.currentTarget).children('.uavVideURL').attr('email');
                    activeVideo.url = url;
                    activeVideo.index = $(evt.currentTarget).find('.index').val();

                    //var vid =  $(this).attr("uavVideURL");
                    // console.log($(evt.currentTarget));
                    // console.log(this);
                    // usersid =  $(this).attr("uavVideoID");
                });
            }
         });
    }

    diasterImg = $("#diasterImg");
    $("#zoom-in").click(function(e) {
      diasterImg.css({
          width: diasterImg.width() + 30,
          height: diasterImg.height() + 30
      });
      $("#zoom-out").show();
      e.preventDefault();
    });

    $("#zoom-out").click(function(e) {
      if(diasterImg.width() > 680){
        diasterImg.css({
            width: diasterImg.width(function(i, w) {
                return w - 30;
            }),
            height: diasterImg.height(function(i, w) {
                return w - 30;
            })
        });
      } else {
        $("#zoom-out").hide();
      }
      e.preventDefault();
    });

    function getContentType(origUrl) {
      var content = "image";
        if (origUrl.match(/youtube/)) {
          content = "video";
        } else if (origUrl.match(/vimeo/)) {
          content = "video";
        } else if (origUrl.endsWith('.mp4') || origUrl.endsWith('.MP4')){
          content = "video";
        }
        return content;
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
        $("#loading-gif").hide();
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
          		data.id = parseInt($("input#vId").val());

            var myString = JSON.stringify(data);
            var urlPost = $("#uavInfo").attr('action');

            $.post( urlPost, myString ).success(function() {
                if ($("input#vId").length) {
                    $("#tweetList li[name=" + activeVideo.vidId + "]").remove();
                    deleteSelectedMarker(activeVideo.vidId);
                }
            });
            window.location.href='#close';
        }
    });

    $("#flag-btn").click(reportVideo);
    $("#edit-btn").click(editVideo);
    $("#delete-btn").click(deleteVideoConfirm);
    $("#prev-btn").click(prevVideo);
    $("#next-btn").click(nextVideo);

    function nextVideo(){
      currentIndex = activeVideo.index;
      if(currentIndex > 0){
        currentIndex--
        navigateVideo();
      }
    }

    function prevVideo(){
      currentIndex = activeVideo.index;
      if(currentIndex < mapDataCollection.length-1){
        currentIndex++
        navigateVideo();
      }
    }

    function populateVideo(url, index){
      var contentType = getContentType(url);
      var src = getSrcUrl(url);
      $("#uavVideo").attr('src', '');
      $("#diasterImg").attr('src', '');
      if(contentType == "video"){
        $("#uavVideo").attr('src', src);
        $("#uavVideo").show();
        $("#diasterImg").hide();
        $("#zoom-in").hide();
        $("#zoom-out").hide();
      }else{
        $("#diasterImg").attr('src', src);
        $("#uavVideo").hide();
        $("#diasterImg").show();
        $("#zoom-in").show();
        $("#zoom-out").hide();
      }

      $("#prev-btn").show();
      $("#next-btn").show();
      if(index == 0){
        $("#next-btn").hide();
      }else if(index == mapDataCollection.length-1){
        $("#prev-btn").hide();
      }
    }

    function navigateVideo(){
      var tempData = mapDataCollection[currentIndex];

      var url = tempData.info.url;
      populateVideo(url, currentIndex);
      activeVideo.vidId = tempData.info.id;
      activeVideo.name = tempData.info.displayName;
      activeVideo.lng = tempData.features.geometry.coordinates[0];
      activeVideo.lat = tempData.features.geometry.coordinates[1];
      activeVideo.email = tempData.info.email;
      activeVideo.url = url;
      activeVideo.index = currentIndex;
    }

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
            jsonData = JSON.stringify({ "id": parseInt(activeVideo.vidId), "comment": comment });
            $.post(webUrl + "/rest/report/post", jsonData);
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
        $("#uavInfo").attr('action', webUrl + "/rest/web/update");
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
        if (email && email != "") {
            jsonData = JSON.stringify({ "id": parseInt(activeVideo.vidId), "email": email });

            $.post(webUrl + "/rest/web/jsonp/delete/" + activeVideo.vidId + "/" + email, jsonData, function(data, response) {
                $("#deleteDialog").dialog("close");
                $("#tweetList li[name=" + activeVideo.vidId + "]").remove();
                deleteSelectedMarker(activeVideo.vidId);
                window.location.href='#close';
            }).fail(function(response) {
              temp = response.responseText;
              if(JSON.parse(temp.substring(6,temp.length - 2)).status == 200){
                  $("#deleteDialog").dialog("close");
                  $("#tweetList li[name=" + activeVideo.vidId + "]").remove();
                  deleteSelectedMarker(activeVideo.vidId);
                  window.location.href='#close';
              }else{
                  $("#deleteDialog label").after("<div class='error'>Sorry, unable to delete video. Please make sure you used the same email to submit the video.</div>");
                  $("#deleteDialog label").hide();
                  $("#deleteDialog input").hide();
                  $("#deleteDialog").dialog( "option", "buttons", [ { text: "Cancel", click: function() { $(this).dialog("close"); } } ] );
              }
            });
        } else
            $("#deleteDialog label").after("<div class='error'>You must enter an email address.</div>");
    }

    function deleteSelectedMarker(id) {
        for (var i in geoLayerCollection) {
            var layer = geoLayerCollection[i];
            if (layer.id == id) {
                map.removeLayer(layer.layer);
                geoLayerCollection.splice(geoLayerCollection.indexOf(layer), 1);
                mapDataCollection.splice(mapDataCollection.indexOf(layer.dataSource), 1);
            }
        }
        return false;
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

    function layerInfo(layer, vURL, name, id, email, coordinates, dataSource) {
        this.layer=layer;
        this.url = vURL;
        this.name = name;
        this.id = id;
        this.email = email;
        this.coordinates = coordinates;
        this.dataSource = dataSource;
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
      $("#uavInfo").attr('action', webUrl + "/rest/web/add");
    });

    $('#subscribe-btn').click(function() {
      //$("#subscribeModal").show();
      document.getElementById("subscribeForm").reset();
    });

    function userSubscribedSuccess(){
      $("#loading-gif").hide();
      alert("You are now subscribed at UAViators Map.");
      window.location.href = '#close';
      //$("#subscribeModal").hide();
    }
    function userSubscribedError(){
      $("#loading-gif").hide();
      alert("You already subscribed at UAViators Map.");
    }

    $( "#subscribeForm" ).submit(function( event ) {
      $("#loading-gif").show();
      $.ajax({
          type: 'POST',
          url: webUrl + "/rest/user/subscribe",
          dataType: 'json',
          data: {
            name: $("#subscribe_name").val(),
            email: $("#subscribe_email").val(),
            preference: $("input[name=preference]:checked").val()
          },
          timeout: 20000,
          success: function(msg){
              userSubscribedSuccess();
          },
          error: function(XMLHttpRequest, textStatus, errorThrown) {
            userSubscribedError();
          }
      });

      event.preventDefault();
    });

});
