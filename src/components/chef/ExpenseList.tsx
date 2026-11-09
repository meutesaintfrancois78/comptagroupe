import React, { useEffect, useRef, useState } from 'react';
import {
  Bus,
  Cross,
  Download,
  Ellipsis,
  FileText,
  History,
  Lock,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  Tent,
  Ticket,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Expense, ExpenseCategory, Unit } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { formatCurrency, sumAmounts } from '@/lib/utils';
import { ExpenseEditModal } from './ExpenseEditModal';
import { ExpenseHistoryModal } from '@/components/shared/ExpenseHistoryModal';

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
  const [preview, setPreview] = useState<Expense | null>(null);

  const totalAmount = sumAmounts(expenses);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Total de l'unité */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-[22px] border-2.5 border-line bg-green px-[18px] py-4 text-on-color shadow-pop-md">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[20px] font-extrabold leading-tight break-words">{unit.name}</h2>
          <span className="text-[13px] font-bold">Total engagé</span>
          <span className="text-[30px] font-extrabold leading-none">{formatCurrency(totalAmount)}</span>
        </div>
        <button
          type="button"
          onClick={onNewExpense}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border-2.5 border-on-color bg-white px-3 text-[14px] font-extrabold text-on-color active:translate-x-[2px] active:translate-y-[2px]"
        >
          <Plus className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          Nouvelle dépense
        </button>
      </div>

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
            const pdf = isPdfPath(exp.proof_path);

            return (
              <li key={exp.id}>
                <article className="flex flex-col gap-2.5 rounded-[20px] border-2.5 border-line bg-surface p-3.5">
                  <div className="flex items-start gap-3">
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

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-divider pt-2.5">
                    {/* Statut en lecture seule : seul un admin marque une dépense comme remboursée */}
                    {isPersonal ? (
                      isReimbursed ? (
                        <Badge variant="green">Remboursée</Badge>
                      ) : (
                        <Badge variant="yellow">À rembourser</Badge>
                      )
                    ) : (
                      <Badge variant="green">Unité</Badge>
                    )}

                    <div className="flex gap-2">
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
