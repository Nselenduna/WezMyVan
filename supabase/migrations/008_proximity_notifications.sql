-- FIX #4: Persistent deduplication table for proximity-notify Edge Function
-- Before: no dedup table — dedup state lived in-memory and didn't survive cold starts
-- After:  tracks sent notifications per (order, van position) — cold-start safe

CREATE TABLE proximity_notifications (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  van_id        uuid REFERENCES vans(id) ON DELETE CASCADE NOT NULL,
  -- Rounded to 3dp (~110m grid) — prevents duplicate sends without blocking
  -- re-alerts if the van circles back to the same area later
  sent_at_lat   numeric(8, 3) NOT NULL,
  sent_at_lng   numeric(8, 3) NOT NULL,
  sent_at       timestamptz DEFAULT now() NOT NULL,
  UNIQUE (order_id, sent_at_lat, sent_at_lng)
);

-- Edge Function uses service role and bypasses RLS.
-- Customers and van operators have no direct access to this table.
ALTER TABLE proximity_notifications ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup in the Edge Function hot path
CREATE INDEX proximity_notifications_order_idx
  ON proximity_notifications (order_id, sent_at_lat, sent_at_lng);

-- Auto-expire rows older than 24 hours (run via Supabase pg_cron):
-- SELECT cron.schedule('cleanup-proximity-notifications', '0 3 * * *',
--   $$DELETE FROM proximity_notifications WHERE sent_at < now() - interval '24 hours'$$);
