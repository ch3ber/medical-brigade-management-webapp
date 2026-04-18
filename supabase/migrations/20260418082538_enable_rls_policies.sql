-- =====================================================================
-- Enable RLS on every table
-- =====================================================================
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brigades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brigade_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos          ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- profiles
-- =====================================================================
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT into profiles is performed only by the on_auth_user_created trigger
-- (SECURITY DEFINER). No direct INSERT policy is granted to clients.
-- DELETE is never allowed.

-- =====================================================================
-- brigades
-- =====================================================================
CREATE POLICY "brigades_select_member_or_admin"
  ON public.brigades FOR SELECT
  USING (public.is_brigade_member(id) OR public.is_platform_admin());

CREATE POLICY "brigades_insert_authenticated"
  ON public.brigades FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "brigades_update_director_or_co"
  ON public.brigades FOR UPDATE
  USING (public.is_brigade_director_or_co(id) OR public.is_platform_admin())
  WITH CHECK (public.is_brigade_director_or_co(id) OR public.is_platform_admin());

CREATE POLICY "brigades_delete_director"
  ON public.brigades FOR DELETE
  USING (public.is_brigade_director(id) OR public.is_platform_admin());

-- =====================================================================
-- areas
-- =====================================================================
CREATE POLICY "areas_select_member"
  ON public.areas FOR SELECT
  USING (public.is_brigade_member(brigade_id) OR public.is_platform_admin());

CREATE POLICY "areas_insert_director_or_co"
  ON public.areas FOR INSERT
  WITH CHECK (public.is_brigade_director_or_co(brigade_id) OR public.is_platform_admin());

CREATE POLICY "areas_update_director_or_co"
  ON public.areas FOR UPDATE
  USING (public.is_brigade_director_or_co(brigade_id) OR public.is_platform_admin())
  WITH CHECK (public.is_brigade_director_or_co(brigade_id) OR public.is_platform_admin());

CREATE POLICY "areas_delete_director"
  ON public.areas FOR DELETE
  USING (
    (public.is_brigade_director(brigade_id) OR public.is_platform_admin())
    AND NOT EXISTS (SELECT 1 FROM public.turnos t WHERE t.area_id = areas.id)
  );

-- =====================================================================
-- brigade_members
-- =====================================================================
CREATE POLICY "members_select_member"
  ON public.brigade_members FOR SELECT
  USING (public.is_brigade_member(brigade_id) OR public.is_platform_admin());

CREATE POLICY "members_insert_director"
  ON public.brigade_members FOR INSERT
  WITH CHECK (public.is_brigade_director(brigade_id) OR public.is_platform_admin());

CREATE POLICY "members_update_director"
  ON public.brigade_members FOR UPDATE
  USING (public.is_brigade_director(brigade_id) OR public.is_platform_admin())
  WITH CHECK (public.is_brigade_director(brigade_id) OR public.is_platform_admin());

CREATE POLICY "members_delete_director"
  ON public.brigade_members FOR DELETE
  USING (public.is_brigade_director(brigade_id) OR public.is_platform_admin());

-- =====================================================================
-- patients
-- =====================================================================
CREATE POLICY "patients_select_member"
  ON public.patients FOR SELECT
  USING (public.is_brigade_member(brigade_id) OR public.is_platform_admin());

CREATE POLICY "patients_insert_member"
  ON public.patients FOR INSERT
  WITH CHECK (public.is_brigade_member(brigade_id) OR public.is_platform_admin());

CREATE POLICY "patients_update_member"
  ON public.patients FOR UPDATE
  USING (public.is_brigade_member(brigade_id) OR public.is_platform_admin())
  WITH CHECK (public.is_brigade_member(brigade_id) OR public.is_platform_admin());

CREATE POLICY "patients_delete_director"
  ON public.patients FOR DELETE
  USING (public.is_brigade_director(brigade_id) OR public.is_platform_admin());

-- =====================================================================
-- turnos
-- =====================================================================
CREATE POLICY "turnos_select_member"
  ON public.turnos FOR SELECT
  USING (public.is_brigade_member(brigade_id) OR public.is_platform_admin());

CREATE POLICY "turnos_insert_member"
  ON public.turnos FOR INSERT
  WITH CHECK (public.is_brigade_member(brigade_id) OR public.is_platform_admin());

CREATE POLICY "turnos_update_member"
  ON public.turnos FOR UPDATE
  USING (public.is_brigade_member(brigade_id) OR public.is_platform_admin())
  WITH CHECK (public.is_brigade_member(brigade_id) OR public.is_platform_admin());

CREATE POLICY "turnos_delete_director"
  ON public.turnos FOR DELETE
  USING (public.is_brigade_director(brigade_id) OR public.is_platform_admin());
