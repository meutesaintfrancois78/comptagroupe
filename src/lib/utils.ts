import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Expense, Profile } from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Strict amount parser:
 * - Strips all standard and non-breaking spaces (\s, \u00A0, \u202F)
 * - Rejects scientific notation (1e3, 1E3)
 * - Rejects trailing characters (12abc)
 * - Enforces standard currency regex: ^\d+([.,]\d{1,2})?$
 * - Caps at maxAmount (default 10 000 €)
 */
export function parseAmount(input: string, maxAmount: number = 10000): number | null {
  if (!input) return null;

  // Remove whitespace and non-breaking spaces
  const sanitized = input.trim().replace(/[\s\u00A0\u202F]/g, '');

  // Strict regex check: only numbers and optional comma/dot followed by digits
  if (!/^\d+([.,]\d+)?$/.test(sanitized)) {
    return null;
  }

  const clean = sanitized.replace(',', '.');
  const num = parseFloat(clean);

  if (isNaN(num) || num <= 0 || num > maxAmount) {
    return null;
  }

  return Math.round(num * 100) / 100;
}

/**
 * Sums amounts in integer cents to eliminate floating-point precision issues (e.g. 0.1 + 0.2).
 * Supports array of numbers or array of objects with amount property.
 */
export function sumAmounts(items: (number | { amount?: number | null })[]): number {
  const totalCents = items.reduce<number>((acc, item) => {
    const val = typeof item === 'number' ? item : (item?.amount || 0);
    return acc + Math.round((val || 0) * 100);
  }, 0);
  return totalCents / 100;
}

export interface ChefFilterItem {
  id: string;
  name: string;
}

/**
 * Builds a deduplicated, sorted list of chefs for filtering,
 * combining registered profiles and creators found in expenses.
 */
export function getChefsFilterList(
  expenses: Partial<Expense>[] = [],
  profiles: Profile[] = []
): ChefFilterItem[] {
  const map = new Map<string, string>();

  if (profiles) {
    profiles.forEach((p) => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      map.set(p.id, fullName || p.email || 'Chef sans nom');
    });
  }

  if (expenses) {
    expenses.forEach((e) => {
      if (e.creator && !map.has(e.creator.id)) {
        const fullName = `${e.creator.first_name || ''} ${e.creator.last_name || ''}`.trim();
        map.set(e.creator.id, fullName || 'Chef');
      }
    });
  }

  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}


export function formatDateFr(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}
