import { describe, it, expect } from 'bun:test';
import {
  shouldShowChefProofBanner,
  shouldShowReminderBanner,
  calculateDismissUntil,
  getRemainingSeconds,
  getChefProofStorageKey,
  DISMISS_DURATION_MS,
  CHEF_PROOF_BANNER_KEY_PREFIX,
} from '../lib/bannerTimer';
import { hasValidProof } from '../lib/permissions';
import { Expense } from '../types/database';

describe('Chef Missing Proof Banner Timer TDD', () => {
  const baseTime = 1700000000000;

  it('should generate unit-specific storage key', () => {
    expect(getChefProofStorageKey('unit-42')).toBe(`${CHEF_PROOF_BANNER_KEY_PREFIX}unit-42`);
    expect(getChefProofStorageKey(null)).toBe('saint_martin_chef_proof_dismiss_until');
    expect(getChefProofStorageKey(undefined)).toBe('saint_martin_chef_proof_dismiss_until');
  });

  it('should not show chef banner if there are 0 missing receipts', () => {
    expect(shouldShowChefProofBanner(0, null, baseTime)).toBe(false);
  });

  it('should show chef banner immediately if missing receipts exist and never dismissed', () => {
    expect(shouldShowChefProofBanner(3, null, baseTime)).toBe(true);
  });

  it('should hide chef banner during the 3 minutes window after dismiss or deferred submission', () => {
    const dismissUntil = calculateDismissUntil(baseTime);
    const oneMinLater = baseTime + 60 * 1000;
    expect(shouldShowChefProofBanner(3, dismissUntil, oneMinLater)).toBe(false);
    expect(getRemainingSeconds(dismissUntil, oneMinLater)).toBe(120);
  });

  it('should re-trigger chef banner once 3 minutes have elapsed', () => {
    const dismissUntil = calculateDismissUntil(baseTime);
    const afterThreeMinutes = baseTime + DISMISS_DURATION_MS + 500;
    expect(shouldShowChefProofBanner(3, dismissUntil, afterThreeMinutes)).toBe(true);
    expect(getRemainingSeconds(dismissUntil, afterThreeMinutes)).toBe(0);
  });

  it('should accurately filter expenses with missing receipts vs valid receipts', () => {
    const expenses: Partial<Expense>[] = [
      { id: 'e1', proof_path: 'unit-1/receipt1.jpg' },
      { id: 'e2', proof_path: '' },
      { id: 'e3', proof_path: '   ' },
      { id: 'e4', proof_path: null as any },
      { id: 'e5', proof_path: undefined as any },
      { id: 'e6', proof_path: 'unit-1/facture.pdf' },
    ];

    const missingExpenses = expenses.filter((e) => !hasValidProof(e as Expense));
    expect(missingExpenses.length).toBe(4);
    expect(missingExpenses.map((e) => e.id)).toEqual(['e2', 'e3', 'e4', 'e5']);

    const validExpenses = expenses.filter((e) => hasValidProof(e as Expense));
    expect(validExpenses.length).toBe(2);
    expect(validExpenses.map((e) => e.id)).toEqual(['e1', 'e6']);
  });
});
