import { describe, it, expect } from 'bun:test';
import { amountError, expenseDateError, todayLocal, parseAmount, formatCurrency, formatDateFr } from '../lib/utils';

describe('Utility Functions TDD', () => {
  describe('parseAmount', () => {
    it('should parse valid amount with dot', () => {
      expect(parseAmount('42.50')).toBe(42.5);
    });

    it('should parse valid amount with comma', () => {
      expect(parseAmount('42,50')).toBe(42.5);
    });

    it('should refuse more than 2 decimals instead of rounding silently', () => {
      expect(parseAmount('12.345')).toBeNull();
      expect(parseAmount('12,5')).toBe(12.5);
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

describe('Messages de saisie', () => {
  it('explique pourquoi un montant est refusé', () => {
    expect(amountError('')).toBe('Saisis le montant de la dépense.');
    expect(amountError('12,555')).toBe('Deux chiffres au plus après la virgule (les centimes).');
    expect(amountError('abc')).toBe('Montant non reconnu : écris par exemple 12,50.');
    expect(amountError('0')).toBe('Le montant doit être supérieur à 0 €.');
    expect(amountError('20000')).toContain('ne peut pas dépasser');
    expect(amountError('1 000,50')).toBeNull();
  });

  it('refuse une date future ou avant la période', () => {
    expect(expenseDateError('2026-11-10', '2026-09-01', '2026-11-09')).toBe('La date ne peut pas être dans le futur.');
    expect(expenseDateError('2026-08-31', '2026-09-01', '2026-11-09')).toBe('La date est antérieure au début de la période en cours.');
    expect(expenseDateError('2026-11-09', '2026-09-01', '2026-11-09')).toBeNull();
    expect(expenseDateError('')).toBe('Indique la date de la dépense.');
  });

  it('donne la date du jour dans le fuseau local', () => {
    expect(todayLocal(new Date(2026, 10, 9, 0, 30))).toBe('2026-11-09');
  });
});
