import { Expense } from '@/types/database';
import { formatDateFr } from './utils';
import { hasValidProof } from './permissions';

export type CsvColumnKey =
  | 'date'
  | 'unit'
  | 'creator'
  | 'amount'
  | 'category'
  | 'payment_method'
  | 'reimbursement_status'
  | 'has_proof'
  | 'comment';

export const CSV_COLUMN_DEFINITIONS: Record<CsvColumnKey, { label: string; getValue: (e: Expense) => string }> = {
  date: {
    label: 'Date',
    getValue: (e) => formatDateFr(e.date),
  },
  unit: {
    label: 'Unité',
    getValue: (e) => e.unit?.name || 'Inconnue',
  },
  creator: {
    label: 'Chef',
    getValue: (e) => (e.creator ? `${e.creator.first_name} ${e.creator.last_name}` : 'Chef'),
  },
  amount: {
    label: 'Montant',
    getValue: (e) => e.amount.toFixed(2).replace('.', ','),
  },
  category: {
    label: 'Catégorie',
    getValue: (e) => (e.custom_category ? `Autre (${e.custom_category})` : e.category?.name || 'Inconnu'),
  },
  payment_method: {
    label: 'Mode de paiement',
    getValue: (e) => (e.payment_method === 'personal_money' ? 'Argent personnel' : "Argent de l'unité"),
  },
  reimbursement_status: {
    label: 'Statut remboursement',
    getValue: (e) => {
      if (e.payment_method !== 'personal_money') return 'Sans objet';
      return e.reimbursement_status === 'reimbursed' ? 'Remboursée' : 'À rembourser';
    },
  },
  has_proof: {
    label: 'Justificatif OK',
    getValue: (e) => (hasValidProof(e) ? 'Oui' : 'Non'),
  },
  comment: {
    label: 'Commentaire',
    getValue: (e) => e.comment || '',
  },
};

export function escapeCsvField(field: string): string {
  // Neutralise l'injection de formule (CWE-1236) : on retire les caractères
  // qui lancent une formule en tête de champ (=, +, -, @, tabulation, retour chariot),
  // y compris s'ils se répètent ou alternent avec des espaces.
  const safe = field.trim().replace(/^[=+\-@\t\r\s]+/, '');
  if (safe.includes(';') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function generateCsvContent(
  expenses: Expense[],
  selectedColumns: CsvColumnKey[] = [
    'date',
    'unit',
    'creator',
    'amount',
    'category',
    'payment_method',
    'reimbursement_status',
    'has_proof',
    'comment',
  ]
): string {
  // UTF-8 BOM pour ouverture propre sans bug sous Excel Windows / Mac
  const BOM = '\uFEFF';

  const headers = selectedColumns.map((col) => CSV_COLUMN_DEFINITIONS[col].label).join(';');

  const rows = expenses.map((exp) => {
    return selectedColumns
      .map((col) => escapeCsvField(CSV_COLUMN_DEFINITIONS[col].getValue(exp)))
      .join(';');
  });

  return BOM + [headers, ...rows].join('\r\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function normalizeReceiptFileName(expense: Expense, extension: string = 'jpg'): string {
  const dateStr = expense.date;
  const unitName = (expense.unit?.name || 'Unite').replace(/\s+/g, '-');
  const amountStr = expense.amount.toFixed(2);
  const cleanExt = extension.replace(/^\./, '');
  return `${dateStr}_${unitName}_${amountStr}EUR.${cleanExt}`;
}
