-- Migration 010: Security hardening + auto-profile trigger

-- 1. Fix mutable search_path: vans_within_radius
CREATE OR REPLACE FUNCTION vans_within_radius(
  user_lat      float8,
  user_lng      float8,
  radius_metres float8 DEFAULT 10000
)
RETURNS SETOF vans
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
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

-- 2. Fix mutable search_path: sync_van_location
CREATE OR REPLACE FUNCTION sync_van_location()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
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

-- 3. Revoke anon/authenticated execute on PostGIS internal functions
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text)                FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text)          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM anon, authenticated;

-- 4. RLS policy for proximity_notifications (service role only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'proximity_notifications'
      AND policyname = 'service_role_only'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "service_role_only"
        ON public.proximity_notifications
        AS RESTRICTIVE FOR ALL
        TO authenticated, anon
        USING (false);
    $p$;
  END IF;
END;
$$;

-- 5. Auto-create profile on signup (fixes login bug)
-- Root cause: email-confirmation mode leaves signUp with no session, so the
-- anon client cannot INSERT into profiles (RLS blocks auth.uid() = id).
-- SECURITY DEFINER runs as postgres, bypasses RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();