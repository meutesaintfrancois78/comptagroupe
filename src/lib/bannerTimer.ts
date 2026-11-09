export const DISMISS_DURATION_MS = 3 * 60 * 1000; // 3 minutes = 180 000 ms
export const BANNER_STORAGE_KEY = 'saint_martin_admin_dismiss_until';

export function shouldShowAdminBanner(
  pendingCount: number,
  dismissUntilMs: number | null,
  nowMs: number = Date.now()
): boolean {
  if (pendingCount <= 0) return false;
  if (!dismissUntilMs) return true;
  return nowMs >= dismissUntilMs;
}

export function calculateDismissUntil(nowMs: number = Date.now()): number {
  return nowMs + DISMISS_DURATION_MS;
}

export function getRemainingSeconds(
  dismissUntilMs: number | null,
  nowMs: number = Date.now()
): number {
  if (!dismissUntilMs) return 0;
  const remaining = Math.max(0, Math.ceil((dismissUntilMs - nowMs) / 1000));
  return remaining;
}
