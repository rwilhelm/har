var API_KEY = 'BC9A493B41014CAABB98F0471D759707'

var map = new L.Map("map", {zoom: 15, minZoom: 12, maxZoom: 18})
		.addLayer(new L.TileLayer("http://{s}.tile.cloudmade.com/" + API_KEY + "/998/256/{z}/{x}/{y}.png"));

var data;
var activities;

// Query the sensor_gps table to get the route
d3.json('/' + trip_id + '/gps', function(collection) {
	if (!collection) { console.log("NO GPS DATA!"); return };

	var geoJson = data = collection[0].row_to_json;

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

		activities = geoJson.features.map(function(d) { return d.properties.activity })
			.sort().filter(function(el,i,a) { if (i == a.indexOf(el)) return 1; return 0 })
			.filter(function(n) { return n });

		function getColor(d) {
		switch (d) {
				case 'standing': return "#0DFB8F"; // green
				case 'walking':  return "#E0BC0B"; // yellow
				case 'running':  return "#F60100"; // red
				case 'sitting':  return "#6B82E0"; // blue
				case 'on table': return "#333333"; // grey
			}
		}

		function style(feature) {
			return {
				weight: 8,
				opacity: 0.3,
				color: getColor(feature.properties.activity),
			};
		}

		// Called by onEachFeature/layer.on
		function highlightFeature(e) {
			var layer = e.target;

			layer.setStyle({
				weight: 8,
				opacity: 0.7,
				color: '#f00',
			});

			if (!L.Browser.ie && !L.Browser.opera) {
				layer.bringToFront();
			}
		}

		var legend = L.control({position: 'topright'});

		legend.onAdd = function (map) {
			var div = L.DomUtil.create('div', 'info legend leaflet-bar');
			for (var i = 0; i < activities.length; i++) {
				div.innerHTML +=
					'<i style="background:' + getColor(activities[i]) + '"></i>' +
					activities[i] + '<br>';
			}
			return div;
		};

		function resetHighlight(e) {
			geoJson.resetStyle(e.target);
		}

		function onEachFeature(feature, layer) {
			// Create a popup for each feature
			if (feature.properties) {
				var popupString = '<div class="popup">';
				for (var k in feature.properties) {
					var v = feature.properties[k];
					(k == 'ts') ? v = moment.unix(v).format("HH:MM:SS") : null;
					popupString += k + ': ' + v + '<br />';
				}
				popupString += '</div>';
				layer.bindPopup(popupString, {
					maxHeight: 200
				});
			};
			// Highlight feature on mouseover
			layer.on({
				mouseover: highlightFeature,
				mouseout: resetHighlight,
			});
		}

		// Add geoJSON object to the map
		geoJson = L.geoJson(geoJson, {
			style: style,
			onEachFeature: onEachFeature
		}).addTo(map);

		legend.addTo(map);

		// Zoom map to fit our route
		map.fitBounds(geoJson.getBounds());

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
