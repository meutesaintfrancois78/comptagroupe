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

  // Strict regex check: digits, then optionally a comma or dot and 1 or 2 decimals (cents)
  if (!/^\d+([.,]\d{1,2})?$/.test(sanitized)) {
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
 * Message d'erreur à afficher pour un montant saisi, ou null s'il est valide.
 * Distingue le format, les centimes, le zéro et le plafond pour que le chef sache quoi corriger.
 */
export function amountError(input: string, maxAmount: number = 10000): string | null {
  const sanitized = (input || '').trim().replace(/[\s\u00A0\u202F]/g, '');
  if (!sanitized) return 'Saisis le montant de la dépense.';
  if (/^\d+[.,]\d{3,}$/.test(sanitized)) return 'Deux chiffres au plus après la virgule (les centimes).';
  if (!/^\d+([.,]\d{1,2})?$/.test(sanitized)) return 'Montant non reconnu : écris par exemple 12,50.';
  const num = parseFloat(sanitized.replace(',', '.'));
  if (!(num > 0)) return 'Le montant doit être supérieur à 0 €.';
  if (num > maxAmount) return `Le montant ne peut pas dépasser ${formatCurrency(maxAmount)}.`;
  return null;
}

/** Date du jour au format AAAA-MM-JJ, dans le fuseau du téléphone (et non en UTC) */
export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Message d'erreur pour la date d'une dépense, ou null si elle est valide */
export function expenseDateError(date: string, minDate?: string | null, today: string = todayLocal()): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Indique la date de la dépense.';
  if (date > today) return 'La date ne peut pas être dans le futur.';
  if (minDate && date < minDate) return 'La date est antérieure au début de la période en cours.';
  return null;
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
