var API_KEY = 'BC9A493B41014CAABB98F0471D759707'

var map = new L.Map("map", {minZoom: 12, maxZoom: 24})
    .addLayer(new L.TileLayer("http://{s}.tile.cloudmade.com/" + API_KEY + "/998/256/{z}/{x}/{y}.png"));

// Query the sensor_gps table to get the route
d3.json('/' + trip_id + '/gps', function(collection) {
	if (!collection) { console.log("NO GPS DATA!"); return };

	var geoJson = collection[0].row_to_json;
	var geoJsonLayer = L.geoJson(geoJson);

	// Zoom map to fit our route
	map.fitBounds(geoJsonLayer.getBounds());

	// Query the har_annotation table to get the activity tags
	d3.json('/' + trip_id + '/har', function(collection) {
		if (!collection) { console.log("NO HAR DATA!"); return };

		for (var i=0; i<geoJson.features.length; i++) {
			if (geoJson.features[i+1] !== undefined) {
				var t0 = geoJson.features[i].properties.ts;
				var t1 = geoJson.features[i+1].properties.ts;
				var a = [];
				// Get all activities matching a feature/between two timestamps
				collection.map(function(d) { if (d.ts > t0 && d.ts < t1) { a.push(d.tag) } })
				// Save the most occuring activity to the feature properties
				geoJson.features[i].properties.activity = getMaxOccurrence(a);
			}
		}

		// Add our geoJSON object to the map
		L.geoJson(geoJson, {
			// Colorize different activities
			style: function(feature) {
				switch (feature.properties.activity) {
					case 'standing': return {color: "#0DFB8F"}; // green
					case 'walking': return {color: "#E0BC0B"}; // yellow
					case 'running': return {color: "#F60100"}; // red
					case 'sitting': return {color: "#6B82E0"}; // blue
					case 'on table': return {color: "#333333"}; // grey
				}
			},
			// Create a popup for each feature
			onEachFeature: function (feature, layer) {
				if (feature.properties) {
					var popupString = '<div class="popup">';
					for (var k in feature.properties) {
						var v = feature.properties[k];
						popupString += k + ': ' + v + '<br />';
					}
					popupString += '</div>';
					layer.bindPopup(popupString, {
						maxHeight: 200
					});
				}
			}
		}).addTo(map);

	//END d3_har
	});

	// Helper function to get the array element with the most occurences. Used
	// for majority voting to apply activity tags to features.
	// http://stackoverflow.com/a/1053865/220472
	function getMaxOccurrence(array) {
    if(array.length == 0)
    	return null;
    var modeMap = {};
    var maxEl = array[0], maxCount = 1;
    for(var i = 0; i < array.length; i++)
    {
    	var el = array[i];
    	if(modeMap[el] == null)
    		modeMap[el] = 1;
    	else
    		modeMap[el]++;
    	if(modeMap[el] > maxCount)
    	{
    		maxEl = el;
    		maxCount = modeMap[el];
    	}
    }
    return maxEl;
	}

//END d3_gps
});
