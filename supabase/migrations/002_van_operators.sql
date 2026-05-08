-- Migration 002: van_operators
-- Business account record linked to a van_operator profile.

CREATE TABLE van_operators (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id          uuid REFERENCES profiles NOT NULL,
  business_name       text NOT NULL,
  stripe_account_id   text,          -- Stripe Connect Express account ID
  revenuecat_user_id  text,          -- RevenueCat customer ID
  subscription_tier   text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  is_verified         boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE van_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Van operators manage own record"
  ON van_operators FOR ALL
  USING (profile_id = auth.uid());
