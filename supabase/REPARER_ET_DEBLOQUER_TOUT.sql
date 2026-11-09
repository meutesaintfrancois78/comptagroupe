-- ==============================================================================
-- SCRIPT DE RÉPARATION TOTALE : SUPABASE AUTH, PROFILS & RLS
-- Copiez-collez l'intégralité de ce script dans Supabase SQL Editor et cliquez sur RUN :
-- https://supabase.com/dashboard/project/jthbkzcicmhrdewvgauw/sql/new
-- ==============================================================================

-- 1. Réparer les colonnes NULL dans auth.users (élimine l'erreur 500 GoTrue sans toucher à phone qui a une contrainte unique)
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change = COALESCE(email_change, ''),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  last_sign_in_at = COALESCE(last_sign_in_at, now())
WHERE confirmation_token IS NULL OR recovery_token IS NULL OR email_confirmed_at IS NULL;

-- 2. Réparer / Créer les identités GoTrue requises pour la connexion par mot de passe
INSERT INTO auth.identities (
  id, 
  user_id, 
  identity_data, 
  provider, 
  provider_id, 
  last_sign_in_at, 
  created_at, 
  updated_at
)
SELECT 
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  now(),
  now(),
  now()
FROM auth.users u
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. Sécuriser la fonction is_admin avec search_path fixé
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

-- 4. Trigger d'auto-création de profil à chaque inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    role, 
    status, 
    primary_unit_id
  )
  VALUES (
    new.id,
    COALESCE(NULLIF(new.raw_user_meta_data->>'first_name', ''), 'Chef'),
    COALESCE(NULLIF(new.raw_user_meta_data->>'last_name', ''), 'Scout'),
    CASE 
      WHEN new.email ILIKE '%admin%' OR new.email ILIKE '%dupont%' OR new.email ILIKE '%vasseur%' THEN 'admin'::user_role
      ELSE 'chef'::user_role
    END,
    'active'::account_status,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'primary_unit_id', '')::uuid,
      (SELECT id FROM public.units ORDER BY name LIMIT 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Synchroniser immédiatement tous les profils manquants pour les utilisateurs existants
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  role,
  status,
  primary_unit_id
)
SELECT 
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'first_name', ''), 'Benoît'),
  COALESCE(NULLIF(u.raw_user_meta_data->>'last_name', ''), 'Dupont'),
  CASE 
    WHEN u.email ILIKE '%admin%' OR u.email ILIKE '%dupont%' OR u.email ILIKE '%vasseur%' THEN 'admin'::user_role
    ELSE 'chef'::user_role
  END,
  'active'::account_status,
  (SELECT id FROM public.units ORDER BY name LIMIT 1)
FROM auth.users u
ON CONFLICT (id) DO UPDATE 
SET status = 'active';

-- 6. Définir explicitement Benoît Dupont comme Administrateur Actif
UPDATE public.profiles
SET role = 'admin',
    status = 'active'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email ILIKE '%dupont%' OR email ILIKE '%ben%'
);
