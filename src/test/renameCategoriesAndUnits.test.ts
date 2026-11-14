import { describe, it, expect } from 'bun:test';
import {
  validateCategoryRename,
  validateUnitRename,
  isSystemCategory,
} from '@/lib/categoryIcons';
import { hasValidProof, canReimburseExpense } from '@/lib/permissions';
import { Expense, Profile } from '@/types/database';

describe('Category & Unit Renaming Rules TDD', () => {
  const existingCategories = [
    { id: '1', name: 'Nourriture', icon: 'ShoppingCart', is_active: true },
    { id: '2', name: 'Matériel', icon: 'Package', is_active: true },
    { id: '3', name: 'Autre', icon: 'Ellipsis', is_active: true },
  ];

  const existingUnits = [
    { id: 'u1', name: 'Meute 1', is_active: true },
    { id: 'u2', name: 'Troupe 1', is_active: true },
  ];

  it('should reject empty or whitespace-only category names', () => {
    const res1 = validateCategoryRename(existingCategories[0], '', existingCategories);
    expect(res1.isValid).toBe(false);
    expect(res1.error).toContain('vide');

    const res2 = validateCategoryRename(existingCategories[0], '   ', existingCategories);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toContain('vide');
  });

  it('should forbid renaming the system category Autre', () => {
    const res = validateCategoryRename(existingCategories[2], 'Divers', existingCategories);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Autre');
  });

  it('should forbid renaming any custom category to Autre (case-insensitive)', () => {
    const res1 = validateCategoryRename(existingCategories[0], 'Autre', existingCategories);
    expect(res1.isValid).toBe(false);
    expect(res1.error).toContain('réservé');

    const res2 = validateCategoryRename(existingCategories[0], 'autre', existingCategories);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toContain('réservé');
  });

  it('should forbid renaming to an already existing category name (case-insensitive)', () => {
    const res = validateCategoryRename(existingCategories[0], 'Matériel', existingCategories);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('existe déjà');

    const resLower = validateCategoryRename(existingCategories[0], 'matériel', existingCategories);
    expect(resLower.isValid).toBe(false);
    expect(resLower.error).toContain('existe déjà');
  });

  it('should report noChange when the new name is identical to the current name', () => {
    const res = validateCategoryRename(existingCategories[0], 'Nourriture', existingCategories);
    expect(res.isValid).toBe(true);
    expect(res.noChange).toBe(true);

    const resSpaces = validateCategoryRename(existingCategories[0], '  Nourriture  ', existingCategories);
    expect(resSpaces.isValid).toBe(true);
    expect(resSpaces.noChange).toBe(true);
  });

  it('should accept valid new category name like Intendance and trim whitespace', () => {
    const res = validateCategoryRename(existingCategories[0], '  Intendance  ', existingCategories);
    expect(res.isValid).toBe(true);
    expect(res.cleanName).toBe('Intendance');
    expect(res.noChange).toBeFalsy();
  });

  it('should validate unit renaming rules correctly', () => {
    const resEmpty = validateUnitRename(existingUnits[0], ' ', existingUnits);
    expect(resEmpty.isValid).toBe(false);

    const resDup = validateUnitRename(existingUnits[0], 'Troupe 1', existingUnits);
    expect(resDup.isValid).toBe(false);
    expect(resDup.error).toContain('existe déjà');

    const resSame = validateUnitRename(existingUnits[0], 'Meute 1', existingUnits);
    expect(resSame.isValid).toBe(true);
    expect(resSame.noChange).toBe(true);

    const resValid = validateUnitRename(existingUnits[0], 'Meute Saint-François', existingUnits);
    expect(resValid.isValid).toBe(true);
    expect(resValid.cleanName).toBe('Meute Saint-François');
  });
});

describe('Missing Proof Upload & Immediate Reimbursement Unlock TDD', () => {
  const adminProfile: Profile = {
    id: 'admin-1',
    email: 'admin@groupe.fr',
    role: 'admin',
    status: 'active',
    first_name: 'Benoît',
    last_name: 'Dupont',
    primary_unit_id: null,
    secondary_unit_id: null,
    requested_unit_id: null,
    created_at: '',
    updated_at: '',
  };

  const pendingPersonalExpense: Expense = {
    id: 'exp-1',
    amount: 50,
    type: 'expense',
    date: '2026-11-14',
    category_id: 'c1',
    custom_category: null,
    payment_method: 'personal_money',
    reimbursement_status: 'pending',
    proof_path: '', // Missing proof
    comment: null,
    unit_id: 'u1',
    created_by: 'chef-1',
    period_id: 'p1',
    created_at: '',
    updated_at: '',
  };

  it('should initially block reimbursement when proof_path is empty', () => {
    expect(hasValidProof(pendingPersonalExpense)).toBe(false);
    const res = canReimburseExpense(pendingPersonalExpense, 'admin');
    expect(res.canReimburse).toBe(false);
    expect(res.reason).toContain('justificatif');
  });

  it('should immediately unlock reimbursement once proof_path is attached by admin', () => {
    const updatedExpense: Expense = {
      ...pendingPersonalExpense,
      proof_path: 'u1/123456789_Meute-1_50EUR.jpg',
    };

    expect(hasValidProof(updatedExpense)).toBe(true);
    const res = canReimburseExpense(updatedExpense, 'admin');
    expect(res.canReimburse).toBe(true);
  });
});
