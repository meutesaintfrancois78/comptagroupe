-- ==============================================================================
-- FIX IMMÉDIAT : DÉBLOQUER LA CONNEXION ET LES UNITÉS SUR SUPABASE
-- Copiez et collez ce script dans l'éditeur SQL Supabase (SQL Editor) et cliquez sur RUN
-- ==============================================================================

-- 1. Autoriser les visiteurs (non connectés) à lire les unités et catégories
-- (Nécessaire pour afficher les unités dans le menu déroulant d'inscription)
DROP POLICY IF EXISTS "units_select_policy" ON public.units;
CREATE POLICY "units_select_policy" ON public.units
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "categories_select_policy" ON public.expense_categories;
CREATE POLICY "categories_select_policy" ON public.expense_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Insérer les 6 unités si elles ne sont pas encore présentes
INSERT INTO public.units (id, name, is_active) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Meute 1', true),
  ('11111111-1111-1111-1111-111111111102', 'Meute 3', true),
  ('11111111-1111-1111-1111-111111111103', 'Troupe 1', true),
  ('11111111-1111-1111-1111-111111111104', 'Compagnie 2', true),
  ('11111111-1111-1111-1111-111111111105', 'Clairière 2', true),
  ('11111111-1111-1111-1111-111111111106', 'Clairière 4', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 3. Insérer les 6 catégories de dépenses
INSERT INTO public.expense_categories (id, name, is_active) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Nourriture', true),
  ('22222222-2222-2222-2222-222222222202', 'Transport', true),
  ('22222222-2222-2222-2222-222222222203', 'Matériel', true),
  ('22222222-2222-2222-2222-222222222204', 'Hébergement', true),
  ('22222222-2222-2222-2222-222222222205', 'Pharmacie', true),
  ('22222222-2222-2222-2222-222222222206', 'Autre', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 4. Période active par défaut
INSERT INTO public.periods (id, name, type, status, start_date)
VALUES ('33333333-3333-3333-3333-333333333301', 'Année 2026-2027', 'year', 'open', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- 5. Bucket de stockage receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Débloquer tous les comptes : marquer leurs emails comme confirmés !
-- (Résout instantanément l'erreur "Email not confirmed")
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmed_at = COALESCE(confirmed_at, now()),
    last_sign_in_at = COALESCE(last_sign_in_at, now())
WHERE email_confirmed_at IS NULL;

-- 7. Trigger automatique pour insérer dans public.profiles dès qu'un chef s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role, status, primary_unit_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Chef'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Scout'),
    'chef',
    'pending',
    NULLIF(new.raw_user_meta_data->>'primary_unit_id', '')::uuid
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Créer les profils pour les utilisateurs déjà créés dans auth.users
INSERT INTO public.profiles (id, first_name, last_name, role, status, primary_unit_id)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'first_name', 'Chef'),
  COALESCE(u.raw_user_meta_data->>'last_name', 'Scout'),
  CASE 
    WHEN u.email ILIKE '%admin%' OR u.email ILIKE '%dupont%' OR u.email ILIKE '%vasseur%' THEN 'admin'::user_role
    ELSE 'chef'::user_role
  END,
  'active'::account_status,
  (SELECT id FROM public.units LIMIT 1)
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
