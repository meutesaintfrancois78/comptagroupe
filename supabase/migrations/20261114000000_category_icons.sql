-- ==============================================================================
-- MIGRATION : ICÔNES DES CATÉGORIES DE DÉPENSES & MOTIFS
-- ==============================================================================

-- 1. Ajout de la colonne icon sur public.expense_categories
ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'Receipt';

COMMENT ON COLUMN public.expense_categories.icon IS 'Nom de l''icône Lucide associée au motif de dépense (ex: ShoppingCart, Bus, Tent, HeartPulse, Package, Ellipsis).';

-- 2. Affectation des icônes par défaut adaptées aux catégories existantes
UPDATE public.expense_categories SET icon = 'ShoppingCart' WHERE name ILIKE '%nourri%' OR name ILIKE '%course%' OR name ILIKE '%aliment%';
UPDATE public.expense_categories SET icon = 'Bus' WHERE name ILIKE '%transport%';
UPDATE public.expense_categories SET icon = 'Package' WHERE name ILIKE '%matériel%' OR name ILIKE '%materiel%';
UPDATE public.expense_categories SET icon = 'Tent' WHERE name ILIKE '%héberg%' OR name ILIKE '%heberg%';
UPDATE public.expense_categories SET icon = 'HeartPulse' WHERE name ILIKE '%pharma%' OR name ILIKE '%santé%';
UPDATE public.expense_categories SET icon = 'Ellipsis' WHERE name ILIKE '%autre%';
