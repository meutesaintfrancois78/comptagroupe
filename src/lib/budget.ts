import { Expense, ExpenseCategory } from '@/types/database';
import { sumAmounts } from './utils';

export interface CategorySlice {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface BudgetStatus {
  allocatedBudget: number | null;
  totalSpent: number;
  remaining: number | null;
  percentageUsed: number | null;
  isExceeded: boolean;
  overspentAmount: number;
}

// Couleurs scoutes et distinctes pour le Donut chart
const CATEGORY_COLORS = [
  '#2d6a4f', // Vert forêt / scout
  '#1d3557', // Bleu marine
  '#e76f51', // Terre cuite / Orange
  '#e9c46a', // Jaune ambre
  '#457b9d', // Bleu ciel grisé
  '#9b5de5', // Pourpre / Violet
  '#f15bb5', // Rose
  '#00bbf9', // Cyan
  '#588157', // Vert sauge
  '#6c757d', // Gris ardoise (pour Autre)
];

/**
 * Agrège les dépenses par catégorie et calcule la répartition en pourcentage.
 */
export function calculateCategoryBreakdown(
  expenses: Expense[],
  categories?: ExpenseCategory[]
): CategorySlice[] {
  if (!expenses || expenses.length === 0) {
    return [];
  }

  const categoryMap = new Map<string, { name: string; amounts: number[] }>();

  // Pré-remplir avec les catégories fournies si disponibles
  if (categories) {
    for (const cat of categories) {
      categoryMap.set(cat.id, { name: cat.name, amounts: [] });
    }
  }

  for (const exp of expenses) {
    const catId = exp.category_id || 'sans-categorie';
    const catName = exp.category?.name || (catId === 'sans-categorie' ? 'Sans catégorie' : 'Autre');

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { name: catName, amounts: [] });
    }

    const current = categoryMap.get(catId)!;
    current.amounts.push(exp.amount);
    if (!current.name && catName) {
      current.name = catName;
    }
  }

  const allAmounts: number[] = [];
  const slicesRaw: { id: string; name: string; amount: number }[] = [];

  for (const [id, data] of categoryMap.entries()) {
    if (data.amounts.length === 0) continue;
    const catTotal = sumAmounts(data.amounts);
    slicesRaw.push({ id, name: data.name, amount: catTotal });
    allAmounts.push(...data.amounts);
  }

  const grandTotal = sumAmounts(allAmounts);
  if (grandTotal <= 0) {
    return [];
  }

  // Tri par montant décroissant
  slicesRaw.sort((a, b) => b.amount - a.amount);

  return slicesRaw.map((item, idx) => {
    const percentage = Math.round((item.amount / grandTotal) * 10000) / 100;
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    return {
      categoryId: item.id,
      categoryName: item.name,
      amount: item.amount,
      percentage,
      color,
    };
  });
}

/**
 * Calcule l'état d'avancement par rapport au budget alloué.
 */
export function calculateBudgetStatus(
  totalSpent: number,
  allocatedBudget: number | null | undefined
): BudgetStatus {
  if (!allocatedBudget || allocatedBudget <= 0) {
    return {
      allocatedBudget: null,
      totalSpent,
      remaining: null,
      percentageUsed: null,
      isExceeded: false,
      overspentAmount: 0,
    };
  }

  const diffCents = Math.round((allocatedBudget - totalSpent) * 100);
  const remaining = diffCents / 100;
  const isExceeded = remaining < 0;
  const overspentAmount = isExceeded ? Math.abs(remaining) : 0;
  const percentageUsed = Math.round((totalSpent / allocatedBudget) * 1000) / 10;

  return {
    allocatedBudget,
    totalSpent,
    remaining,
    percentageUsed,
    isExceeded,
    overspentAmount,
  };
}

const BUDGET_STORAGE_PREFIX = 'compta_budget_';

/**
 * Récupère le budget alloué à une unité pour une période donnée depuis le stockage local.
 */
export function getUnitBudget(unitId: string, periodId: string): number | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    // Mode headless / test mock
    const globalMock = (globalThis as any).__mockStorage;
    if (globalMock) {
      const val = globalMock[`${BUDGET_STORAGE_PREFIX}${unitId}_${periodId}`];
      return val ? parseFloat(val) : null;
    }
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${BUDGET_STORAGE_PREFIX}${unitId}_${periodId}`);
    if (!raw) return null;
    const parsed = parseFloat(raw);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Enregistre le budget alloué pour une unité et une période.
 */
export function setUnitBudget(unitId: string, periodId: string, budget: number | null): void {
  const key = `${BUDGET_STORAGE_PREFIX}${unitId}_${periodId}`;

  if (typeof window === 'undefined' || !window.localStorage) {
    // Mode headless / test mock
    if (!(globalThis as any).__mockStorage) {
      (globalThis as any).__mockStorage = {};
    }
    if (budget === null || budget <= 0) {
      delete (globalThis as any).__mockStorage[key];
    } else {
      (globalThis as any).__mockStorage[key] = String(budget);
    }
    return;
  }

  try {
    if (budget === null || budget <= 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, String(budget));
    }
  } catch {
    // Ignore storage quota errors
  }
}
