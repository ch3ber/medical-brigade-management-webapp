-- =====================================================================
-- Auto-create profile on auth.users insert
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- Helper functions used by RLS policies. SECURITY DEFINER so they can
-- look up profiles/brigade_members without recursive RLS.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'PLATFORM_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_brigade_member(target_brigade UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.brigade_members m
    WHERE m.brigade_id = target_brigade
      AND m.profile_id = auth.uid()
      AND m.accepted_at IS NOT NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.brigades b
    WHERE b.id = target_brigade
      AND b.created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.brigade_role(target_brigade UUID)
RETURNS "BrigadeRole"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.brigades
      WHERE id = target_brigade AND created_by = auth.uid()
    ) THEN 'DIRECTOR'::"BrigadeRole"
    ELSE (
      SELECT role FROM public.brigade_members
      WHERE brigade_id = target_brigade
        AND profile_id = auth.uid()
        AND accepted_at IS NOT NULL
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_brigade_director(target_brigade UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.brigade_role(target_brigade) = 'DIRECTOR'::"BrigadeRole";
$$;

CREATE OR REPLACE FUNCTION public.is_brigade_director_or_co(target_brigade UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.brigade_role(target_brigade) IN ('DIRECTOR'::"BrigadeRole", 'CO_DIRECTOR'::"BrigadeRole");
$$;
