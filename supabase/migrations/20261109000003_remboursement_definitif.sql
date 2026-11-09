-- Remboursement définitif : une dépense marquée « Remboursée » ne peut plus revenir « À rembourser »,
-- même par un admin (l'appli ne propose plus de décocher la case).
-- Seules les requêtes sans utilisateur connecté (éditeur SQL, clé service_role) peuvent encore corriger.
-- Reprend public.protect_expense_updates() de 20261109000001 et ajoute la règle en tête.

CREATE OR REPLACE FUNCTION public.protect_expense_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.reimbursement_status = 'reimbursed'
     AND NEW.reimbursement_status IS DISTINCT FROM 'reimbursed' THEN
    RAISE EXCEPTION 'Interdit : Un remboursement est définitif, il ne peut pas être annulé.';
  END IF;

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
