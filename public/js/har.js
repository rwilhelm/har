var API_KEY = 'BC9A493B41014CAABB98F0471D759707'

var map = new L.Map("map", {minZoom: 12, maxZoom: 16})
    .addLayer(new L.TileLayer("http://{s}.tile.cloudmade.com/" + API_KEY + "/998/256/{z}/{x}/{y}.png"));

d3.json('/' + trip_id + '/gps', function(collection) {
	if (!collection) { console.log("NO DATA!"); return };

	var geoJson = collection[0].row_to_json;
	var geoJsonLayer = L.geoJson(geoJson);

	map.fitBounds(geoJsonLayer.getBounds());

	L.geoJson(geoJson, {
		style: function(feature) {
			switch (feature.properties.activity) {
				case 'standing': return {color: "#0000ff"};
				case 'walking': return {color: "#00ff00"};
				case 'running': return {color: "#ff0000"};
				case 'sitting': return {color: "#00ffff"};
				case 'on table': return {color: "#ff00ff"};
				default: console.log("No Activity for _ts_");
			}
		},
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

//END
});
