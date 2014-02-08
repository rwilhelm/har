var express = require('express');
var app = express();

var db = require('pg');

app.set('port', process.env.PORT || 3000);
app.set('views', ('views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.static('public'));
app.use(app.router); // put below static!

if ('development' == app.get('env')) {
	app.use(express.logger('dev'));
	app.use(express.errorHandler());
}

function gps(params, body, callback) {
	db.connect("pg://postgres:liveandgov@localhost/liveandgov", function(err, client, done) {
		var statement = {
			text: "SELECT row_to_json(fc) FROM (SELECT 'FeatureCollection' AS type, array_to_json(array_agg(f)) AS features FROM (SELECT 'Feature' AS type, ST_AsGeoJSON(ST_MakeLine(geom::geometry, geom2::geometry))::json AS geometry, row_to_json((SELECT l FROM (SELECT trip_id as id, ts) AS l)) AS properties FROM (SELECT trip_id, ts, lonlat as geom,	lead(lonlat) OVER w AS geom2 FROM sensor_gps WHERE trip_id = $1 WINDOW w AS (PARTITION BY trip_id ORDER BY ts) ) AS q WHERE geom2 IS NOT NULL ) AS f ) AS fc",
			values: [params.trip_id]
		};

		if (err) { console.error(err); return; }

		client.query(statement, function(err, result) {
			done();
			if (err) { console.error(err); return; }
			callback(err, result.rows);
		});
	});
}

app.get('/:trip_id/gps', function(req, res, next) {
	gps(req.params, req.query, function(err, data) {
		if (err) { res.send(err); console.error(err); return; }
		res.json(data);
	});
});

app.get('/:trip_id', function(req, res, next) {
	res.render('har', {trip_id: req.params.trip_id});
});

app.listen(app.get('port'));
