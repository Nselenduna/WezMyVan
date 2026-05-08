-- Migration 007: order_items
-- Immutable line items. unit_price_gbp is snapshotted at order time so menu
-- price changes never retroactively affect existing orders.

CREATE TABLE order_items (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id         uuid REFERENCES orders NOT NULL,
  menu_item_id     uuid REFERENCES menu_items NOT NULL,
  quantity         integer NOT NULL CHECK (quantity > 0),
  unit_price_gbp   numeric(6,2) NOT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can read order items for orders they can see.
CREATE POLICY "Users read own order items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid()
         OR van_id IN (
           SELECT v.id FROM vans v
           JOIN van_operators vo ON vo.id = v.operator_id
           WHERE vo.profile_id = auth.uid()
         )
    )
  );

-- Only Edge Functions (service role) insert order items.
-- No direct INSERT policy for authenticated users — price is set server-side.
