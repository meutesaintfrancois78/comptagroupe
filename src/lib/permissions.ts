import { Expense, UserRole, PaymentMethod } from '@/types/database';

export interface ExpenseUpdateInput {
  amount: number;
  date: string;
  category_id: string;
  custom_category: string | null;
  payment_method: PaymentMethod;
  comment: string | null;
  unit_id?: string;
}

export interface ExpenseUpdateResult {
  allowed: boolean;
  payload: Record<string, any>;
  error?: string;
}

export interface UnitAssignmentValidation {
  isValid: boolean;
  unitId: string | null;
  error?: string;
}

/**
 * Builds and validates an update payload for an expense according to user roles.
 * Admins can reassign the expense to a different unit_id.
 * Chefs are restricted to keeping the expense within its current unit.
 */
export function buildExpenseUpdatePayload(
  originalExpense: Expense,
  updates: ExpenseUpdateInput,
  userRole: UserRole
): ExpenseUpdateResult {
  // Check unit modification permission
  if (updates.unit_id && updates.unit_id !== originalExpense.unit_id) {
    if (userRole !== 'admin') {
      return {
        allowed: false,
        payload: {},
        error: "Seul un administrateur peut modifier l'unité d'une dépense.",
      };
    }
  }

  const targetUnitId = userRole === 'admin' && updates.unit_id
    ? updates.unit_id
    : originalExpense.unit_id;

  const payload: Record<string, any> = {
    amount: updates.amount,
    date: updates.date,
    category_id: updates.category_id,
    custom_category: updates.custom_category,
    payment_method: updates.payment_method,
    comment: updates.comment,
    unit_id: targetUnitId,
  };

  // Adjust reimbursement_status if changing payment method
  if (updates.payment_method === 'personal_money' && originalExpense.reimbursement_status === 'not_applicable') {
    payload.reimbursement_status = 'pending';
  } else if (updates.payment_method === 'unit_money') {
    payload.reimbursement_status = 'not_applicable';
  }

  return {
    allowed: true,
    payload,
  };
}

/**
 * Validates primary unit assignment for a profile.
 * Admins are permitted to have NO primary unit (null or empty string).
 * Chefs must always have a non-empty primary unit.
 */
export function validateProfileUnitAssignment(
  role: UserRole,
  primaryUnitId: string | null | undefined
): UnitAssignmentValidation {
  const normalizedUnitId = primaryUnitId && primaryUnitId.trim() !== '' ? primaryUnitId.trim() : null;

  if (role === 'admin') {
    return {
      isValid: true,
      unitId: normalizedUnitId,
    };
  }

  if (!normalizedUnitId) {
    return {
      isValid: false,
      unitId: null,
      error: "Un chef d'unité doit obligatoirement avoir une unité principale.",
    };
  }

  return {
    isValid: true,
    unitId: normalizedUnitId,
  };
}
