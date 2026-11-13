-- ==============================================================================
-- MIGRATION : AJOUT DU RIB / IBAN OBLIGATOIRE SUR LES PROFILS CHEFS
-- ==============================================================================

-- 1. Colonne IBAN sur public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban text;

COMMENT ON COLUMN public.profiles.iban IS 'IBAN (RIB) du chef, utilisé par le trésorier pour effectuer les virements de remboursement.';

-- 2. Mise à jour de la fonction d'inscription public.handle_new_user()
--    Extrait l'IBAN depuis raw_user_meta_data lors de l'inscription
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

  INSERT INTO public.profiles (id, email, first_name, last_name, role, status, primary_unit_id, iban)
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
    NULLIF(v_meta->>'primary_unit_id', '')::uuid,
    NULLIF(UPPER(REGEXP_REPLACE(v_meta->>'iban', '\s+', '', 'g')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    iban = COALESCE(EXCLUDED.iban, public.profiles.iban);

  RETURN new;
END;
$$;
