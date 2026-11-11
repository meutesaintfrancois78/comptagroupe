-- Migration : Prise en compte des retours terrain chef (Arthur Boubou)
-- 1. Justificatif différé : autoriser la déclaration immédiate d'une dépense sans photo obligatoire
-- 2. Blocage BDD strict : interdire le remboursement d'une dépense sans justificatif
-- 3. Colonne de budget par défaut sur les unités

-- 1. Justificatif différé : proof_path accepte NULL et a pour valeur par défaut ''
ALTER TABLE public.expenses ALTER COLUMN proof_path DROP NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN proof_path SET DEFAULT '';

-- 2. Budget prévisionnel optionnel par unité
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS default_budget NUMERIC(10,2) DEFAULT NULL;

-- 3. Renforcement du trigger protect_expense_updates :
-- Interdiction absolue de rembourser une dépense dont le justificatif est manquant
CREATE OR REPLACE FUNCTION public.protect_expense_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Un remboursement est définitif
  IF auth.uid() IS NOT NULL
     AND OLD.reimbursement_status = 'reimbursed'
     AND NEW.reimbursement_status IS DISTINCT FROM 'reimbursed' THEN
    RAISE EXCEPTION 'Interdit : Un remboursement est définitif, il ne peut pas être annulé.';
  END IF;

  -- Le remboursement exige STRICTEMENT un justificatif comptable valide
  IF auth.uid() IS NOT NULL
     AND NEW.reimbursement_status = 'reimbursed'
     AND (NEW.proof_path IS NULL OR trim(NEW.proof_path) = '') THEN
    RAISE EXCEPTION 'Interdit : Un remboursement ne peut pas être validé sans justificatif comptable (ticket ou facture).';
  END IF;

  -- Restrictions pour les chefs (non-admins)
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF OLD.reimbursement_status = 'reimbursed' THEN
      RAISE EXCEPTION 'Interdit : Une dépense déjà remboursée ne peut plus être modifiée par un chef d''unité.';
    END IF;
    IF NEW.unit_id IS DISTINCT FROM OLD.unit_id THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut réassigner l''unité d''une dépense.';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Interdit : Impossible de modifier le créateur de la dépense.';
    END IF;
    IF NEW.period_id IS DISTINCT FROM OLD.period_id THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut modifier la période d''une dépense.';
    END IF;
    IF NEW.reimbursement_status = 'reimbursed' THEN
      RAISE EXCEPTION 'Interdit : Seul un administrateur peut marquer une dépense comme remboursée.';
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
