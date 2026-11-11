import { describe, it, expect } from 'bun:test';
import { parseAmount } from '../lib/utils';

interface ExpenseFormState {
  amount: string;
  categoryId: string;
  isCustomCategory: boolean;
  customCategory: string;
  paymentMethod: 'unit_money' | 'personal_money';
  hasProof: boolean;
  skipProof?: boolean;
  date: string;
}

function validateExpenseForm(state: ExpenseFormState): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const parsed = parseAmount(state.amount);
  if (!parsed || parsed <= 0) {
    errors.push('Le montant doit être supérieur à zéro.');
  }
  if (!state.categoryId) {
    errors.push('Le motif est obligatoire.');
  }
  if (state.isCustomCategory && !state.customCategory.trim()) {
    errors.push('Veuillez préciser le motif libre.');
  }
  if (!state.hasProof && !state.skipProof) {
    errors.push('Le justificatif est obligatoire.');
  }
  if (!state.date) {
    errors.push('La date est obligatoire.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

describe('Expense Multi-step Form Validation TDD', () => {
  it('should validate a complete and correct expense submission', () => {
    const validState: ExpenseFormState = {
      amount: '34,90',
      categoryId: 'c1',
      isCustomCategory: false,
      customCategory: '',
      paymentMethod: 'unit_money',
      hasProof: true,
      date: '2026-11-08',
    };
    const res = validateExpenseForm(validState);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('should reject missing proof when skipProof is not enabled', () => {
    const invalid: ExpenseFormState = {
      amount: '10',
      categoryId: 'c1',
      isCustomCategory: false,
      customCategory: '',
      paymentMethod: 'unit_money',
      hasProof: false,
      date: '2026-11-08',
    };
    const res = validateExpenseForm(invalid);
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Le justificatif est obligatoire.');
  });

  it('should allow submitting an expense without proof if skipProof is explicitly enabled', () => {
    const deferredState: ExpenseFormState = {
      amount: '15.50',
      categoryId: 'c1',
      isCustomCategory: false,
      customCategory: '',
      paymentMethod: 'unit_money',
      hasProof: false,
      skipProof: true,
      date: '2026-11-08',
    };
    const res = validateExpenseForm(deferredState);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('should require customCategory text if category is Autre', () => {
    const invalid: ExpenseFormState = {
      amount: '10',
      categoryId: 'c-autre',
      isCustomCategory: true,
      customCategory: '   ',
      paymentMethod: 'personal_money',
      hasProof: true,
      date: '2026-11-08',
    };
    const res = validateExpenseForm(invalid);
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Veuillez préciser le motif libre.');
  });
});
