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
