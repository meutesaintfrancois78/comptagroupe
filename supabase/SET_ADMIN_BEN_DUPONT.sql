-- ==============================================================================
-- NOMMER BEN DUPONT COMME PREMIER ADMINISTRATEUR ACTIF
-- À exécuter dans le Supabase SQL Editor :
-- https://supabase.com/dashboard/project/jthbkzcicmhrdewvgauw/sql/new
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Création / Mise à jour dans auth.users (Mot de passe : Password123!)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'benoit.dupont@groupe-enf.fr',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Benoît","last_name":"Dupont"}',
  false,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE 
SET email_confirmed_at = now();

-- 2. Création de l'identité requise par Supabase GoTrue
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
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  jsonb_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'benoit.dupont@groupe-enf.fr'),
  'email',
  'benoit.dupont@groupe-enf.fr',
  now(),
  now(),
  now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. Attribution du rôle Administrateur et statut Actif dans public.profiles
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  role,
  status,
  primary_unit_id
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Benoît',
  'Dupont',
  'admin',
  'active',
  (SELECT id FROM public.units WHERE name = 'Meute 1' LIMIT 1)
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    status = 'active';

-- 4. Si vous vous êtes déjà inscrit avec une autre adresse email contenant "dupont" ou "ben", la passer aussi en admin actif
UPDATE public.profiles
SET role = 'admin',
    status = 'active'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email ILIKE '%dupont%' OR email ILIKE '%ben%'
);
