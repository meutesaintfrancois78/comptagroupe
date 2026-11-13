export type UserRole = 'chef' | 'admin';
export type AccountStatus = 'pending' | 'active' | 'rejected' | 'deactivated';
export type PaymentMethod = 'unit_money' | 'personal_money';
export type ReimbursementStatus = 'not_applicable' | 'pending' | 'reimbursed';
export type PeriodType = 'year' | 'camp';
export type PeriodStatus = 'open' | 'closed';

export interface Unit {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Period {
  id: string;
  name: string;
  type: PeriodType;
  status: PeriodStatus;
  start_date: string;
  end_date?: string | null;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email?: string | null;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: AccountStatus;
  primary_unit_id: string | null;
  secondary_unit_id: string | null;
  requested_unit_id?: string | null;
  iban?: string | null;
  primary_unit?: Unit | null;
  secondary_unit?: Unit | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  type: string;
  date: string;
  amount: number;
  category_id: string | null;
  custom_category: string | null;
  payment_method: PaymentMethod;
  proof_path: string;
  comment: string | null;
  reimbursement_status: ReimbursementStatus;
  unit_id: string;
  created_by: string;
  period_id: string;
  created_at: string;
  updated_at: string;
  // Joins
  unit?: Unit;
  category?: ExpenseCategory;
  creator?: Profile;
  period?: Period;
  signed_proof_url?: string;
}

export interface ExpenseHistory {
  id: string;
  expense_id: string;
  changed_by: string | null;
  changed_at: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changer?: Profile;
}

export interface ExpenseDraft {
  amount: string;
  categoryId: string;
  customCategory: string;
  paymentMethod: PaymentMethod;
  date: string;
  comment: string;
  unitId: string;
}
