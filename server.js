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
			text: "SELECT ts, ST_AsGeoJSON(lonlat)::json AS lonlat FROM sensor_gps WHERE trip_id = $1",
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

function har(params, body, callback) {
	db.connect("pg://postgres:liveandgov@localhost/liveandgov", function(err, client, done) {
		var statement = {
			text: "SELECT ts, tag FROM har_annotation WHERE trip_id = $1 ORDER BY ts",
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

function trips(params, body, callback) {
	db.connect("pg://postgres:liveandgov@localhost/liveandgov", function(err, client, done) {
		var statement = {
			text: "SELECT * FROM ft_trips ORDER BY trip_id",
			values: []
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

app.get('/:trip_id/har', function(req, res, next) {
	har(req.params, req.query, function(err, data) {
		if (err) { res.send(err); console.error(err); return; }
		res.json(data);
	});
});

app.get('/:trip_id', function(req, res, next) {
	trips(req.params, req.query, function(err, trips) {
		if (err) { res.send(err); console.error(err); return; }
		res.render('har', {trip_id: req.params.trip_id, trips: trips});
	});
});

app.get('/', function(req, res, next) {
	res.redirect('/465');
});

app.listen(app.get('port'));
