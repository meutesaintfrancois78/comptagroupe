-- ==============================================================================
-- MIGRATION COMPLÉMENTAIRE SÉCURITÉ (suite de 20261109000000_audit_fixes_complete)
-- Idempotente : peut être rejouée sans effet de bord.
-- À exécuter APRÈS 20261109000000, dans l'éditeur SQL Supabase.
-- ==============================================================================

-- 1. TRIGGERS DE PROTECTION : ne s'appliquent qu'aux appels venant de l'appli
--    (auth.uid() renseigné). Sans cela, toute maintenance depuis l'éditeur SQL
--    ou le service role (auth.uid() NULL, donc is_admin() faux) est refusée.

CREATE OR REPLACE FUNCTION public.protect_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier le rôle d''un compte.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier le statut d''un compte.';
    END IF;
    IF NEW.primary_unit_id IS DISTINCT FROM OLD.primary_unit_id OR
       NEW.secondary_unit_id IS DISTINCT FROM OLD.secondary_unit_id THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier les unités rattachées. Utilisez la demande de changement d''unité.';
    END IF;
    -- L'email affiché vient de auth.users : un chef ne peut pas le maquiller
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Interdit : L''email du profil ne se modifie pas ici.';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_expense_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF OLD.reimbursement_status = 'reimbursed' THEN
      RAISE EXCEPTION 'Interdit : Une dépense déjà remboursée ne peut plus être modifiée par un chef d''unité.';
    END IF;
    IF NEW.unit_id IS DISTINCT FROM OLD.unit_id THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut réassigner l''unité d''une dépense.';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Interdit : Impossible de modifier le créateur de la dépense.';
    END IF;
    IF NEW.period_id IS DISTINCT FROM OLD.period_id THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier la période d''une dépense.';
    END IF;
    IF NEW.reimbursement_status = 'reimbursed' THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut marquer une dépense comme remboursée.';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. INSERTION D'UNE DÉPENSE PAR UN CHEF : statut de remboursement et auteur imposés
--    (le trigger précédent ne couvrait que UPDATE).
CREATE OR REPLACE FUNCTION public.protect_expense_inserts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.created_by := auth.uid();
    NEW.reimbursement_status := CASE
      WHEN NEW.payment_method = 'personal_money' THEN 'pending'::reimbursement_status
      ELSE 'not_applicable'::reimbursement_status
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_expense_inserts ON public.expenses;
CREATE TRIGGER trg_protect_expense_inserts
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.protect_expense_inserts();

-- 3. CRÉATION DE PROFIL CÔTÉ CLIENT : toujours chef en attente
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role = 'chef'
    AND status = 'pending'
  );

-- 4. STOCKAGE DES JUSTIFICATIFS : cloisonné par unité
--    Chemin attendu : <unit_id>/<fichier>. Les fichiers déposés à la racine du
--    bucket (anciens jeux de test) ne restent visibles que des admins.
--    NB : pas d'ALTER TABLE storage.objects ici, la table appartient au rôle
--    système du stockage et la RLS y est déjà active.

CREATE OR REPLACE FUNCTION public.my_unit_ids_text()
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public AS $$
  SELECT primary_unit_id::text FROM public.profiles
  WHERE id = auth.uid() AND primary_unit_id IS NOT NULL
  UNION
  SELECT secondary_unit_id::text FROM public.profiles
  WHERE id = auth.uid() AND secondary_unit_id IS NOT NULL;
$$;

DROP POLICY IF EXISTS "receipts_insert_policy" ON storage.objects;
CREATE POLICY "receipts_insert_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.get_my_status() = 'active'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] IN (SELECT public.my_unit_ids_text())
    )
  );

DROP POLICY IF EXISTS "receipts_select_policy" ON storage.objects;
CREATE POLICY "receipts_select_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      public.is_admin()
      OR (
        public.get_my_status() = 'active'
        AND (storage.foldername(name))[1] IN (SELECT public.my_unit_ids_text())
      )
    )
  );

DROP POLICY IF EXISTS "receipts_delete_policy" ON storage.objects;
CREATE POLICY "receipts_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND public.is_admin());
