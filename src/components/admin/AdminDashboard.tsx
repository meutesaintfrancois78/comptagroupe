import React, { useState } from 'react';
import { Expense, ExpenseCategory, Unit, Profile, Period } from '@/types/database';
import { AdminExpenseTable } from './AdminExpenseTable';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminUnitCategoryManager } from './AdminUnitCategoryManager';
import { AdminPeriodManager } from './AdminPeriodManager';
import { AdminExportModal } from './AdminExportModal';
import { generateAndDownloadReceiptsZip } from '@/lib/exportZip';
import { Banner } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';

interface AdminDashboardProps {
  expenses: Expense[];
  units: Unit[];
  categories: ExpenseCategory[];
  periods: Period[];
  profiles: Profile[];
  currentAdminId: string;
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  onRefresh: () => void;
}

type AdminTab = 'expenses' | 'users' | 'units_cats' | 'periods';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'expenses', label: 'Dépenses' },
  { id: 'users', label: 'Comptes' },
  { id: 'units_cats', label: 'Unités et catégories' },
  { id: 'periods', label: 'Périodes et clôture' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  expenses,
  units,
  categories,
  periods,
  profiles,
  currentAdminId,
  selectedPeriodId,
  onSelectPeriod,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('expenses');
  const [isExportCsvOpen, setIsExportCsvOpen] = useState(false);
  const [csvExpenses, setCsvExpenses] = useState<Expense[]>([]);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipWarning, setZipWarning] = useState<string | null>(null);

  const selectedPeriodObj = periods.find((p) => p.id === selectedPeriodId);

  // Filtrer les dépenses selon la période active sélectionnée
  const periodExpenses = expenses.filter((e) => e.period_id === selectedPeriodId);

  const handleExportZip = async () => {
    setIsExportingZip(true);
    setZipWarning(null);
    try {
      const pName = selectedPeriodObj ? selectedPeriodObj.name.replace(/\s+/g, '_') : 'Toutes';
      const report = await generateAndDownloadReceiptsZip(periodExpenses, `Justificatifs_${pName}.zip`);
      const n = report.missing.length;
      if (n > 0) {
        setZipWarning(
          n > 1
            ? `${n} justificatifs n'ont pas pu être ajoutés au ZIP (remplacés par une note .txt). Réessaie plus tard.`
            : `1 justificatif n'a pas pu être ajouté au ZIP (remplacé par une note .txt). Réessaie plus tard.`
        );
      }
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-admin flex-col">
      {/* Les 4 onglets : grille 2 × 2 sur téléphone, une rangée de 4 dès 768 px */}
      <nav
        aria-label="Sections admin"
        className="grid grid-cols-2 gap-1.5 border-b-2 border-divider pb-2.5 md:grid-cols-4"
      >
        {TABS.map((t) => {
          const current = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={current ? 'page' : undefined}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'min-h-[44px] rounded-lg border-2 border-line px-2 py-1 text-[13px] font-extrabold leading-tight',
                current ? 'bg-green text-on-color' : 'bg-surface text-ink hover:bg-surface2'
              )}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-col gap-3 pb-5 pt-3.5">
        {activeTab === 'expenses' && (
          <>
            {zipWarning && <Banner tone="warning">{zipWarning}</Banner>}
            <AdminExpenseTable
              expenses={periodExpenses}
              units={units}
              categories={categories}
              periods={periods}
              profiles={profiles}
              selectedPeriodId={selectedPeriodId}
              onSelectPeriod={onSelectPeriod}
              onRefresh={onRefresh}
              onExportCsv={(filtered) => {
                setCsvExpenses(filtered ?? periodExpenses);
                setIsExportCsvOpen(true);
              }}
              onExportZip={handleExportZip}
              isExportingZip={isExportingZip}
            />
          </>
        )}

        {activeTab === 'users' && (
          <AdminUserManagement
            profiles={profiles}
            units={units}
            currentAdminId={currentAdminId}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === 'units_cats' && (
          <AdminUnitCategoryManager units={units} categories={categories} onRefresh={onRefresh} />
        )}

        {activeTab === 'periods' && (
          <AdminPeriodManager periods={periods} expenses={expenses} onRefresh={onRefresh} />
        )}
      </div>

      {/* Export CSV : colonnes au choix, sur les dépenses filtrées */}
      <AdminExportModal
        isOpen={isExportCsvOpen}
        onClose={() => setIsExportCsvOpen(false)}
        expenses={csvExpenses}
        periodName={selectedPeriodObj?.name}
      />
    </div>
  );
};
