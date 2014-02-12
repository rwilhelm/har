'use strict';

var API_KEY = 'BC9A493B41014CAABB98F0471D759707'

var map = new L.Map("map", {zoom: 15, minZoom: 10, maxZoom: 18})
	.addLayer(new L.TileLayer("http://{s}.tile.cloudmade.com/" + API_KEY + "/998/256/{z}/{x}/{y}.png"));

var h, g, f, a; // DEBUG global for debugging

d3.json('/' + trip_id + '/gps', function(collection) {
	if (!collection) { console.log("NO GPS DATA!"); return };
	var gps = collection;
	g = gps; // DEBUG global

	d3.json('/' + trip_id + '/har', function(collection) {
		if (!collection) { console.log("NO HAR DATA!"); return };
		var har = collection;
		h = har; // DEBUG global

		// prepare feature collection (see geoJSON spec)
		var fc = {
			"type": "FeatureCollection",
			"features": []
		};
		f = fc; // DEBUG global

		// compute har tags and populate FeatureCollection
		var n = 0;
		for (var i=0; i<gps.length; i++) {
			var t0 = gps[i].ts;
			var g0 = gps[i].lonlat.coordinates; // array

			 // only if there is one more gps entry
			if (gps[i+1]) {
				var t1 = gps[i+1].ts;
				var g1 = gps[i+1].lonlat.coordinates; // array

				// calculate the most popular tag between t0 and t1
				var topActivity = getMaxOccurrence(har.map(function(d) {
					if (d.ts >= t0 && d.ts <= t1) { // get tags between t0 and t1
						return d.tag.replace(/\"/g, "") // remove quotes
					}}).filter(function(d) { return d })); // remove undefined
			}

			// prev is defined after first loop iteration
			if (prev && topActivity == prev.properties.activity) {
				// if there is a previous feature with the same activity, push some values there
				prev.geometry.coordinates.push(g1);
				prev.properties.t1 = t1; // FIXME wrong timestamp
				prev.properties.distance += calculateDistance(g0, g1);
				prev.properties.duration += moment.duration(t1-t0);
			} else {
				// create a new feature
				fc.features.push({
					"type": "Feature",
					"geometry": {
						"type": "LineString",
						"coordinates": [ g0, g1 ] // coordinates is an array of arrays
					},
					"properties": {
						"id": trip_id,
						"n": n,
						"t0": t0,
						"t1": t1, // FIXME wrong timestamp
						"activity": topActivity,
						"duration": moment.duration(t1-t0),
						"distance": calculateDistance(g0, g1),
						"speed": null
					}
				});
				n++;
			}

			// feature of current loop iteration
			var cur = fc.features[fc.features.length-1];

			// calculate speed afterwards, because we nee distance and duration and don't want to compute them twice
			cur.properties.speed = Math.round(((cur.properties.distance) / (cur.properties.duration*1000)) *60*60*1000*100) / 100;

			// save current feature for next loop iteration
			var prev = cur;
		}

		// FIXME wrap in function
		var activities = fc.features.map(function(d) { return d.properties.activity })
		activities[activities.indexOf(null)] = "unknown"; // change null to "unknown"
		activities = activities.sort().filter(function(el,i,a) { if (i == a.indexOf(el)) return 1; return 0 }); // sort unique
		activities.filter(function(n) { return n }); // remove undefined

		// returns activities in a manually sorted order
		function sortActivities(activities) {
			var a = ["running", "walking", "standing", "sitting", "on table", "unknown"];
			return a.map(function(d) { return activities[activities.indexOf(d)] });
		}

		function getColor(d) {
			switch (d) {
				case 'walking':  return "#E0BC0B"; // yellow
				case 'running':  return "#F60100"; // red
				case 'standing': return "#222222"; // green
				case 'sitting':  return "#666666"; // blue
				case 'on table': return "#999999"; // grey
				case 'unknown': return "#ff00ff"; // grey
				case null: return "#ff00ff"; // grey
			}
		}

		function style(feature) {
			return {
				weight: 8,
				opacity: 0.5,
				color: getColor(feature.properties.activity),
			};
		}

		function highlightFeature(e) {
			var layer = e.target;

			layer.setStyle({
				weight: 10,
				opacity: 0.8
			});

			if (!L.Browser.ie && !L.Browser.opera) {
				layer.bringToFront();
			}
		}

		// Create and add a legend
		$('#legend').append(function(map) {
			var div = L.DomUtil.create('div', 'info legend leaflet-bar', this.legend);

			// sort activities before generating legend
			var a = sortActivities(activities).filter(function(n) { return n });

			for (var i = 0; i < a.length; i++) {
				div.innerHTML += '<i style="background:' + getColor(a[i]) + '"></i>' + a[i] + '<br>';
			}
			return div;
		});

		function resetHighlight(e) {
			geoJson.resetStyle(e.target);
		}

		function onEachFeature(feature, layer) {
			// Create a popup for each feature
			if (feature.properties) {
				var popupString = '<div class="popup">';
				for (var k in feature.properties) {
					var v = feature.properties[k];
					(k == 't0' || k == 't1') ? v = moment.unix(parseInt(v)).utc().format("HH:mm:ss") : null;
					(k == 'distance') ? v = Math.round(v*100, 12) / 100 + " m" : null;
					(k == 'duration') ? v = moment.duration(v).humanize() : null;
					(k == 'speed') ? v = v + ' km/h' : null;
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

		// Draw geoJSON object to map
		var geoJson = L.geoJson(fc, {
			style: style,
			onEachFeature: onEachFeature
		}).addTo(map);

		// Zoom map to fit our route
		map.fitBounds(geoJson.getBounds());

	// HELPERS

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

	function calculateDistance(a, b) {
		return gju.pointDistance({type: 'Point', coordinates: a}, {type: 'Point', coordinates: b})
	}

	//END d3_har
	});
//END d3_gps
});
