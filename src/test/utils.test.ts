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
