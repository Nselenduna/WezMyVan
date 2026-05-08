-- Migration 004: menu_items
-- Per-van menu. Prices lock at order time — never mutate price_gbp after order placed.

CREATE TABLE menu_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  van_id        uuid REFERENCES vans NOT NULL,
  name          text NOT NULL,
  description   text,
  price_gbp     numeric(6,2) NOT NULL CHECK (price_gbp > 0),
  image_url     text,
  is_available  boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read available menu items.
CREATE POLICY "Anyone can read available menu items"
  ON menu_items FOR SELECT
  USING (is_available = true);

-- Van operators manage their own menu.
CREATE POLICY "Van operators manage own menu"
  ON menu_items FOR ALL
  USING (
    van_id IN (
      SELECT v.id FROM vans v
      JOIN van_operators vo ON vo.id = v.operator_id
      WHERE vo.profile_id = auth.uid()
    )
  );
