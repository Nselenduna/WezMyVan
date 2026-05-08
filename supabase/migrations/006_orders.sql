-- Migration 006: orders
-- Financial fields (total_gbp, commission_gbp) are immutable after insert —
-- enforced by RLS: no UPDATE on those columns for any authenticated user.

CREATE TABLE orders (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id         uuid REFERENCES profiles NOT NULL,
  van_id              uuid REFERENCES vans NOT NULL,
  stop_id             uuid REFERENCES route_stops NOT NULL,
  status              text DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','en_route','ready','collected','rejected','refunded')),
  total_gbp           numeric(8,2) NOT NULL,
  commission_gbp      numeric(8,2) NOT NULL,
  stripe_payment_id   text,
  rejected_at         timestamptz,
  collected_at        timestamptz,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers can read their own orders.
CREATE POLICY "Customers read own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can insert new orders (price calculated server-side in Edge Function).
CREATE POLICY "Customers insert own orders"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Van operators can read orders for their vans.
CREATE POLICY "Van operators read own van orders"
  ON orders FOR SELECT
  USING (
    van_id IN (
      SELECT v.id FROM vans v
      JOIN van_operators vo ON vo.id = v.operator_id
      WHERE vo.profile_id = auth.uid()
    )
  );

-- Van operators can update status only (not financial fields).
CREATE POLICY "Van operators update order status"
  ON orders FOR UPDATE
  USING (
    van_id IN (
      SELECT v.id FROM vans v
      JOIN van_operators vo ON vo.id = v.operator_id
      WHERE vo.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    total_gbp = (SELECT total_gbp FROM orders WHERE id = orders.id) AND
    commission_gbp = (SELECT commission_gbp FROM orders WHERE id = orders.id)
  );
