import React, { useState } from 'react';
import {
  Receipt,
  Users,
  Tags,
  Calendar,
  Download,
  Shield,
  Layers,
} from 'lucide-react';
import { Expense, ExpenseCategory, Unit, Profile, Period } from '@/types/database';
import { AdminExpenseTable } from './AdminExpenseTable';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminUnitCategoryManager } from './AdminUnitCategoryManager';
import { AdminPeriodManager } from './AdminPeriodManager';
import { AdminExportModal } from './AdminExportModal';
import { generateAndDownloadReceiptsZip } from '@/lib/exportZip';

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
  const [activeTab, setActiveTab] = useState<'expenses' | 'users' | 'units_cats' | 'periods'>('expenses');
  const [isExportCsvOpen, setIsExportCsvOpen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const selectedPeriodObj = periods.find((p) => p.id === selectedPeriodId);

  // Filtrer les dépenses selon la période active sélectionnée
  const periodExpenses = expenses.filter((e) => e.period_id === selectedPeriodId);

  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      const pName = selectedPeriodObj ? selectedPeriodObj.name.replace(/\s+/g, '_') : 'Toutes';
      await generateAndDownloadReceiptsZip(periodExpenses, `Justificatifs_${pName}.zip`);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Barre d'onglets administrative */}
      <div role="tablist" aria-label="Sections d'administration" className="flex border-b overflow-x-auto no-scrollbar space-x-1 sm:space-x-2">
        <button
          role="tab"
          aria-selected={activeTab === 'expenses'}
          aria-label={`Dépenses (${periodExpenses.length})`}
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Dépenses ({periodExpenses.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'users'}
          aria-label={`Comptes et rôles (${profiles.length})`}
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Comptes & Rôles ({profiles.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'units_cats'}
          aria-label="Unités et catégories de dépenses"
          onClick={() => setActiveTab('units_cats')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'units_cats'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Unités & Catégories</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'periods'}
          aria-label="Gestion des périodes et clôture"
          onClick={() => setActiveTab('periods')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'periods'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Périodes & Clôture</span>
        </button>
      </div>

      {/* Contenu selon onglet actif */}
      {activeTab === 'expenses' && (
        <AdminExpenseTable
          expenses={periodExpenses}
          units={units}
          categories={categories}
          periods={periods}
          profiles={profiles}
          selectedPeriodId={selectedPeriodId}
          onSelectPeriod={onSelectPeriod}
          onRefresh={onRefresh}
          onExportCsv={() => setIsExportCsvOpen(true)}
          onExportZip={handleExportZip}
        />
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
        <AdminUnitCategoryManager
          units={units}
          categories={categories}
          onRefresh={onRefresh}
        />
      )}

      {activeTab === 'periods' && (
        <AdminPeriodManager
          periods={periods}
          expenses={expenses}
          onRefresh={onRefresh}
        />
      )}

      {/* Modale d'export CSV modulaire */}
      <AdminExportModal
        isOpen={isExportCsvOpen}
        onClose={() => setIsExportCsvOpen(false)}
        expenses={periodExpenses}
        periodName={selectedPeriodObj?.name}
      />
    </div>
  );
};
