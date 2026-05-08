-- Dev seed data — run after migrations in development only
-- supabase db reset  (runs migrations then this file)

-- NOTE: Replace UUIDs with real auth.users IDs created via Supabase Studio
--       or via `supabase auth admin create-user` CLI.

-- Seed a van operator profile (must exist in auth.users first)
INSERT INTO profiles (id, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dave the Van Man', 'van_operator'),
  ('00000000-0000-0000-0000-000000000002', 'Alice Customer', 'customer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO van_operators (id, profile_id, business_name, subscription_tier) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Dave Ice Cream', 'pro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vans (id, operator_id, van_name, registration, is_available, current_lat, current_lng) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Mr Whippy', 'WEZ1ICV', true, 53.7483, -2.7006)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (van_id, name, description, price_gbp, is_available) VALUES
  ('20000000-0000-0000-0000-000000000001', '99 Flake', 'Classic Mr Whippy with a Cadbury Flake', 2.50, true),
  ('20000000-0000-0000-0000-000000000001', 'Strawberry Split', 'Strawberry and vanilla split lolly', 1.80, true),
  ('20000000-0000-0000-0000-000000000001', 'Choc Ice', 'Vanilla ice cream coated in milk chocolate', 2.20, true),
  ('20000000-0000-0000-0000-000000000001', 'Raspberry Ripple', 'Soft serve with raspberry sauce', 2.40, true);

INSERT INTO route_stops (van_id, stop_order, street_name, postcode, lat, lng, eta, route_date) VALUES
  ('20000000-0000-0000-0000-000000000001', 1, 'Preston Road', 'PR1 4AA', 53.7632, -2.7044, '14:00', CURRENT_DATE),
  ('20000000-0000-0000-0000-000000000001', 2, 'Coronation Street', 'PR1 5BB', 53.7581, -2.6980, '14:30', CURRENT_DATE),
  ('20000000-0000-0000-0000-000000000001', 3, 'Victoria Park', 'PR1 6CC', 53.7520, -2.6920, '15:00', CURRENT_DATE);
