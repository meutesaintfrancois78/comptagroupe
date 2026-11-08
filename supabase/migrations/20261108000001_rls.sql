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
