-- ==============================================================================
-- Script de Seed Complet : Utilisateurs de Test & Dépenses Réalistes pour Supabase
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase (SQL Editor)
-- ==============================================================================

-- 1. S'assurer que les extensions et tables sont prêtes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Insertion des 6 unités
INSERT INTO public.units (id, name, is_active) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Meute 1', true),
  ('11111111-1111-1111-1111-111111111102', 'Meute 3', true),
  ('11111111-1111-1111-1111-111111111103', 'Troupe 1', true),
  ('11111111-1111-1111-1111-111111111104', 'Compagnie 2', true),
  ('11111111-1111-1111-1111-111111111105', 'Clairière 2', true),
  ('11111111-1111-1111-1111-111111111106', 'Clairière 4', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 3. Insertion des 6 catégories
INSERT INTO public.expense_categories (id, name, is_active) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Nourriture', true),
  ('22222222-2222-2222-2222-222222222202', 'Transport', true),
  ('22222222-2222-2222-2222-222222222203', 'Matériel', true),
  ('22222222-2222-2222-2222-222222222204', 'Hébergement', true),
  ('22222222-2222-2222-2222-222222222205', 'Pharmacie', true),
  ('22222222-2222-2222-2222-222222222206', 'Autre', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 4. Insertion de la période par défaut
INSERT INTO public.periods (id, name, type, status, start_date)
VALUES ('33333333-3333-3333-3333-333333333301', 'Année 2026-2027', 'year', 'open', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- 5. Création des utilisateurs de test dans auth.users (Mot de passe pour tous : Password123!)
-- IDs fixes pour relier aux profils
DO $$
DECLARE
  v_pass_hash TEXT := crypt('Password123!', gen_salt('bf'));
BEGIN
  -- Utilisateur 1 : Benoît Dupont (Admin Chef de groupe)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'benoit.dupont@groupe-enf.fr', v_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Benoît","last_name":"Dupont"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Utilisateur 2 : Marie Vasseur (Admin Trésorière)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marie.vasseur@groupe-enf.fr', v_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Marie","last_name":"Vasseur"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Utilisateur 3 : Guillaume Martin (Chef Meute 1 & 3)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'guillaume.martin@groupe-enf.fr', v_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Guillaume","last_name":"Martin"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Utilisateur 4 : Thomas Bernard (Chef Troupe 1)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thomas.bernard@groupe-enf.fr', v_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Thomas","last_name":"Bernard"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Utilisateur 5 : Sophie Legrand (Cheftaine Clairière 2)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sophie.legrand@groupe-enf.fr', v_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Sophie","last_name":"Legrand"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Utilisateur 6 : Claire Lemoine (Cheftaine en attente de validation)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'claire.lemoine@groupe-enf.fr', v_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Claire","last_name":"Lemoine"}', now(), now())
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 6. Création des profils associés dans public.profiles
INSERT INTO public.profiles (id, first_name, last_name, role, status, primary_unit_id, secondary_unit_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Benoît', 'Dupont', 'admin', 'active', '11111111-1111-1111-1111-111111111101', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Marie', 'Vasseur', 'admin', 'active', '11111111-1111-1111-1111-111111111103', null),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Guillaume', 'Martin', 'chef', 'active', '11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111102'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Thomas', 'Bernard', 'chef', 'active', '11111111-1111-1111-1111-111111111103', null),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Sophie', 'Legrand', 'chef', 'active', '11111111-1111-1111-1111-111111111105', null),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Claire', 'Lemoine', 'chef', 'pending', '11111111-1111-1111-1111-111111111104', null)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  primary_unit_id = EXCLUDED.primary_unit_id,
  secondary_unit_id = EXCLUDED.secondary_unit_id;

-- 7. Insertion de dépenses réalistes rattachées aux factures et tickets
INSERT INTO public.expenses (
  type, date, amount, category_id, custom_category, payment_method, proof_path, comment, reimbursement_status, unit_id, created_by, period_id
) VALUES
  (
    'dépense',
    '2026-10-12',
    48.65,
    '22222222-2222-2222-2222-222222222201', -- Nourriture
    null,
    'unit_money',
    'ticket-super-u-nourriture.jpg',
    'Intendance week-end de rentrée (baguettes, nutella, pâtes, chocolat)',
    'not_applicable',
    '11111111-1111-1111-1111-111111111101', -- Meute 1
    'cccccccc-cccc-cccc-cccc-cccccccccccc', -- Guillaume Martin
    '33333333-3333-3333-3333-333333333301'
  ),
  (
    'dépense',
    '2026-10-18',
    89.90,
    '22222222-2222-2222-2222-222222222203', -- Matériel
    null,
    'unit_money',
    'facture-leroy-materiel.jpg',
    'Ficelle sisal 400m, bâche étanche et vis à bois pour les constructions',
    'not_applicable',
    '11111111-1111-1111-1111-111111111103', -- Troupe 1
    'dddddddd-dddd-dddd-dddd-dddddddddddd', -- Thomas Bernard
    '33333333-3333-3333-3333-333333333301'
  ),
  (
    'dépense',
    '2026-10-24',
    72.88,
    '22222222-2222-2222-2222-222222222202', -- Transport
    null,
    'personal_money',
    'ticket-station-total-carburant.jpg',
    'Plein gazole camionnette pour transport des malles de camp',
    'pending', -- À rembourser
    '11111111-1111-1111-1111-111111111105', -- Clairière 2
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', -- Sophie Legrand
    '33333333-3333-3333-3333-333333333301'
  ),
  (
    'dépense',
    '2026-11-02',
    31.40,
    '22222222-2222-2222-2222-222222222205', -- Pharmacie
    null,
    'personal_money',
    'ticket-pharmacie-secours.jpg',
    'Recharge trousse de secours (compresses, biseptine, pansements)',
    'reimbursed', -- Remboursée
    '11111111-1111-1111-1111-111111111101', -- Meute 1
    'cccccccc-cccc-cccc-cccc-cccccccccccc', -- Guillaume Martin
    '33333333-3333-3333-3333-333333333301'
  ),
  (
    'dépense',
    '2026-11-05',
    165.00,
    '22222222-2222-2222-2222-222222222204', -- Hébergement
    null,
    'unit_money',
    'facture-camping-hebergement.jpg',
    'Réservation emplacement camp de Toussaint Meute 1',
    'not_applicable',
    '11111111-1111-1111-1111-111111111101', -- Meute 1
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Benoît Dupont
    '33333333-3333-3333-3333-333333333301'
  );
