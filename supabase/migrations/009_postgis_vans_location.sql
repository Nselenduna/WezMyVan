-- FIX #9: Replace B-tree lat/lng index with PostGIS geography column + GIST index
-- Before: B-tree index on (current_lat, current_lng) requires full table scan for proximity
-- After:  PostGIS GIST index answers ST_DWithin proximity queries with a single indexed op

-- Step 1: Enable PostGIS (available on all Supabase projects)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Add a geography column to vans (populated automatically from lat/lng)
ALTER TABLE vans ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Step 3: Backfill existing rows
UPDATE vans
SET location = ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)::geography
WHERE current_lat IS NOT NULL AND current_lng IS NOT NULL;

-- Step 4: GIST spatial index — used by ST_DWithin, available vans only
CREATE INDEX IF NOT EXISTS vans_location_gist_idx
  ON vans USING GIST (location)
  WHERE is_available = true;

-- Step 5: Drop the old B-tree index if it exists
DROP INDEX IF EXISTS vans_location_idx;

-- Step 6: Trigger to keep location in sync whenever lat/lng are updated
CREATE OR REPLACE FUNCTION sync_van_location()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_lat IS NOT NULL AND NEW.current_lng IS NOT NULL THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(NEW.current_lng, NEW.current_lat), 4326
    )::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS van_location_sync ON vans;
CREATE TRIGGER van_location_sync
  BEFORE INSERT OR UPDATE OF current_lat, current_lng
  ON vans
  FOR EACH ROW
  EXECUTE FUNCTION sync_van_location();

-- Step 7: RPC function for server-side proximity query
-- Call from Supabase JS client: supabase.rpc('vans_within_radius', { user_lat, user_lng, radius_metres })
CREATE OR REPLACE FUNCTION vans_within_radius(
  user_lat      float8,
  user_lng      float8,
  radius_metres float8 DEFAULT 10000
)
RETURNS SETOF vans
LANGUAGE sql STABLE AS $$
  SELECT *
  FROM   vans
  WHERE  is_available = true
    AND  location IS NOT NULL
    AND  ST_DWithin(
           location,
           ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
           radius_metres
         );
$$;
