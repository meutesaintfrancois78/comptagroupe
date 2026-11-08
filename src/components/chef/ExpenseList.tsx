import React, { useState } from 'react';
import {
  FileText,
  Edit2,
  History,
  ExternalLink,
  ChevronRight,
  Receipt,
  Download,
} from 'lucide-react';
import { Expense, ExpenseCategory, Unit } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateFr } from '@/lib/utils';
import { ExpenseEditModal } from './ExpenseEditModal';
import { ExpenseHistoryModal } from '@/components/shared/ExpenseHistoryModal';

interface ExpenseListProps {
  expenses: Expense[];
  unit: Unit;
  categories: ExpenseCategory[];
  onRefresh: () => void;
  onNewExpense: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  unit,
  categories,
  onRefresh,
  onNewExpense,
}) => {
  const [selectedForEdit, setSelectedForEdit] = useState<Expense | null>(null);
  const [selectedForHistory, setSelectedForHistory] = useState<Expense | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const totalAmount = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  return (
    <div className="space-y-4">
      {/* En-tête de l'unité et total */}
      <div className="bg-card rounded-3xl border p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🏕️</span>
            <h2 className="text-xl font-extrabold text-foreground">{unit.name}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toutes les dépenses déclarées par les chefs de ton unité
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Total engagé
            </span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <Button
            size="default"
            variant="default"
            onClick={onNewExpense}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
          >
            + Nouvelle dépense
          </Button>
        </div>
      </div>

      {/* Liste des dépenses (Adaptée mobile-first et tableau sur desktop) */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className="py-12 text-center bg-card rounded-3xl border p-6">
            <Receipt className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-bold text-foreground text-lg">Aucune dépense enregistrée</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Utilise le bouton "+ Nouvelle dépense" pour saisir le premier achat de ton unité.
            </p>
          </div>
        ) : (
          expenses.map((exp) => {
            const isPersonal = exp.payment_method === 'personal_money';
            const motifLabel = exp.custom_category
              ? `Autre (${exp.custom_category})`
              : exp.category?.name || 'Motif inconnu';

            return (
              <div
                key={exp.id}
                className="bg-card rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Info principale */}
                <div className="flex items-start space-x-3.5">
                  {/* Vignette justificatif */}
                  <div
                    onClick={() => setPreviewImageUrl(exp.signed_proof_url || null)}
                    className="w-12 h-12 rounded-xl bg-muted border flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                    title="Voir le justificatif"
                  >
                    {exp.proof_path.endsWith('.pdf') ? (
                      <FileText className="w-6 h-6 text-red-600" />
                    ) : (
                      <img
                        src={exp.signed_proof_url || '/placeholder-receipt.png'}
                        alt="Justificatif"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-base text-foreground">
                        {motifLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {formatDateFr(exp.date)}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground mt-0.5">
                      Par <strong className="text-foreground">{exp.creator ? `${exp.creator.first_name} ${exp.creator.last_name}` : 'Un chef'}</strong>
                    </div>

                    {exp.comment && (
                      <p className="text-xs italic text-muted-foreground mt-1 bg-muted/40 px-2 py-0.5 rounded-md inline-block">
                        "{exp.comment}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Montant, Badges & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(exp.amount)}
                    </div>
                    <div className="mt-0.5 flex items-center space-x-1.5">
                      {isPersonal ? (
                        exp.reimbursement_status === 'reimbursed' ? (
                          <Badge variant="success" className="text-[10px] px-1.5 py-0">
                            Remboursée
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            À rembourser
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Unité
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions (Modifier & Historique) - Jamais de suppression côté chef ! */}
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedForEdit(exp)}
                      title="Modifier la dépense"
                      className="h-9 px-2.5 text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedForHistory(exp)}
                      title="Historique des modifications"
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
            className="relative max-w-xl max-h-[85vh] bg-card p-3 rounded-2xl border shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImageUrl}
              alt="Justificatif grand format"
              className="max-w-full max-h-[70vh] rounded-xl object-contain"
            />
            <div className="mt-3 flex items-center space-x-3 w-full justify-between px-2">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="text-xs text-primary font-bold hover:underline flex items-center"
              >
                <Download className="w-4 h-4 mr-1" />
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
