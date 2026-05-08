-- Migration 005: route_stops
-- Daily route for a van. Orders reference a specific stop_id.
-- route_date defaults to today so operators only need to set stops once per day.

CREATE TABLE route_stops (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  van_id       uuid REFERENCES vans NOT NULL,
  stop_order   integer NOT NULL,
  street_name  text NOT NULL,
  postcode     text NOT NULL,
  lat          float8 NOT NULL,
  lng          float8 NOT NULL,
  eta          time NOT NULL,
  route_date   date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (van_id, route_date, stop_order)
);

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Everyone can read today's route stops (needed for customer ETA display).
CREATE POLICY "Anyone can read route stops"
  ON route_stops FOR SELECT
  USING (true);

-- Van operators manage their own route.
CREATE POLICY "Van operators manage own route"
  ON route_stops FOR ALL
  USING (
    van_id IN (
      SELECT v.id FROM vans v
      JOIN van_operators vo ON vo.id = v.operator_id
      WHERE vo.profile_id = auth.uid()
    )
  );
