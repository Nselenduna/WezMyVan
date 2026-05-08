-- Migration 003: vans
-- The physical van, its live GPS position, and availability toggle.

CREATE TABLE vans (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id   uuid REFERENCES van_operators NOT NULL,
  van_name      text NOT NULL,
  registration  text,
  jingle_url    text,          -- Supabase Storage URL (Van Pro only)
  is_available  boolean DEFAULT false,
  current_lat   float8,
  current_lng   float8,
  last_ping     timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- Spatial index: only index available vans to keep proximity queries fast.
CREATE INDEX vans_location_idx ON vans (current_lat, current_lng)
  WHERE is_available = true;

ALTER TABLE vans ENABLE ROW LEVEL SECURITY;

-- Customers can read available vans.
CREATE POLICY "Customers can read available vans"
  ON vans FOR SELECT
  USING (is_available = true);

-- Van operators can fully manage their own vans.
CREATE POLICY "Van operators manage own vans"
  ON vans FOR ALL
  USING (
    operator_id IN (
      SELECT id FROM van_operators WHERE profile_id = auth.uid()
    )
  );
