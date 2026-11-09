-- Migration 0: Schéma de base pour l'application Compta ENF
-- Active les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Énumérations
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('chef', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('pending', 'active', 'rejected', 'deactivated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('unit_money', 'personal_money');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE reimbursement_status AS ENUM ('not_applicable', 'pending', 'reimbursed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE period_type AS ENUM ('year', 'camp');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE period_status AS ENUM ('open', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Table des Unités scoutes
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table des Périodes (Année / Camp)
CREATE TABLE IF NOT EXISTS public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type period_type NOT NULL DEFAULT 'year',
  status period_status NOT NULL DEFAULT 'open',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table des Catégories de dépenses
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table des Profils utilisateurs (reliée à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'chef',
  status account_status NOT NULL DEFAULT 'pending',
  primary_unit_id UUID REFERENCES public.units(id),
  secondary_unit_id UUID REFERENCES public.units(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Table des Dépenses (avec type pour futures entrées d'argent)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'dépense',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.expense_categories(id),
  custom_category TEXT,
  payment_method payment_method NOT NULL DEFAULT 'unit_money',
  proof_path TEXT NOT NULL,
  comment TEXT,
  reimbursement_status reimbursement_status NOT NULL DEFAULT 'not_applicable',
  unit_id UUID NOT NULL REFERENCES public.units(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  period_id UUID NOT NULL REFERENCES public.periods(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Table de l'Historique des modifications
CREATE TABLE IF NOT EXISTS public.expense_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_expenses_unit_period ON public.expenses(unit_id, period_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_expense_history_expense ON public.expense_history(expense_id);

-- ====================================================
-- RLS POLICIES
-- ====================================================

-- Migration 1: Politiques de sécurité au niveau des lignes (Row Level Security - RLS)

-- Activation RLS sur toutes les tables
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_history ENABLE ROW LEVEL SECURITY;

-- Fonctions utilitaires de sécurité (SECURITY DEFINER pour éviter les boucles RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_status()
RETURNS account_status
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. Politiques sur PROFILES
-- Lecture : un utilisateur lit son profil, un admin lit tous les profils
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin()
  );

-- Insertion : un nouvel inscrit insère son propre profil
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
  );

-- Mise à jour : les admins modifient tous les champs ; les utilisateurs modifient uniquement leurs nom/prénom
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    -- Si non-admin, impossible de s'attribuer le rôle admin ou changer de statut
    public.is_admin() OR (
      id = auth.uid() 
      AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 2. Politiques sur UNITS
-- Tout utilisateur authentifié (même en attente pour le select d'inscription) peut lire les unités actives
CREATE POLICY "units_select_policy" ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les admins gèrent les unités
CREATE POLICY "units_admin_policy" ON public.units
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Politiques sur EXPENSE_CATEGORIES
CREATE POLICY "categories_select_policy" ON public.expense_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "categories_admin_policy" ON public.expense_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Politiques sur PERIODS
-- Les chefs actifs voient les périodes ouvertes ; les admins voient toutes les périodes
CREATE POLICY "periods_select_policy" ON public.periods
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR (status = 'open' AND public.get_my_status() = 'active')
  );

CREATE POLICY "periods_admin_policy" ON public.periods
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Politiques sur EXPENSES
-- Lecture : 
-- - Les admins lisent tout.
-- - Les chefs actifs ne lisent QUE les dépenses de leur unité (principale ou secondaire) ET sur une période ouverte.
CREATE POLICY "expenses_select_policy" ON public.expenses
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR (
      public.get_my_status() = 'active'
      AND unit_id IN (
        SELECT primary_unit_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT secondary_unit_id FROM public.profiles WHERE id = auth.uid() AND secondary_unit_id IS NOT NULL
      )
      AND period_id IN (
        SELECT id FROM public.periods WHERE status = 'open'
      )
    )
  );

-- Insertion :
-- - Les chefs actifs peuvent insérer pour leur propre unité sur une période ouverte.
CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR (
      public.get_my_status() = 'active'
      AND unit_id IN (
        SELECT primary_unit_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT secondary_unit_id FROM public.profiles WHERE id = auth.uid() AND secondary_unit_id IS NOT NULL
      )
      AND period_id IN (
        SELECT id FROM public.periods WHERE status = 'open'
      )
      AND created_by = auth.uid()
    )
  );

-- Mise à jour :
-- - Les chefs actifs peuvent modifier les dépenses de leur unité (pas seulement les leurs) sur période ouverte.
-- - Les admins peuvent modifier toutes les dépenses.
CREATE POLICY "expenses_update_policy" ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR (
      public.get_my_status() = 'active'
      AND unit_id IN (
        SELECT primary_unit_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT secondary_unit_id FROM public.profiles WHERE id = auth.uid() AND secondary_unit_id IS NOT NULL
      )
      AND period_id IN (
        SELECT id FROM public.periods WHERE status = 'open'
      )
    )
  )
  WITH CHECK (
    public.is_admin() OR (
      public.get_my_status() = 'active'
      AND unit_id IN (
        SELECT primary_unit_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT secondary_unit_id FROM public.profiles WHERE id = auth.uid() AND secondary_unit_id IS NOT NULL
      )
    )
  );

-- Suppression :
-- STRICTEMENT RÉSERVÉE AUX ADMINS !
CREATE POLICY "expenses_delete_policy" ON public.expenses
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 6. Politiques sur EXPENSE_HISTORY
CREATE POLICY "history_select_policy" ON public.expense_history
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND e.unit_id IN (
          SELECT primary_unit_id FROM public.profiles WHERE id = auth.uid()
          UNION
          SELECT secondary_unit_id FROM public.profiles WHERE id = auth.uid() AND secondary_unit_id IS NOT NULL
        )
    )
  );

CREATE POLICY "history_insert_policy" ON public.expense_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Alimenté via trigger

-- ====================================================
-- TRIGGERS & SAFEGUARDS
-- ====================================================

-- Migration 2: Triggers automatiques (Audit des modifications et garde-fou dernier admin)

-- 1. Trigger d'audit sur EXPENSES
CREATE OR REPLACE FUNCTION public.track_expense_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- Vérification des champs modifiés
  IF OLD.amount IS DISTINCT FROM NEW.amount THEN
    INSERT INTO public.expense_history (expense_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id, 'Montant', OLD.amount::text || ' €', NEW.amount::text || ' €');
  END IF;

  IF OLD.date IS DISTINCT FROM NEW.date THEN
    INSERT INTO public.expense_history (expense_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id, 'Date', OLD.date::text, NEW.date::text);
  END IF;

  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    INSERT INTO public.expense_history (expense_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id, 'Catégorie', OLD.category_id::text, NEW.category_id::text);
  END IF;

  IF OLD.custom_category IS DISTINCT FROM NEW.custom_category THEN
    INSERT INTO public.expense_history (expense_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id, 'Précision motif', OLD.custom_category, NEW.custom_category);
  END IF;

  IF OLD.payment_method IS DISTINCT FROM NEW.payment_method THEN
    INSERT INTO public.expense_history (expense_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id, 'Mode de paiement', OLD.payment_method::text, NEW.payment_method::text);
  END IF;

  IF OLD.comment IS DISTINCT FROM NEW.comment THEN
    INSERT INTO public.expense_history (expense_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id, 'Commentaire', OLD.comment, NEW.comment);
  END IF;

  IF OLD.reimbursement_status IS DISTINCT FROM NEW.reimbursement_status THEN
    INSERT INTO public.expense_history (expense_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id, 'Statut remboursement', OLD.reimbursement_status::text, NEW.reimbursement_status::text);
  END IF;

  IF OLD.proof_path IS DISTINCT FROM NEW.proof_path THEN
    INSERT INTO public.expense_history (expense_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id, 'Justificatif', 'Ancien fichier', 'Nouveau fichier');
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_expense_changes ON public.expenses;
CREATE TRIGGER tr_expense_changes
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.track_expense_changes();

-- 2. Garde-fou : Impossible de retirer ou désactiver le dernier admin
CREATE OR REPLACE FUNCTION public.check_last_admin_safeguard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count INT;
BEGIN
  -- Si on tente de changer le rôle d'un admin en non-admin ou de désactiver/rejeter un admin
  IF (OLD.role = 'admin' AND (NEW.role <> 'admin' OR NEW.status <> 'active')) THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles
    WHERE role = 'admin' AND status = 'active' AND id <> OLD.id;

    IF admin_count < 1 THEN
      RAISE EXCEPTION 'Action impossible : le système doit conserver au moins un administrateur actif.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_last_admin_check ON public.profiles;
CREATE TRIGGER tr_profiles_last_admin_check
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_last_admin_safeguard();

-- Même garde-fou en cas de suppression directe de profil
CREATE OR REPLACE FUNCTION public.check_last_admin_delete_safeguard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count INT;
BEGIN
  IF OLD.role = 'admin' AND OLD.status = 'active' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles
    WHERE role = 'admin' AND status = 'active' AND id <> OLD.id;

    IF admin_count < 1 THEN
      RAISE EXCEPTION 'Suppression impossible : le système doit conserver au moins un administrateur actif.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_last_admin_delete ON public.profiles;
CREATE TRIGGER tr_profiles_last_admin_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_last_admin_delete_safeguard();

-- ====================================================
-- STORAGE BUCKET (receipts)
-- ====================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;

-- ====================================================
-- SEED DATA & TEST ACCOUNTS
-- ====================================================

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
