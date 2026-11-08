import { describe, it, expect } from 'bun:test';
import {
  shouldShowAdminBanner,
  calculateDismissUntil,
  getRemainingSeconds,
  DISMISS_DURATION_MS,
} from '../lib/bannerTimer';

describe('Admin 3-minute Banner Timer TDD', () => {
  const baseTime = 1700000000000;

  it('should not show banner if there are 0 pending accounts', () => {
    expect(shouldShowAdminBanner(0, null, baseTime)).toBe(false);
  });

  it('should show banner immediately if pending accounts exist and never dismissed', () => {
    expect(shouldShowAdminBanner(2, null, baseTime)).toBe(true);
  });

  it('should hide banner while within the 3 minutes window', () => {
    const dismissUntil = calculateDismissUntil(baseTime); // baseTime + 180s
    // 1 minute later
    const oneMinLater = baseTime + 60 * 1000;
    expect(shouldShowAdminBanner(2, dismissUntil, oneMinLater)).toBe(false);
    expect(getRemainingSeconds(dismissUntil, oneMinLater)).toBe(120);
  });

  it('should re-trigger banner once 3 minutes have elapsed', () => {
    const dismissUntil = calculateDismissUntil(baseTime);
    // 3 minutes and 1 second later
    const afterTime = baseTime + DISMISS_DURATION_MS + 1000;
    expect(shouldShowAdminBanner(2, dismissUntil, afterTime)).toBe(true);
    expect(getRemainingSeconds(dismissUntil, afterTime)).toBe(0);
  });
});
