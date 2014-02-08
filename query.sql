-- Same query as in server.js
-- psql -U postgres liveandgov -f query.sql | \grep '{' | jq '.'
-- Replace the 177 with $1 before you put it into server.js

SELECT row_to_json(fc) FROM (
	SELECT 'FeatureCollection' AS type,
	array_to_json(array_agg(f)) AS features FROM (
		SELECT 'Feature' AS type,
		ST_AsGeoJSON(ST_MakeLine(geom::geometry, geom2::geometry))::json AS geometry,
		row_to_json((SELECT l FROM (SELECT trip_id as id, ts) AS l)) AS properties FROM (
			SELECT trip_id, ts, lonlat as geom, lead(lonlat) OVER w AS geom2 FROM
				sensor_gps WHERE trip_id = 177
				WINDOW w AS (PARTITION BY trip_id ORDER BY ts)
		) AS q WHERE geom2 IS NOT NULL
	) AS f
) AS fc;
