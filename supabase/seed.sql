-- Seed des données initiales pour le Groupe Éclaireurs Neutres de France (ENF)

-- 1. Insertion des 6 unités officielles
INSERT INTO public.units (name, is_active) VALUES
  ('Meute 1', true),
  ('Meute 3', true),
  ('Troupe 1', true),
  ('Compagnie 2', true),
  ('Clairière 2', true),
  ('Clairière 4', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Insertion des catégories de dépenses simplifiées et validées
INSERT INTO public.expense_categories (name, is_active) VALUES
  ('Nourriture', true),
  ('Transport', true),
  ('Matériel', true),
  ('Hébergement', true),
  ('Pharmacie', true),
  ('Autre', true)
ON CONFLICT (name) DO NOTHING;

-- 3. Insertion de la période par défaut
INSERT INTO public.periods (name, type, status, start_date)
SELECT 'Année 2026-2027', 'year', 'open', CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM public.periods WHERE status = 'open'
);

-- 4. Pour initialiser le premier administrateur :
-- Après inscription du chef de groupe via l'écran d'inscription (ex: admin@groupe-enf.fr),
-- exécutez la commande suivante dans l'éditeur SQL de Supabase :
-- 
-- UPDATE public.profiles
-- SET role = 'admin', status = 'active'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@groupe-enf.fr');
