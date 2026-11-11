import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  Camera,
  ChevronDown,
  ChevronUp,
  Coins,
  Cross,
  Download,
  Ellipsis,
  FileText,
  History,
  Lock,
  Package,
  PieChart,
  Plus,
  Receipt,
  ShoppingCart,
  Tent,
  Ticket,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Expense, ExpenseCategory, Unit, Period } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { formatCurrency, sumAmounts } from '@/lib/utils';
import { hasValidProof } from '@/lib/permissions';
import {
  calculateCategoryBreakdown,
  calculateBudgetStatus,
  getUnitBudget,
  setUnitBudget,
} from '@/lib/budget';
import { generateCsvContent, downloadCsv } from '@/lib/exportCsv';
import { CategoryDonutChart } from '@/components/shared/CategoryDonutChart';
import { ExpenseEditModal } from './ExpenseEditModal';
import { ExpenseHistoryModal } from '@/components/shared/ExpenseHistoryModal';
import { ProofUploadModal } from './ProofUploadModal';
import { BudgetEditModal } from './BudgetEditModal';

/* ------------------------------------------------------------------ */
/* Aides d'affichage partagées par l'accueil, la liste et le formulaire */
/* ------------------------------------------------------------------ */

/** Icône d'une catégorie, devinée d'après son nom (les catégories viennent de la base) */
export function categoryIcon(name: string | null | undefined): LucideIcon {
  const n = (name || '').toLowerCase();
  if (/autre/.test(n)) return Ellipsis;
  if (/intendance|nourri|aliment|repas|course|cuisine/.test(n)) return ShoppingCart;
  if (/transport|train|bus|voiture|essence|carbur|p[ée]age/.test(n)) return Bus;
  if (/mat[ée]riel|[ée]quipement|outil|fourniture/.test(n)) return Package;
  if (/h[ée]berg|logement|camp|tente|location/.test(n)) return Tent;
  if (/pharma|soin|sant[ée]|m[ée]dic/.test(n)) return Cross;
  if (/activit|sortie|loisir|billet|entr[ée]e/.test(n)) return Ticket;
  return Receipt;
}

/** Motif affiché : la précision pour « Autre », sinon le nom de la catégorie */
export function expenseMotif(exp: Pick<Expense, 'custom_category' | 'category'>): string {
  if (exp.custom_category) return exp.custom_category;
  return exp.category?.name || 'Motif inconnu';
}

/** « Claire D. » */
export function shortName(p?: { first_name?: string | null; last_name?: string | null } | null): string {
  if (!p) return 'Un chef';
  const first = (p.first_name || '').trim();
  const last = (p.last_name || '').trim();
  if (!first && !last) return 'Un chef';
  return last ? `${first} ${last.charAt(0).toUpperCase()}.`.trim() : first;
}

/** « 7 nov. 2026 » à partir d'une date AAAA-MM-JJ */
export function formatDateShort(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return dateString;
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isPdfPath(path: string | null | undefined): boolean {
  return Boolean(path && path.toLowerCase().endsWith('.pdf'));
}

/** Petit ticket dessiné, quand l'image n'est pas disponible */
const ReceiptDrawing: React.FC = () => (
  <>
    <span className="h-[3px] w-full bg-divider" />
    <span className="h-[3px] w-[70%] bg-divider" />
    <span className="h-[3px] w-full bg-divider" />
    <span className="h-[3px] w-[55%] bg-divider" />
    <span className="flex-1" />
    <span className="h-1 w-full bg-on-color" />
  </>
);

/* ------------------------------------------------------------------ */

interface ExpenseListProps {
  expenses: Expense[];
  unit: Unit;
  activePeriod?: Period;
  categories: ExpenseCategory[];
  onRefresh: () => void;
  onNewExpense: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  unit,
  activePeriod,
  categories,
  onRefresh,
  onNewExpense,
}) => {
  const [selectedForEdit, setSelectedForEdit] = useState<Expense | null>(null);
  const [selectedForHistory, setSelectedForHistory] = useState<Expense | null>(null);
  const [selectedForProofUpload, setSelectedForProofUpload] = useState<Expense | null>(null);
  const [preview, setPreview] = useState<Expense | null>(null);

  const [showBudgetSection, setShowBudgetSection] = useState<boolean>(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);

  const periodId = activePeriod?.id || 'current';
  const [currentBudget, setCurrentBudget] = useState<number | null>(() => getUnitBudget(unit.id, periodId));

  useEffect(() => {
    setCurrentBudget(getUnitBudget(unit.id, periodId));
  }, [unit.id, periodId]);

  const handleSaveBudget = (newBudget: number | null) => {
    setUnitBudget(unit.id, periodId, newBudget);
    setCurrentBudget(newBudget);
  };

  const handleExportCsv = () => {
    const csvContent = generateCsvContent(expenses);
    const dateStr = new Date().toISOString().slice(0, 10);
    const unitClean = unit.name.replace(/\s+/g, '_');
    downloadCsv(`Depenses_${unitClean}_${dateStr}.csv`, csvContent);
  };

  const totalAmount = sumAmounts(expenses);
  const breakdown = calculateCategoryBreakdown(expenses, categories);
  const budgetStatus = calculateBudgetStatus(totalAmount, currentBudget);

  const missingProofCount = expenses.filter((e) => !hasValidProof(e)).length;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Total de l'unité et bouton Nouvelle Dépense */}
      <div className="flex flex-col gap-3 rounded-[24px] border-2.5 border-line bg-green p-4 sm:p-5 text-on-color shadow-pop-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[12px] font-extrabold uppercase tracking-wider opacity-85">
              Total engagé · {unit.name}
            </span>
            <span className="text-[32px] sm:text-[34px] font-extrabold leading-tight tracking-tight break-words">
              {formatCurrency(totalAmount)}
            </span>
            <span className="text-[13px] font-bold opacity-80">
              {activePeriod?.name || 'Période en cours'} · {expenses.length} dépense{expenses.length > 1 ? 's' : ''}
            </span>
          </div>

          <Button
            type="button"
            variant="neutral"
            onClick={onNewExpense}
            className="shrink-0 bg-white text-on-color border-2.5 border-on-color shadow-pop rounded-xl min-h-[48px] px-4 text-[14px] font-extrabold hover:bg-white/90 active:translate-x-[2px] active:translate-y-[2px]"
          >
            <Plus className="h-4 w-4 stroke-[3]" aria-hidden="true" />
            Nouvelle dépense
          </Button>
        </div>
      </div>

      {/* Duo d'outils d'analyse : Budget & Camembert et Export Excel côte à côte */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          variant={showBudgetSection ? 'secondary' : 'neutral'}
          onClick={() => setShowBudgetSection((prev) => !prev)}
          className="min-h-[46px] w-full rounded-xl border-2.5 border-line shadow-pop text-[13px] sm:text-[14px] px-2.5 leading-tight font-extrabold"
          aria-expanded={showBudgetSection}
        >
          <PieChart className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
          <span className="truncate">Budget</span>
          {showBudgetSection ? (
            <ChevronUp className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
          )}
        </Button>

        <Button
          type="button"
          variant="neutral"
          onClick={handleExportCsv}
          disabled={expenses.length === 0}
          className="min-h-[46px] w-full rounded-xl border-2.5 border-line shadow-pop text-[13px] sm:text-[14px] px-2.5 leading-tight font-extrabold disabled:opacity-45"
          title="Télécharger toutes les dépenses au format Excel"
        >
          <Download className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
          <span className="truncate">Export Excel</span>
        </Button>
      </div>

      {/* Alerte globale si des justificatifs sont manquants */}
      {missingProofCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2.5 border-line bg-yellow/20 p-3.5 text-ink shadow-pop-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red text-white text-[14px] border border-line">
              ⚠️
            </span>
            <span className="text-[13px] font-extrabold leading-snug">
              {missingProofCount} ticket{missingProofCount > 1 ? 's' : ''} manquant{missingProofCount > 1 ? 's' : ''} à ajouter pour débloquer les remboursements
            </span>
          </div>
        </div>
      )}

      {/* Section dépliable : Budget & Répartition (Arthur's feedback) */}
      {showBudgetSection && (
        <section
          aria-label="Analyse du budget et répartition des dépenses"
          className="flex flex-col gap-4 rounded-[22px] border-2.5 border-line bg-surface p-4 shadow-pop-md"
        >
          <div className="flex items-center justify-between gap-2 border-b-2.5 border-line pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow/20 text-ink border-2 border-line font-extrabold">
                <Coins className="h-5 w-5 text-yellow" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-ink leading-tight">
                  Gestion du budget
                </h3>
                <span className="text-[12px] font-bold text-muted truncate block">
                  {activePeriod?.name || 'Période en cours'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={() => setIsBudgetModalOpen(true)}
              className="shrink-0 min-h-[38px] px-3 rounded-lg border-2 border-line shadow-pop-sm text-[12px] sm:text-[13px] font-extrabold"
            >
              {currentBudget ? 'Modifier' : '+ Définir un budget'}
            </Button>
          </div>

          {/* Jauge de Budget */}
          {budgetStatus.allocatedBudget ? (
            <div className="flex flex-col gap-2.5 rounded-xl border-2.5 border-line bg-surface2 p-3.5">
              <div className="flex items-center justify-between text-[13px] font-bold">
                <span className="text-muted">Budget alloué :</span>
                <span className="text-ink font-extrabold">
                  {formatCurrency(budgetStatus.allocatedBudget)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px] font-bold">
                <span className="text-muted">Total dépensé :</span>
                <span className="text-ink font-extrabold">
                  {formatCurrency(budgetStatus.totalSpent)} ({budgetStatus.percentageUsed} %)
                </span>
              </div>

              {/* Barre de progression */}
              <div className="relative h-4 w-full overflow-hidden rounded-full border-2 border-line bg-surface p-[2px]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    budgetStatus.isExceeded
                      ? 'bg-error'
                      : (budgetStatus.percentageUsed || 0) > 85
                      ? 'bg-yellow'
                      : 'bg-green'
                  }`}
                  style={{
                    width: `${Math.min(100, budgetStatus.percentageUsed || 0)}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] font-extrabold text-ink">
                  {budgetStatus.isExceeded ? 'Dépassement :' : 'Reste disponible :'}
                </span>
                <span
                  className={`rounded-lg px-2.5 py-0.5 text-[14px] font-extrabold ${
                    budgetStatus.isExceeded
                      ? 'bg-error-bg text-error border border-error/30'
                      : 'bg-green/20 text-success border border-green/40'
                  }`}
                >
                  {budgetStatus.isExceeded
                    ? `+ ${formatCurrency(budgetStatus.overspentAmount)}`
                    : formatCurrency(budgetStatus.remaining || 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border-2.5 border-line bg-surface2 p-3.5 text-center sm:text-left">
              <span className="text-[13px] font-bold text-muted">
                Aucune enveloppe limite définie pour cette unité.
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsBudgetModalOpen(true)}
                className="shrink-0 min-h-[38px] px-3.5 rounded-lg border-2 border-line shadow-pop-sm text-[13px] font-extrabold"
              >
                Fixer un objectif
              </Button>
            </div>
          )}

          {/* Camembert SVG Répartition */}
          <div className="flex flex-col gap-2 pt-2 border-t-2.5 border-line">
            <h4 className="text-[15px] font-extrabold text-ink">
              Répartition des dépenses
            </h4>
            <CategoryDonutChart slices={breakdown} totalAmount={totalAmount} />
          </div>
        </section>
      )}

      {/* Liste des dépenses */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border-2.5 border-line bg-surface px-5 py-8 text-center">
          <MartyMascot expression="ready" size={80} circle="blue" />
          <h3 className="text-[17px] font-extrabold">Aucune dépense pour l'instant</h3>
          <p className="max-w-xs text-[14px] font-medium text-muted">
            Utilise « Nouvelle dépense » pour déclarer le premier achat de ton unité.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3.5" aria-label={`Dépenses de ${unit.name}`}>
          {expenses.map((exp) => {
            const isPersonal = exp.payment_method === 'personal_money';
            const isReimbursed = exp.reimbursement_status === 'reimbursed';
            const motif = expenseMotif(exp);
            const hasProof = hasValidProof(exp);
            const pdf = isPdfPath(exp.proof_path);

            return (
              <li key={exp.id}>
                <article className="flex flex-col gap-2.5 rounded-[20px] border-2.5 border-line bg-surface p-3.5 shadow-pop-sm">
                  <div className="flex items-start gap-3">
                    {/* Vignette Justificatif ou Placeholder Sans Ticket */}
                    {hasProof ? (
                      <button
                        type="button"
                        aria-label={`Voir le justificatif : ${motif}`}
                        onClick={() => setPreview(exp)}
                        className="relative flex h-16 w-[52px] shrink-0 flex-col gap-1 overflow-hidden rounded-md border-2 border-on-color bg-white px-1.5 py-[7px] text-on-color"
                      >
                        {pdf ? (
                          <span className="flex flex-1 flex-col items-center justify-center gap-0.5">
                            <FileText className="h-6 w-6" aria-hidden="true" />
                            <span className="text-[9px] font-extrabold">PDF</span>
                          </span>
                        ) : (
                          <>
                            <ReceiptDrawing />
                            {exp.signed_proof_url && (
                              <img
                                src={exp.signed_proof_url}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedForProofUpload(exp)}
                        aria-label={`Ajouter le ticket manquant pour : ${motif}`}
                        className="relative flex h-16 w-[52px] shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-red bg-error-bg/30 text-error hover:bg-error-bg/60 transition-colors"
                        title="Justificatif manquant. Clique pour ajouter la photo."
                      >
                        <Camera className="h-5 w-5" />
                        <span className="text-[8px] font-extrabold leading-none text-center">
                          Ticket ?
                        </span>
                      </button>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[16px] font-extrabold leading-tight break-words">{motif}</span>
                      <span className="text-[13px] font-semibold text-muted">
                        {formatDateShort(exp.date)} · par {shortName(exp.creator)}
                      </span>
                      {exp.comment && (
                        <span className="text-[13px] font-medium italic text-muted break-words">« {exp.comment} »</span>
                      )}
                    </div>

                    <span className="shrink-0 text-[18px] font-extrabold">{formatCurrency(exp.amount)}</span>
                  </div>

                  {/* Ligne des badges et statuts */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-divider pt-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPersonal ? (
                        isReimbursed ? (
                          <Badge variant="green">Remboursée</Badge>
                        ) : (
                          <Badge variant="yellow">À rembourser</Badge>
                        )
                      ) : (
                        <Badge variant="green">Unité</Badge>
                      )}

                      {!hasProof && (
                        <Badge variant="red" className="text-[12px] font-extrabold">
                          ⚠️ Justificatif manquant
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!hasProof && (
                        <button
                          type="button"
                          onClick={() => setSelectedForProofUpload(exp)}
                          className="flex h-11 items-center gap-1.5 rounded-lg border-2 border-line bg-yellow/20 px-3 text-[13px] font-extrabold text-ink hover:bg-yellow/30"
                        >
                          <Camera className="h-4 w-4" />
                          Ajouter ticket
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedForEdit(exp)}
                        aria-label={isReimbursed ? `Voir la dépense ${motif} (déjà remboursée, verrouillée)` : undefined}
                        className="flex h-11 items-center gap-1.5 rounded-lg border-2 border-line bg-surface px-3.5 text-[14px] font-extrabold text-ink hover:bg-surface2"
                      >
                        {isReimbursed && <Lock className="h-4 w-4" aria-hidden="true" />}
                        {isReimbursed ? 'Voir' : 'Modifier'}
                      </button>
                      <button
                        type="button"
                        aria-label="Historique des modifications"
                        onClick={() => setSelectedForHistory(exp)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-line bg-surface text-ink hover:bg-surface2"
                      >
                        <History className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modales */}
      <ExpenseEditModal
        isOpen={Boolean(selectedForEdit)}
        onClose={() => setSelectedForEdit(null)}
        expense={selectedForEdit}
        categories={categories}
        onUpdated={onRefresh}
      />

      <ExpenseHistoryModal
        isOpen={Boolean(selectedForHistory)}
        onClose={() => setSelectedForHistory(null)}
        expenseId={selectedForHistory?.id || null}
        expenseAmount={selectedForHistory?.amount}
        expenseLabel={selectedForHistory ? expenseMotif(selectedForHistory) : undefined}
        categories={categories}
      />

      <ProofUploadModal
        isOpen={Boolean(selectedForProofUpload)}
        expense={selectedForProofUpload}
        onClose={() => setSelectedForProofUpload(null)}
        onSuccess={onRefresh}
      />

      <BudgetEditModal
        isOpen={isBudgetModalOpen}
        unitName={unit.name}
        currentBudget={currentBudget}
        onSave={handleSaveBudget}
        onClose={() => setIsBudgetModalOpen(false)}
      />

      <ProofPreview expense={preview} onClose={() => setPreview(null)} />
    </div>
  );
};

/** Aperçu plein écran du justificatif (écran 18) */
const ProofPreview: React.FC<{ expense: Expense | null; onClose: () => void }> = ({ expense, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expense) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [expense, onClose]);

  if (!expense) return null;

  const url = expense.signed_proof_url || null;
  const fileName = expense.proof_path?.split('/').pop() || 'justificatif';
  const pdf = isPdfPath(expense.proof_path);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu du justificatif"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 px-4 py-20"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        // Focus piégé dans l'aperçu
        if (e.key !== 'Tab') return;
        const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href], button'));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="Fermer l'aperçu"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border-2.5 border-white bg-on-color text-white"
      >
        <X className="h-[22px] w-[22px]" strokeWidth={2.6} aria-hidden="true" />
      </button>

      {url && !pdf ? (
        <img
          src={url}
          alt={`Justificatif : ${expenseMotif(expense)}, ${formatCurrency(expense.amount)}`}
          className="max-h-[70dvh] max-w-full rounded-lg bg-white object-contain"
        />
      ) : (
        <div className="flex w-full max-w-[300px] flex-col items-center gap-3 rounded-lg bg-white px-6 py-10 text-center text-on-color">
          <FileText className="h-14 w-14" aria-hidden="true" />
          <span className="text-[15px] font-extrabold">
            {url ? 'Justificatif PDF' : "Le justificatif n'a pas pu être chargé."}
          </span>
        </div>
      )}

      <span className="max-w-full break-all text-center text-[14px] font-bold text-white">{fileName}</span>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          download
          className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold text-blue underline underline-offset-4"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {pdf ? 'Ouvrir le PDF' : 'Télécharger le fichier original'}
        </a>
      )}
    </div>
  );
};
