-- Migration 001: profiles
-- Extends auth.users with app-specific fields and role.

CREATE TABLE profiles (
  id              uuid REFERENCES auth.users PRIMARY KEY,
  full_name       text NOT NULL,
  avatar_url      text,
  role            text NOT NULL CHECK (role IN ('customer', 'van_operator')),
  expo_push_token text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id);
