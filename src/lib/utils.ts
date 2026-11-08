import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export function parseAmount(input: string): number | null {
  if (!input) return null;
  // Replace comma with dot
  const clean = input.trim().replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return null;
  // Round to 2 decimals
  return Math.round(num * 100) / 100;
}

export function formatDateFr(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}
