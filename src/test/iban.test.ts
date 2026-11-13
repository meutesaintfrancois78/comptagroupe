import { describe, it, expect } from 'bun:test';
import {
  cleanIban,
  formatIban,
  isValidIban,
  getIbanValidationError,
} from '@/lib/iban';

describe('IBAN Validation & Formatting TDD', () => {
  // IBANs valides de test
  const validFrenchIban1 = 'FR76 3000 6000 0112 3456 7890 189';
  const validFrenchIban2 = 'FR14 2004 1010 0505 0001 3M02 606';
  const validBelgianIban = 'BE68 5390 0754 7034';
  const validGermanIban = 'DE89 3704 0044 0532 0130 00';

  describe('cleanIban', () => {
    it('should strip spaces, dashes and non-alphanumeric chars', () => {
      expect(cleanIban(' FR76 3000-6000.0112 3456 7890 189 ')).toBe('FR7630006000011234567890189');
    });

    it('should convert lowercase letters to uppercase', () => {
      expect(cleanIban('fr1420041010050500013m02606')).toBe('FR1420041010050500013M02606');
    });

    it('should return empty string for null/undefined/empty', () => {
      expect(cleanIban(null)).toBe('');
      expect(cleanIban(undefined)).toBe('');
      expect(cleanIban('')).toBe('');
    });
  });

  describe('formatIban', () => {
    it('should format into 4-character chunks separated by single spaces', () => {
      expect(formatIban('FR7630006000011234567890189')).toBe('FR76 3000 6000 0112 3456 7890 189');
    });

    it('should handle partial entries during typing', () => {
      expect(formatIban('fr763000')).toBe('FR76 3000');
      expect(formatIban('fr7630006')).toBe('FR76 3000 6');
    });

    it('should return empty string if input is empty', () => {
      expect(formatIban('')).toBe('');
      expect(formatIban(null)).toBe('');
    });
  });

  describe('isValidIban', () => {
    it('should validate legitimate French and SEPA IBANs with correct Modulo 97', () => {
      expect(isValidIban(validFrenchIban1)).toBe(true);
      expect(isValidIban(validFrenchIban2)).toBe(true);
      expect(isValidIban(validBelgianIban)).toBe(true);
      expect(isValidIban(validGermanIban)).toBe(true);
    });

    it('should reject invalid or altered digits (bad checksum)', () => {
      // 1 digit altered in validFrenchIban1 (last digit 9 -> 8)
      expect(isValidIban('FR76 3000 6000 0112 3456 7890 188')).toBe(false);
      // Altered check digits
      expect(isValidIban('FR00 3000 6000 0112 3456 7890 189')).toBe(false);
    });

    it('should reject too short or too long French IBANs', () => {
      expect(isValidIban('FR76 3000 6000 0112 3456')).toBe(false);
      expect(isValidIban('FR76 3000 6000 0112 3456 7890 1890 12')).toBe(false);
    });

    it('should reject invalid format or special characters', () => {
      expect(isValidIban('123456789012345678901234567')).toBe(false);
      expect(isValidIban('FRXX 3000 6000 0112 3456 7890 189')).toBe(false);
    });
  });

  describe('getIbanValidationError', () => {
    it('should return null for valid IBAN', () => {
      expect(getIbanValidationError(validFrenchIban1)).toBeNull();
      expect(getIbanValidationError(validFrenchIban2)).toBeNull();
    });

    it('should report missing IBAN', () => {
      expect(getIbanValidationError('')).toContain('obligatoire');
      expect(getIbanValidationError(null)).toContain('obligatoire');
    });

    it('should report incomplete French IBAN with exact missing character count', () => {
      const partial = 'FR76 3000 6000 0112 3456 7890 1'; // 25 chars instead of 27
      const error = getIbanValidationError(partial);
      expect(error).toContain('incomplet');
      expect(error).toContain('2 caractères');
    });

    it('should report invalid checksum when length is correct but digits are wrong', () => {
      const badChecksum = 'FR76 3000 6000 0112 3456 7890 188';
      const error = getIbanValidationError(badChecksum);
      expect(error).toContain('Clé de contrôle IBAN invalide');
    });
  });
});
