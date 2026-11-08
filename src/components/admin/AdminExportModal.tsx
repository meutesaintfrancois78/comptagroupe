import React, { useState } from 'react';
import { Download } from 'lucide-react';
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
    comment: true,
  });

  const allKeys = Object.keys(CSV_COLUMN_DEFINITIONS) as CsvColumnKey[];

  const handleToggle = (key: CsvColumnKey) => {
    setSelectedCols((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    const activeKeys = allKeys.filter((k) => selectedCols[k]);
    if (activeKeys.length === 0) return;

    const csv = generateCsvContent(expenses, activeKeys);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsv(`Export_Compta_ENF_${periodName.replace(/\s+/g, '_')}_${dateStr}.csv`, csv);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Export CSV modulaire"
      description={`Export de ${expenses.length} dépense(s) pour Excel`}
      className="max-w-md"
    >
      <div className="space-y-4 pt-2">
        <p className="text-xs text-muted-foreground">
          Sélectionne les colonnes à inclure dans le fichier CSV :
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {allKeys.map((key) => {
            const def = CSV_COLUMN_DEFINITIONS[key];
            const isChecked = selectedCols[key];
            return (
              <label
                key={key}
                className="flex items-center justify-between p-2.5 rounded-xl border bg-card hover:bg-accent cursor-pointer text-xs font-semibold"
              >
                <span>{def.label}</span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(key)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
              </label>
            );
          })}
        </div>

        <div className="pt-3 border-t flex justify-end space-x-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button size="sm" variant="default" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Télécharger le CSV
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
