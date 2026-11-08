import React, { useState, useMemo } from 'react';
import {
  FileText,
  Trash2,
  Edit2,
  History,
  CheckCircle2,
  Filter,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Expense, ExpenseCategory, Unit, Profile, Period } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateFr } from '@/lib/utils';
import { ExpenseEditModal } from '@/components/chef/ExpenseEditModal';
import { ExpenseHistoryModal } from '@/components/shared/ExpenseHistoryModal';
import { supabase } from '@/lib/supabase';

interface AdminExpenseTableProps {
  expenses: Expense[];
  units: Unit[];
  categories: ExpenseCategory[];
  periods: Period[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  onRefresh: () => void;
  onExportCsv?: () => void;
  onExportZip?: () => void;
}

export const AdminExpenseTable: React.FC<AdminExpenseTableProps> = ({
  expenses,
  units,
  categories,
  periods,
  selectedPeriodId,
  onSelectPeriod,
  onRefresh,
  onExportCsv,
  onExportZip,
}) => {
  // Filtres
  const [filterUnitId, setFilterUnitId] = useState<string>('all');
  const [filterChefId, setFilterChefId] = useState<string>('all');
  const [filterReimbursement, setFilterReimbursement] = useState<string>('all');

  // Modales
  const [selectedForEdit, setSelectedForEdit] = useState<Expense | null>(null);
  const [selectedForHistory, setSelectedForHistory] = useState<Expense | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Liste unique des chefs présents dans les dépenses pour le filtre
  const chefsList = useMemo(() => {
    const map = new Map<string, string>();
    expenses.forEach((e) => {
      if (e.creator) {
        map.set(e.creator.id, `${e.creator.first_name} ${e.creator.last_name}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);

  // Filtrage des dépenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (filterUnitId !== 'all' && exp.unit_id !== filterUnitId) return false;
      if (filterChefId !== 'all' && exp.created_by !== filterChefId) return false;
      if (filterReimbursement !== 'all') {
        if (filterReimbursement === 'pending' && exp.reimbursement_status !== 'pending') return false;
        if (filterReimbursement === 'reimbursed' && exp.reimbursement_status !== 'reimbursed') return false;
        if (filterReimbursement === 'unit' && exp.payment_method !== 'unit_money') return false;
      }
      return true;
    });
  }, [expenses, filterUnitId, filterChefId, filterReimbursement]);

  // Total recalculé selon le filtre actif
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  }, [filteredExpenses]);

  // Total en attente de remboursement selon le filtre
  const pendingReimbursementTotal = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.reimbursement_status === 'pending')
      .reduce((acc, exp) => acc + exp.amount, 0);
  }, [filteredExpenses]);

  // Action : Rembourser (Tout ou rien, passage en "remboursée")
  const handleToggleReimbursed = async (exp: Expense) => {
    const newStatus = exp.reimbursement_status === 'reimbursed' ? 'pending' : 'reimbursed';
    const { error } = await supabase
      .from('expenses')
      .update({ reimbursement_status: newStatus })
      .eq('id', exp.id);

    if (!error) {
      if (newStatus === 'reimbursed') {
        setNotificationMsg(`Dépense de ${exp.creator?.first_name || 'chef'} marquée comme remboursée (email de confirmation envoyé).`);
        setTimeout(() => setNotificationMsg(null), 4000);
      }
      onRefresh();
    }
  };

  // Action : Supprimer une dépense (Admins uniquement)
  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Es-tu certain de vouloir supprimer cette dépense ? Cette action est irréversible.')) {
      return;
    }
    setIsDeleting(expenseId);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) {
        alert(error.message || 'Erreur lors de la suppression.');
      } else {
        onRefresh();
      }
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {notificationMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Barre supérieure : Sélecteur de période & Boutons d'export */}
      <div className="bg-card rounded-3xl border p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Période active :
          </span>
          <select
            value={selectedPeriodId}
            onChange={(e) => onSelectPeriod(e.target.value)}
            className="h-10 text-sm font-extrabold rounded-xl border border-input bg-background px-3 py-1 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.status === 'closed' ? '(Clôturée)' : '(Ouverte)'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {onExportCsv && (
            <Button size="sm" variant="outline" onClick={onExportCsv} className="text-xs font-bold">
              <Download className="w-3.5 h-3.5 mr-1" />
              Export CSV
            </Button>
          )}
          {onExportZip && (
            <Button size="sm" variant="outline" onClick={onExportZip} className="text-xs font-bold">
              <Download className="w-3.5 h-3.5 mr-1" />
              Justificatifs ZIP
            </Button>
          )}
        </div>
      </div>

      {/* Barre de filtres combinables */}
      <div className="bg-card rounded-2xl border p-4 shadow-sm space-y-3">
        <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtres dynamiques</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Filtre par Unité */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Unité
            </label>
            <select
              value={filterUnitId}
              onChange={(e) => setFilterUnitId(e.target.value)}
              className="h-9 w-full text-xs font-medium rounded-lg border border-input bg-background px-2.5 py-1"
            >
              <option value="all">Toutes les unités ({units.length})</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par Chef */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Chef déclarant
            </label>
            <select
              value={filterChefId}
              onChange={(e) => setFilterChefId(e.target.value)}
              className="h-9 w-full text-xs font-medium rounded-lg border border-input bg-background px-2.5 py-1"
            >
              <option value="all">Tous les chefs ({chefsList.length})</option>
              {chefsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par Statut de remboursement */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Remboursement
            </label>
            <select
              value={filterReimbursement}
              onChange={(e) => setFilterReimbursement(e.target.value)}
              className="h-9 w-full text-xs font-medium rounded-lg border border-input bg-background px-2.5 py-1"
            >
              <option value="all">Tous les paiements</option>
              <option value="pending">⏳ À rembourser (perso)</option>
              <option value="reimbursed">✅ Remboursées</option>
              <option value="unit">🏛️ Argent de l'unité</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des dépenses dense & réactif */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/60 border-b text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3">Date</th>
                <th className="p-3">Unité</th>
                <th className="p-3">Chef</th>
                <th className="p-3">Motif</th>
                <th className="p-3 text-right">Montant</th>
                <th className="p-3">Paiement</th>
                <th className="p-3">Remboursement</th>
                <th className="p-3 text-center">Justificatif</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Aucune dépense ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const motifLabel = exp.custom_category
                    ? `Autre (${exp.custom_category})`
                    : exp.category?.name || 'Motif inconnu';
                  const isPersonal = exp.payment_method === 'personal_money';

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="p-3 font-semibold whitespace-nowrap">
                        {formatDateFr(exp.date)}
                      </td>
                      <td className="p-3 font-bold text-foreground">
                        {exp.unit?.name || 'Inconnue'}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {exp.creator ? `${exp.creator.first_name} ${exp.creator.last_name}` : 'Chef'}
                      </td>
                      <td className="p-3 font-medium text-foreground max-w-xs truncate" title={exp.comment || undefined}>
                        {motifLabel}
                        {exp.comment && (
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {exp.comment}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-black text-sm text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isPersonal ? (
                          <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                            Perso
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">
                            Unité
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isPersonal ? (
                          <button
                            type="button"
                            onClick={() => handleToggleReimbursed(exp)}
                            className="focus:outline-none transition-transform active:scale-95"
                            title="Cliquer pour basculer le statut"
                          >
                            {exp.reimbursement_status === 'reimbursed' ? (
                              <Badge variant="success" className="cursor-pointer hover:opacity-80 text-[10px]">
                                Remboursée ✓
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="cursor-pointer hover:opacity-80 text-[10px]">
                                À rembourser
                              </Badge>
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(exp.signed_proof_url || null)}
                          className="w-8 h-8 rounded-lg bg-muted border inline-flex items-center justify-center hover:opacity-80 overflow-hidden"
                          title="Aperçu du justificatif"
                        >
                          {exp.proof_path.endsWith('.pdf') ? (
                            <FileText className="w-4 h-4 text-red-600" />
                          ) : (
                            <img
                              src={exp.signed_proof_url || '/placeholder-receipt.png'}
                              alt="Ticket"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedForEdit(exp)}
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedForHistory(exp)}
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                            title="Historique"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            disabled={isDeleting === exp.id}
                            className="p-1.5 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                            title="Supprimer la dépense (Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Ligne de totalisation en bas de tableau selon les filtres actifs */}
            <tfoot>
              <tr className="bg-muted/80 font-black border-t-2 border-border text-foreground">
                <td colSpan={4} className="p-3.5 text-right font-bold text-xs uppercase tracking-wider">
                  Total filtré ({filteredExpenses.length} dépense{filteredExpenses.length > 1 ? 's' : ''}) :
                </td>
                <td className="p-3.5 text-right text-base text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(filteredTotal)}
                </td>
                <td colSpan={4} className="p-3.5 text-xs text-muted-foreground font-semibold">
                  {pendingReimbursementTotal > 0 && (
                    <span className="text-amber-700 dark:text-amber-400">
                      (dont {formatCurrency(pendingReimbursementTotal)} à rembourser)
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modale d'édition */}
      <ExpenseEditModal
        isOpen={Boolean(selectedForEdit)}
        onClose={() => setSelectedForEdit(null)}
        expense={selectedForEdit}
        categories={categories}
        onUpdated={onRefresh}
      />

      {/* Modale d'historique */}
      <ExpenseHistoryModal
        isOpen={Boolean(selectedForHistory)}
        onClose={() => setSelectedForHistory(null)}
        expenseId={selectedForHistory?.id || null}
        expenseAmount={selectedForHistory?.amount}
      />

      {/* Prévisualisation plein écran du justificatif */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-xl max-h-[85vh] bg-card p-4 rounded-3xl border shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImageUrl}
              alt="Justificatif"
              className="max-w-full max-h-[70vh] rounded-2xl object-contain"
            />
            <div className="mt-4 flex items-center justify-between w-full px-2">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="text-xs text-primary font-bold hover:underline flex items-center"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Télécharger le fichier original
              </a>
              <Button size="sm" variant="outline" onClick={() => setPreviewImageUrl(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
