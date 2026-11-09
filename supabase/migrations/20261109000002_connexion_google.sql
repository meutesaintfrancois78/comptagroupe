-- ==============================================================================
-- MIGRATION : CONNEXION AVEC GOOGLE
-- À exécuter APRÈS 20261109000001 (elle remplace protect_profile_updates).
-- Idempotente : peut être rejouée sans effet de bord.
-- ==============================================================================

-- 1. INSCRIPTION : prénom et nom aussi depuis Google, et pas d'unité par défaut.
--    Un compte créé par Google n'a pas d'unité : l'appli lui demande de compléter
--    son inscription (vrai nom, unité, CGU) avant l'écran d'attente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_role user_role := 'chef';
  v_status account_status := 'pending';
  v_meta jsonb := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
  v_full_name text := NULLIF(TRIM(COALESCE(v_meta->>'full_name', v_meta->>'name', '')), '');
BEGIN
  -- Phase de test : comptes admin désignés (à retirer avant la mise en production)
  IF new.email IN ('ben.dupont@groupe-enf.fr', 'admin.dupont@groupe-enf.fr') THEN
    v_role := 'admin';
    v_status := 'active';
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, status, primary_unit_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      NULLIF(v_meta->>'first_name', ''),
      NULLIF(v_meta->>'given_name', ''),
      split_part(v_full_name, ' ', 1),
      'Chef'
    ),
    COALESCE(
      NULLIF(v_meta->>'last_name', ''),
      NULLIF(v_meta->>'family_name', ''),
      NULLIF(TRIM(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 2)), ''),
      'Scout'
    ),
    v_role,
    v_status,
    NULLIF(v_meta->>'primary_unit_id', '')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. PROTECTION DES PROFILS : un chef en attente sans unité peut choisir la sienne une fois
--    (fin d'inscription Google). Tout le reste est inchangé par rapport à 20261109000001.
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
      -- Seule exception : premier choix d'unité d'un compte en attente qui n'en a pas
      IF NOT (
        OLD.status = 'pending'
        AND OLD.primary_unit_id IS NULL
        AND NEW.secondary_unit_id IS NOT DISTINCT FROM OLD.secondary_unit_id
      ) THEN
        RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier les unités rattachées. Utilisez la demande de changement d''unité.';
      END IF;
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Interdit : L''email du profil ne se modifie pas ici.';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
