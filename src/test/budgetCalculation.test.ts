import { describe, it, expect } from 'bun:test';
import {
  calculateCategoryBreakdown,
  calculateBudgetStatus,
  getUnitBudget,
  setUnitBudget,
} from '../lib/budget';
import { Expense } from '../types/database';

describe('Budget & Category Breakdown Calculation TDD', () => {
  const dummyExpenses: Expense[] = [
    {
      id: 'e1',
      type: 'expense',
      unit_id: 'unit-1',
      period_id: 'p-2026',
      created_by: 'u1',
      date: '2026-11-01',
      amount: 150.50,
      category_id: 'cat-nourriture',
      custom_category: null,
      payment_method: 'unit_money',
      reimbursement_status: 'not_applicable',
      proof_path: 'unit-1/p1.jpg',
      comment: null,
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-01T10:00:00Z',
      category: { id: 'cat-nourriture', name: 'Nourriture & Intendance', is_active: true, created_at: '' },
    },
    {
      id: 'e2',
      type: 'expense',
      unit_id: 'unit-1',
      period_id: 'p-2026',
      created_by: 'u1',
      date: '2026-11-02',
      amount: 49.50,
      category_id: 'cat-nourriture',
      custom_category: null,
      payment_method: 'unit_money',
      reimbursement_status: 'not_applicable',
      proof_path: 'unit-1/p2.jpg',
      comment: null,
      created_at: '2026-11-02T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
      category: { id: 'cat-nourriture', name: 'Nourriture & Intendance', is_active: true, created_at: '' },
    },
    {
      id: 'e3',
      type: 'expense',
      unit_id: 'unit-1',
      period_id: 'p-2026',
      created_by: 'u2',
      date: '2026-11-03',
      amount: 100.00,
      category_id: 'cat-materiel',
      custom_category: null,
      payment_method: 'personal_money',
      reimbursement_status: 'pending',
      proof_path: 'unit-1/p3.jpg',
      comment: null,
      created_at: '2026-11-03T10:00:00Z',
      updated_at: '2026-11-03T10:00:00Z',
      category: { id: 'cat-materiel', name: 'Matériel & Tentes', is_active: true, created_at: '' },
    },
  ];

  describe('calculateCategoryBreakdown', () => {
    it('should aggregate amounts by category and compute percentages correctly', () => {
      const breakdown = calculateCategoryBreakdown(dummyExpenses);
      
      // Total is 150.50 + 49.50 + 100 = 300.00 €
      expect(breakdown.length).toBe(2);

      const nourriture = breakdown.find(b => b.categoryId === 'cat-nourriture');
      expect(nourriture).toBeDefined();
      expect(nourriture?.amount).toBe(200.00);
      // 200 / 300 = 66.67%
      expect(nourriture?.percentage).toBeCloseTo(66.67, 1);

      const materiel = breakdown.find(b => b.categoryId === 'cat-materiel');
      expect(materiel).toBeDefined();
      expect(materiel?.amount).toBe(100.00);
      // 100 / 300 = 33.33%
      expect(materiel?.percentage).toBeCloseTo(33.33, 1);
    });

    it('should handle empty expenses without division by zero', () => {
      const breakdown = calculateCategoryBreakdown([]);
      expect(breakdown).toEqual([]);
    });

    it('should assign a valid hex or hsl color to each category slice', () => {
      const breakdown = calculateCategoryBreakdown(dummyExpenses);
      for (const slice of breakdown) {
        expect(slice.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('calculateBudgetStatus', () => {
    it('should return null metrics when budget is not set or 0', () => {
      const statusNoBudget = calculateBudgetStatus(300, null);
      expect(statusNoBudget.allocatedBudget).toBeNull();
      expect(statusNoBudget.remaining).toBeNull();
      expect(statusNoBudget.percentageUsed).toBeNull();
      expect(statusNoBudget.isExceeded).toBe(false);

      const statusZero = calculateBudgetStatus(300, 0);
      expect(statusZero.allocatedBudget).toBeNull();
      expect(statusZero.remaining).toBeNull();
    });

    it('should calculate remaining budget and percentage when within budget', () => {
      // Budget: 1000 €, Spent: 300 € -> Remaining: 700 €, 30% used
      const status = calculateBudgetStatus(300, 1000);
      expect(status.allocatedBudget).toBe(1000);
      expect(status.totalSpent).toBe(300);
      expect(status.remaining).toBe(700);
      expect(status.percentageUsed).toBe(30);
      expect(status.isExceeded).toBe(false);
      expect(status.overspentAmount).toBe(0);
    });

    it('should detect when budget is exceeded and report overspent amount', () => {
      // Budget: 500 €, Spent: 650.50 € -> Over by 150.50 €, remaining = 0 or negative
      const status = calculateBudgetStatus(650.50, 500);
      expect(status.allocatedBudget).toBe(500);
      expect(status.totalSpent).toBe(650.50);
      expect(status.remaining).toBe(-150.50);
      expect(status.percentageUsed).toBeCloseTo(130.1, 1);
      expect(status.isExceeded).toBe(true);
      expect(status.overspentAmount).toBe(150.50);
    });
  });

  describe('Local Budget Storage', () => {
    it('should save and retrieve unit budget for a specific period', () => {
      setUnitBudget('unit-meute-1', 'period-camp-2026', 4500);
      const retrieved = getUnitBudget('unit-meute-1', 'period-camp-2026');
      expect(retrieved).toBe(4500);

      // Clearing budget
      setUnitBudget('unit-meute-1', 'period-camp-2026', null);
      const cleared = getUnitBudget('unit-meute-1', 'period-camp-2026');
      expect(cleared).toBeNull();
    });
  });
});
