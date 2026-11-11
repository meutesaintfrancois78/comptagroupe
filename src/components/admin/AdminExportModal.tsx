import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Expense } from '@/types/database';
import {
  CsvColumnKey,
  CSV_COLUMN_DEFINITIONS,
  generateCsvContent,
  downloadCsv,
} from '@/lib/exportCsv';

interface AdminExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  periodName?: string;
}

// Libellés courts des cases (les en-têtes du fichier CSV restent ceux de CSV_COLUMN_DEFINITIONS)
const COLUMN_LABELS: Record<CsvColumnKey, string> = {
  date: 'Date',
  unit: 'Unité',
  creator: 'Chef',
  amount: 'Montant',
  category: 'Motif',
  payment_method: 'Paiement',
  reimbursement_status: 'Remboursement',
  has_proof: 'Justificatif OK',
  comment: 'Commentaire',
};

export const AdminExportModal: React.FC<AdminExportModalProps> = ({
  isOpen,
  onClose,
  expenses,
  periodName = 'Toutes',
}) => {
  const [selectedCols, setSelectedCols] = useState<Record<CsvColumnKey, boolean>>({
    date: true,
    unit: true,
    creator: true,
    amount: true,
    category: true,
    payment_method: true,
    reimbursement_status: true,
    has_proof: true,
    comment: false,
  });

  const allKeys = Object.keys(CSV_COLUMN_DEFINITIONS) as CsvColumnKey[];
  const activeKeys = allKeys.filter((k) => selectedCols[k]);

  const handleToggle = (key: CsvColumnKey) => {
    setSelectedCols((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    if (activeKeys.length === 0) return;
    const csv = generateCsvContent(expenses, activeKeys);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsv(`Export_Compta_Saint_Martin_${periodName.replace(/\s+/g, '_')}_${dateStr}.csv`, csv);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Export CSV"
      description={`${periodName} · ${expenses.length} dépense${expenses.length > 1 ? 's' : ''} avec les filtres en cours. Choisis les colonnes :`}
    >
      <div className="flex flex-col gap-3.5">
        <fieldset className="m-0 grid grid-cols-2 gap-2 border-0 p-0">
          <legend className="sr-only">Colonnes à exporter</legend>
          {allKeys.map((key) => (
            <label
              key={key}
              className="flex min-h-[46px] min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border-2 border-line px-3 text-[15px] font-bold leading-tight"
            >
              <input
                type="checkbox"
                checked={selectedCols[key]}
                onChange={() => handleToggle(key)}
                className="m-0 h-5 w-5 shrink-0 accent-green"
              />
              <span className="min-w-0 break-words">{COLUMN_LABELS[key]}</span>
            </label>
          ))}
        </fieldset>

        {activeKeys.length === 0 && (
          <p role="status" className="text-[14px] font-semibold text-error">
            Coche au moins une colonne.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="neutral" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={activeKeys.length === 0}>
            Exporter
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
