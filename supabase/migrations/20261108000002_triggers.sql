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
