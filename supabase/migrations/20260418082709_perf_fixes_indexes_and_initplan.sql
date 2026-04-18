-- Cover the unindexed foreign keys flagged by Supabase advisor.
CREATE INDEX IF NOT EXISTS "patients_registered_by_idx" ON "patients" ("registered_by");
CREATE INDEX IF NOT EXISTS "turnos_patient_id_idx"      ON "turnos"   ("patient_id");

-- Wrap auth.uid() with (SELECT ...) so the planner evaluates it once
-- per query instead of per row.

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = (SELECT auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "brigades_insert_authenticated" ON public.brigades;
CREATE POLICY "brigades_insert_authenticated"
  ON public.brigades FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND created_by = (SELECT auth.uid()));
