import { describe, it, expect } from 'bun:test';

describe('Password Recovery Logic TDD', () => {
  const validatePasswordChange = (newPass: string, confirmPass: string): { isValid: boolean; error?: string } => {
    if (!newPass || newPass.length < 8) {
      return { isValid: false, error: 'Le mot de passe doit comporter au moins 8 caractères.' };
    }
    if (newPass !== confirmPass) {
      return { isValid: false, error: 'Les deux mots de passe ne correspondent pas.' };
    }
    return { isValid: true };
  };

  const isRecoveryUrl = (url: string): boolean => {
    return url.includes('type=recovery');
  };

  it('should reject passwords shorter than 8 characters', () => {
    expect(validatePasswordChange('1234567', '1234567')).toEqual({
      isValid: false,
      error: 'Le mot de passe doit comporter au moins 8 caractères.',
    });
    expect(validatePasswordChange('', '')).toEqual({
      isValid: false,
      error: 'Le mot de passe doit comporter au moins 8 caractères.',
    });
  });

  it('should reject mismatched passwords', () => {
    expect(validatePasswordChange('PassWord123!', 'PassWord123?')).toEqual({
      isValid: false,
      error: 'Les deux mots de passe ne correspondent pas.',
    });
  });

  it('should accept matching passwords of 8+ characters', () => {
    expect(validatePasswordChange('PassWord123!', 'PassWord123!')).toEqual({
      isValid: true,
    });
  });

  it('should detect recovery token in url hash or query params', () => {
    expect(isRecoveryUrl('https://comptagroupe.vercel.app/#access_token=xyz&type=recovery')).toBe(true);
    expect(isRecoveryUrl('https://comptagroupe.vercel.app/?code=123&type=recovery')).toBe(true);
    expect(isRecoveryUrl('https://comptagroupe.vercel.app/#access_token=xyz')).toBe(false);
  });
});
