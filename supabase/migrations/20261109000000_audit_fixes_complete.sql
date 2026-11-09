-- ==============================================================================
-- MIGRATION CONSOLIDÉE AUDIT COMPLET : STORAGE RLS, PROFILS, EMAIL, EXPENSES
-- Groupe Saint-Martin - Compta Scoute
-- ==============================================================================

-- 1. EXTENSIONS ET SCHÉMA STORAGE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bucket de justificatifs privé
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Politiques RLS sur storage.objects pour le bucket receipts
-- RLS déjà active sur storage.objects ; l'ALTER échoue (« must be owner of table objects ») et bloque tout le script.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipts_insert_policy" ON storage.objects;
CREATE POLICY "receipts_insert_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "receipts_select_policy" ON storage.objects;
CREATE POLICY "receipts_select_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "receipts_delete_policy" ON storage.objects;
CREATE POLICY "receipts_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND public.is_admin());

-- 2. TABLE DES PROFILS : AJOUT COLONNES EMAIL & DEMANDE D'UNITÉ
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_unit_id UUID REFERENCES public.units(id);

-- Synchronisation des emails depuis auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email != u.email);

-- 3. RLS SUR PUBLIC.PROFILES
-- Permettre la lecture des profils à tout membre connecté actif (nécessaire pour afficher le créateur sur les dépenses)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    id = auth.uid() OR 
    public.get_my_status() = 'active'
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Trigger de protection renforcé sur profiles
CREATE OR REPLACE FUNCTION public.protect_profile_updates()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Un utilisateur non-admin ne peut jamais modifier son rôle, son statut, ou ses unités directement
    IF NEW.role != OLD.role THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier le rôle d''un compte.';
    END IF;
    IF NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier le statut d''un compte.';
    END IF;
    IF NEW.primary_unit_id IS DISTINCT FROM OLD.primary_unit_id OR 
       NEW.secondary_unit_id IS DISTINCT FROM OLD.secondary_unit_id THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier les unités rattachées. Utilisez la demande de changement d''unité.';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_updates ON public.profiles;
CREATE TRIGGER trg_protect_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_updates();

-- 4. TRIGGER SÉCURISÉ D'INSCRIPTION SUR AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth AS $$
DECLARE
  v_role user_role := 'chef';
  v_status account_status := 'pending';
BEGIN
  -- Seuls les administrateurs initiaux désignés reçoivent le rôle admin par défaut
  IF new.email IN ('ben.dupont@groupe-enf.fr', 'admin.dupont@groupe-enf.fr') THEN
    v_role := 'admin';
    v_status := 'active';
  END IF;

  INSERT INTO public.profiles (
    id, 
    email,
    first_name, 
    last_name, 
    role, 
    status, 
    primary_unit_id
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(NULLIF(new.raw_user_meta_data->>'first_name', ''), 'Chef'),
    COALESCE(NULLIF(new.raw_user_meta_data->>'last_name', ''), 'Scout'),
    v_role,
    v_status,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'primary_unit_id', '')::uuid,
      (SELECT id FROM public.units ORDER BY name LIMIT 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. SÉCURISATION DES DÉPENSES (EXPENSES)
CREATE OR REPLACE FUNCTION public.protect_expense_updates()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Dépense déjà remboursée : non modifiable par un chef
    IF OLD.reimbursement_status = 'reimbursed' THEN
      RAISE EXCEPTION 'Interdit : Une dépense déjà remboursée ne peut plus être modifiée par un chef d''unité.';
    END IF;

    -- Interdiction de changer l'unité ou le créateur ou la période
    IF NEW.unit_id != OLD.unit_id THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut réassigner l''unité d''une dépense.';
    END IF;
    IF NEW.created_by != OLD.created_by THEN
      RAISE EXCEPTION 'Interdit : Impossible de modifier le créateur de la dépense.';
    END IF;
    IF NEW.period_id != OLD.period_id THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier la période d''une dépense.';
    END IF;

    -- Interdiction pour un chef de marquer une dépense comme remboursée
    IF NEW.reimbursement_status = 'reimbursed' AND OLD.reimbursement_status != 'reimbursed' THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut marquer une dépense comme remboursée.';
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_expense_updates ON public.expenses;
CREATE TRIGGER trg_protect_expense_updates
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.protect_expense_updates();

-- 6. NETTOYAGE DES DONNÉES DE TEST & DOUBLONS
-- Suppression de la dépense de test de l'audit
DELETE FROM public.expenses WHERE comment LIKE '%=1+1 TEST audit Claude%';

-- Suppression des profils orphelins (sans compte auth valide correspondant)
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);
