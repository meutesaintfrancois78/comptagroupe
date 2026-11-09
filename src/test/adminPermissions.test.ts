import { describe, it, expect } from 'bun:test';
import { buildExpenseUpdatePayload, validateProfileUnitAssignment } from '../lib/permissions';
import { Expense } from '../types/database';

describe('Admin Permissions & Unit Editing TDD', () => {
  const baseExpense: Expense = {
    id: 'exp-123',
    unit_id: 'unit-meute-1',
    period_id: 'period-2026',
    created_by: 'user-chef-1',
    date: '2026-11-08',
    amount: 45.5,
    category_id: 'cat-nourriture',
    custom_category: null,
    payment_method: 'unit_money',
    reimbursement_status: 'not_applicable',
    proof_url: 'https://storage/proof.jpg',
    comment: 'Achat goûter',
    created_at: '2026-11-08T10:00:00Z',
    updated_at: '2026-11-08T10:00:00Z',
  };

  describe('Expense Unit modification rules', () => {
    it('should allow an admin to change the unit_id of an expense', () => {
      const result = buildExpenseUpdatePayload(
        baseExpense,
        {
          amount: 50.0,
          date: '2026-11-08',
          category_id: 'cat-nourriture',
          custom_category: null,
          payment_method: 'unit_money',
          comment: 'Modifié par admin',
          unit_id: 'unit-troupe-1', // Changing unit from Meute 1 to Troupe 1
        },
        'admin'
      );

      expect(result.allowed).toBe(true);
      expect(result.payload.unit_id).toBe('unit-troupe-1');
      expect(result.payload.amount).toBe(50.0);
    });

    it('should forbid a chef from changing the unit_id of an expense', () => {
      const result = buildExpenseUpdatePayload(
        baseExpense,
        {
          amount: 50.0,
          date: '2026-11-08',
          category_id: 'cat-nourriture',
          custom_category: null,
          payment_method: 'unit_money',
          comment: 'Tentative changement unité',
          unit_id: 'unit-troupe-1', // Chef attempts to change unit
        },
        'chef'
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Seul un administrateur peut modifier l'unité d'une dépense.");
    });

    it('should allow a chef to update an expense if unit_id is unchanged or omitted', () => {
      const result = buildExpenseUpdatePayload(
        baseExpense,
        {
          amount: 49.9,
          date: '2026-11-08',
          category_id: 'cat-nourriture',
          custom_category: null,
          payment_method: 'unit_money',
          comment: 'Ajustement montant',
          unit_id: 'unit-meute-1', // Same unit
        },
        'chef'
      );

      expect(result.allowed).toBe(true);
      expect(result.payload.amount).toBe(49.9);
      expect(result.payload.unit_id).toBe('unit-meute-1');
    });
  });

  describe('Admin Primary Unit nullable rules', () => {
    it('should allow an admin to have NO primary unit (null or empty string)', () => {
      const resNull = validateProfileUnitAssignment('admin', null);
      expect(resNull.isValid).toBe(true);
      expect(resNull.unitId).toBeNull();

      const resEmpty = validateProfileUnitAssignment('admin', '');
      expect(resEmpty.isValid).toBe(true);
      expect(resEmpty.unitId).toBeNull();

      const resWithUnit = validateProfileUnitAssignment('admin', 'unit-meute-1');
      expect(resWithUnit.isValid).toBe(true);
      expect(resWithUnit.unitId).toBe('unit-meute-1');
    });

    it('should reject a chef having NO primary unit', () => {
      const resNull = validateProfileUnitAssignment('chef', null);
      expect(resNull.isValid).toBe(false);
      expect(resNull.error).toBe("Un chef d'unité doit obligatoirement avoir une unité principale.");

      const resEmpty = validateProfileUnitAssignment('chef', '');
      expect(resEmpty.isValid).toBe(false);
      expect(resEmpty.error).toBe("Un chef d'unité doit obligatoirement avoir une unité principale.");
    });

    it('should accept a chef having a valid primary unit', () => {
      const resValid = validateProfileUnitAssignment('chef', 'unit-compagnie-1');
      expect(resValid.isValid).toBe(true);
      expect(resValid.unitId).toBe('unit-compagnie-1');
      expect(resValid.error).toBeUndefined();
    });
  });
});
