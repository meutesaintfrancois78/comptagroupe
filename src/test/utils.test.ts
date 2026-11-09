import { describe, it, expect } from 'bun:test';
import { parseAmount, formatCurrency, formatDateFr } from '../lib/utils';

describe('Utility Functions TDD', () => {
  describe('parseAmount', () => {
    it('should parse valid amount with dot', () => {
      expect(parseAmount('42.50')).toBe(42.5);
    });

    it('should parse valid amount with comma', () => {
      expect(parseAmount('42,50')).toBe(42.5);
    });

    it('should round to 2 decimal places', () => {
      expect(parseAmount('12.345')).toBe(12.35);
    });

    it('should reject negative amounts and zero', () => {
      expect(parseAmount('-5.00')).toBeNull();
      expect(parseAmount('0')).toBeNull();
      expect(parseAmount('0,00')).toBeNull();
    });

    it('should reject invalid strings', () => {
      expect(parseAmount('abc')).toBeNull();
      expect(parseAmount('')).toBeNull();
      expect(parseAmount('12abc')).toBeNull();
      expect(parseAmount('1e3')).toBeNull();
      expect(parseAmount('1E3')).toBeNull();
    });

    it('should accept amounts with spaces like 1 000,50', () => {
      expect(parseAmount('1 000,50')).toBe(1000.5);
      expect(parseAmount('1\u00A0000,50')).toBe(1000.5);
    });

    it('should reject amounts exceeding maximum limit (10 000 €)', () => {
      expect(parseAmount('10000.01')).toBeNull();
      expect(parseAmount('50000')).toBeNull();
      expect(parseAmount('10000')).toBe(10000);
    });
  });

  describe('sumAmounts (precision cents)', () => {
    it('should accurately sum floating point numbers without 0.30000000000000004 bug', () => {
      // 0.1 + 0.2 in standard JS equals 0.30000000000000004
      const expenses = [{ amount: 0.1 }, { amount: 0.2 }];
      // @ts-ignore
      const { sumAmounts } = require('../lib/utils');
      expect(sumAmounts(expenses)).toBe(0.3);
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers with French comma and euro sign', () => {
      const formatted = formatCurrency(42.5);
      expect(formatted).toContain('42,50');
      expect(formatted).toContain('€');
    });
  });

  describe('formatDateFr', () => {
    it('should convert YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(formatDateFr('2026-11-08')).toBe('08/11/2026');
    });
  });
});
