import React, { useEffect, useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ExpenseCategory, ExpenseHistory } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ExpenseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string | null;
  expenseAmount?: number;
  /** Motif de la dépense, affiché sous le titre : « Intendance week-end · 64,80 € » */
  expenseLabel?: string;
  /** Pour traduire les identifiants de catégorie de l'historique en noms */
  categories?: ExpenseCategory[];
}

// Noms de champs : le trigger SQL écrit déjà des libellés, la base de démo écrit les noms de colonnes
const FIELD_LABELS: Record<string, string> = {
  amount: 'Montant',
  date: 'Date',
  category_id: 'Catégorie',
  custom_category: 'Précision motif',
  payment_method: 'Mode de paiement',
  comment: 'Commentaire',
  reimbursement_status: 'Statut remboursement',
  proof_path: 'Justificatif',
  unit_id: 'Unité',
};

const VALUE_LABELS: Record<string, string> = {
  unit_money: "Argent de l'unité",
  personal_money: 'Argent perso',
  not_applicable: 'Sans objet',
  pending: 'À rembourser',
  reimbursed: 'Remboursée',
};

function formatValue(field: string, value: string | null, categories: ExpenseCategory[]): string {
  if (value === null || value === undefined || value === '' || value === 'null') return '(vide)';
  if (VALUE_LABELS[value]) return VALUE_LABELS[value];
  if (field === 'Catégorie') {
    const cat = categories.find((c) => c.id === value);
    if (cat) return cat.name;
  }
  if (field === 'Montant') {
    const n = Number(value.replace('€', '').replace(',', '.').trim());
    if (!Number.isNaN(n)) return formatCurrency(n);
  }
  if (field === 'Date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return value;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} à ${time}`;
}

function changerName(item: ExpenseHistory): string {
  const c = item.changer;
  if (!c) return 'Modifié';
  const last = (c.last_name || '').trim();
  return `${c.first_name || ''} ${last ? last.charAt(0).toUpperCase() + '.' : ''}`.trim() || 'Modifié';
}

export const ExpenseHistoryModal: React.FC<ExpenseHistoryModalProps> = ({
  isOpen,
  onClose,
  expenseId,
  expenseAmount,
  expenseLabel,
  categories = [],
}) => {
  const [history, setHistory] = useState<ExpenseHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !expenseId) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    let cancelled = false;
    const load = async () => {
      const query = (columns: string) =>
        supabase
          .from('expense_history')
          .select(columns)
          .eq('expense_id', expenseId)
          .order('changed_at', { ascending: false });
      // Avec le nom de l'auteur ; sans la jointure si elle échoue, pour ne jamais masquer l'historique
      let { data, error } = await query('*, changer:profiles(id, first_name, last_name)');
      if (error) ({ data } = await query('*'));
      if (!cancelled) {
        setHistory(((data || []) as unknown) as ExpenseHistory[]);
        setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, expenseId]);

  const subtitle = [expenseLabel, expenseAmount !== undefined ? formatCurrency(expenseAmount) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="text-[24px]">Historique</span>}
      description={subtitle ? <span className="text-[15px] font-bold">{subtitle}</span> : undefined}
      className="flex min-h-[440px] flex-col"
    >
      {isLoading ? (
        <p className="py-8 text-center text-[14px] font-semibold text-muted" role="status">
          Chargement de l'historique…
        </p>
      ) : history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2.5 py-[30px] text-center text-muted">
          <span
            aria-hidden="true"
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2.5 border-line bg-surface2 text-ink"
          >
            <Clock className="h-[34px] w-[34px]" strokeWidth={2.2} />
          </span>
          <span className="text-[17px] font-extrabold text-ink">Aucune modification</span>
          <span className="text-[14px] font-medium">Cette dépense n'a pas changé depuis son envoi.</span>
        </div>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {history.map((item) => {
            const field = FIELD_LABELS[item.field_name] || item.field_name;
            return (
              <li key={item.id} className="flex flex-col gap-1.5 rounded-xl border-2 border-line px-3.5 py-3">
                <span className="text-[13px] font-bold text-muted">
                  {changerName(item)} · {formatWhen(item.changed_at)}
                </span>
                <span className="text-[15px] font-extrabold">{field}</span>
                <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                  <span className="max-w-full break-words rounded-lg bg-surface2 px-2 py-0.5 line-through">
                    <span className="sr-only">Avant : </span>
                    {formatValue(field, item.old_value, categories)}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.6} role="img" aria-label="devient" />
                  <span className="max-w-full break-words rounded-lg border-2 border-on-color bg-blue px-2 py-0.5 text-on-color">
                    <span className="sr-only">Après : </span>
                    {formatValue(field, item.new_value, categories)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Dialog>
  );
};
