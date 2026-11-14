import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Check, CheckCircle2, Copy, Download, Filter, History, Pencil, Trash2 } from 'lucide-react';
import { Expense, ExpenseCategory, Unit, Profile, Period } from '@/types/database';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Banner } from '@/components/ui/feedback';
import { cn, formatCurrency, formatDateFr, sumAmounts, getChefsFilterList } from '@/lib/utils';
import { hasValidProof } from '@/lib/permissions';
import { ExpenseEditModal } from '@/components/chef/ExpenseEditModal';
import { ExpenseHistoryModal } from '@/components/shared/ExpenseHistoryModal';
import { ProofUploadModal } from '@/components/chef/ProofUploadModal';
import { supabase, isMockMode } from '@/lib/supabase';
import { formatIban, cleanIban } from '@/lib/iban';

interface AdminExpenseTableProps {
  expenses: Expense[];
  units: Unit[];
  categories: ExpenseCategory[];
  periods: Period[];
  profiles?: Profile[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  onRefresh: () => void;
  /** Reçoit les dépenses filtrées (filtres en cours) pour l'export CSV */
  onExportCsv?: (filteredExpenses: Expense[]) => void;
  onExportZip?: () => void;
  isExportingZip?: boolean;
  /** Change à chaque clic sur « Voir les remboursements » : filtre sur « À rembourser » */
  focusReimbursements?: number;
}

const motifOf = (exp: Expense) =>
  exp.custom_category ? `Autre (${exp.custom_category})` : exp.category?.name || 'Motif inconnu';

const chefOf = (exp: Expense) =>
  exp.creator ? `${exp.creator.first_name} ${exp.creator.last_name}` : 'Chef';

const isPdf = (exp: Expense) => Boolean(exp.proof_path?.toLowerCase().endsWith('.pdf'));

/** Petit dessin de justificatif de la maquette (30 × 38), ou la vignette si l'image est disponible */
function ReceiptThumb({ exp }: { exp: Expense }) {
  if (!hasValidProof(exp)) {
    return (
      <span
        aria-hidden="true"
        title="Justificatif manquant"
        className="flex h-[38px] w-[30px] flex-col items-center justify-center rounded border-2 border-dashed border-red bg-error-bg/30 text-[10px] font-extrabold text-error"
      >
        ⚠️
      </span>
    );
  }
  if (exp.signed_proof_url && !isPdf(exp)) {
    return (
      <img
        src={exp.signed_proof_url}
        alt=""
        className="h-[38px] w-[30px] rounded border-2 border-on-color bg-white object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-[38px] w-[30px] flex-col gap-[3px] rounded border-2 border-on-color bg-white px-1 py-[5px]"
    >
      <span className="h-0.5 bg-on-color/25" />
      <span className="h-0.5 w-[70%] bg-on-color/25" />
      <span className="h-0.5 bg-on-color/25" />
      <span className="flex-1" />
      <span className="h-[3px] bg-on-color" />
    </span>
  );
}

/** Bouton-icône 44 × 44 (Modifier, Historique, Supprimer) */
function ActionIcon({
  label,
  onClick,
  danger,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border-2 bg-surface disabled:opacity-45',
        danger ? 'border-error text-error hover:bg-error-bg' : 'border-line text-ink hover:bg-surface2'
      )}
    >
      {children}
    </button>
  );
}

const filterSelectClass = 'min-h-[44px] rounded-[10px] px-2 font-bold md:text-[13px]';


/** Demande à la fonction serveur /api/notifier-remboursement d'envoyer l'email au chef */
async function notifyReimbursement(expenseId: string): Promise<string> {
  try {
    const { data } = await (supabase as any).auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return 'Email non envoyé (session expirée).';
    const res = await fetch('/api/notifier-remboursement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ expenseId }),
    });
    const out = await res.json().catch(() => ({}));
    if (out.sent) return `Email envoyé à ${out.to}.`;
    const reasons: Record<string, string> = {
      not_configured: "l'envoi d'emails n'est pas encore configuré",
      no_email: "le chef n'a pas d'adresse email",
      smtp_error: "le serveur d'envoi a refusé l'email",
    };
    return `Email non envoyé : ${reasons[out.reason] || 'erreur inattendue'}.`;
  } catch {
    return 'Email non envoyé : erreur réseau.';
  }
}

export const AdminExpenseTable: React.FC<AdminExpenseTableProps> = ({
  expenses,
  units,
  categories,
  periods,
  profiles,
  selectedPeriodId,
  onSelectPeriod,
  onRefresh,
  onExportCsv,
  onExportZip,
  isExportingZip,
  focusReimbursements,
}) => {
  // Filtres
  const [filterUnitId, setFilterUnitId] = useState<string>('all');
  const [filterChefId, setFilterChefId] = useState<string>('all');
  const [filterReimbursement, setFilterReimbursement] = useState<string>('all');
  const filtersRef = useRef<HTMLElement>(null);

  // Depuis la fenêtre « Demandes en attente » : n'afficher que les dépenses à rembourser
  useEffect(() => {
    if (!focusReimbursements) return;
    setFilterUnitId('all');
    setFilterChefId('all');
    setFilterReimbursement('pending');
    filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusReimbursements]);

  // Modales
  const [selectedForEdit, setSelectedForEdit] = useState<Expense | null>(null);
  const [selectedForHistory, setSelectedForHistory] = useState<Expense | null>(null);
  const [preview, setPreview] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Liste unique des chefs présents dans les profils et les dépenses pour le filtre
  const chefsList = useMemo(() => getChefsFilterList(expenses, profiles), [expenses, profiles]);

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

  // Total recalculé selon le filtre actif (précision centimes)
  const filteredTotal = useMemo(
    () => sumAmounts(filteredExpenses.map((exp) => exp.amount)),
    [filteredExpenses]
  );

  // Total en attente de remboursement selon le filtre (précision centimes)
  const pendingReimbursementTotal = useMemo(
    () =>
      sumAmounts(
        filteredExpenses.filter((e) => e.reimbursement_status === 'pending').map((exp) => exp.amount)
      ),
    [filteredExpenses]
  );

  // Case « Remboursée » (admin seulement, dépenses en argent perso) : confirmation, puis définitif
  const [confirmReimburse, setConfirmReimburse] = useState<Expense | null>(null);
  const [isReimbursing, setIsReimbursing] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [uploadMissingProofExp, setUploadMissingProofExp] = useState<Expense | null>(null);
  const confirm = useConfirm();

  const handleConfirmReimbursed = async () => {
    const exp = confirmReimburse;
    if (!exp || exp.payment_method !== 'personal_money' || exp.reimbursement_status === 'reimbursed') return;
    setErrorMsg(null);
    setIsReimbursing(true);
    const { error } = await supabase
      .from('expenses')
      .update({ reimbursement_status: 'reimbursed' })
      .eq('id', exp.id);
    setIsReimbursing(false);
    setConfirmReimburse(null);

    if (error) {
      setErrorMsg(error.message || 'Erreur lors de la mise à jour du remboursement.');
      return;
    }
    onRefresh();
    const who = exp.creator?.first_name || 'chef';
    setNotificationMsg(`Dépense de ${who} marquée comme remboursée.${isMockMode ? ' (démo : aucun email)' : ' Envoi de l\'email…'}`);
    if (!isMockMode) {
      const mail = await notifyReimbursement(exp.id);
      setNotificationMsg(`Dépense de ${who} marquée comme remboursée. ${mail}`);
    }
    setTimeout(() => setNotificationMsg(null), 6000);
  };

  // Supprimer une dépense (admins uniquement)
  const handleDeleteExpense = async (expenseId: string) => {
    if (!(await confirm({ title: 'Supprimer cette dépense ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', danger: true }))) {
      return;
    }
    setErrorMsg(null);
    setIsDeleting(expenseId);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) {
        setErrorMsg(error.message || 'Erreur lors de la suppression.');
      } else {
        onRefresh();
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const countLabel = `${filteredExpenses.length} dépense${filteredExpenses.length > 1 ? 's' : ''}`;

  const reimbursedCheckbox = (exp: Expense, withText: boolean) => {
    const checked = exp.reimbursement_status === 'reimbursed';
    const hasProof = hasValidProof(exp);
    const disabled = checked || !hasProof;
    const title = checked
      ? 'Remboursement définitif'
      : !hasProof
      ? 'Remboursement impossible : justificatif manquant'
      : undefined;

    return (
      <label
        className={cn(
          'inline-flex min-h-[44px] min-w-[44px] items-center gap-2 select-none',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          !withText && 'justify-center'
        )}
        title={title}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => !disabled && setConfirmReimburse(exp)}
          aria-label={withText ? undefined : `Remboursée : ${motifOf(exp)}`}
          className={cn('m-0 h-5 w-5 accent-green', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        />
        {withText && <span className="text-[14px] font-bold">Remboursée</span>}
      </label>
    );
  };

  const receiptButton = (exp: Expense) => {
    const hasProof = hasValidProof(exp);
    if (!hasProof) {
      return (
        <button
          type="button"
          onClick={() => setUploadMissingProofExp(exp)}
          aria-label={`Ajouter le justificatif manquant pour : ${motifOf(exp)}`}
          title="⚠️ Justificatif manquant — Cliquer pour ajouter le reçu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-transform hover:scale-105 hover:bg-error-bg/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          <ReceiptThumb exp={exp} />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setPreview(exp)}
        disabled={!exp.signed_proof_url}
        aria-label={`Voir le justificatif : ${motifOf(exp)}`}
        title={exp.signed_proof_url ? 'Voir le justificatif' : 'Justificatif indisponible'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ReceiptThumb exp={exp} />
      </button>
    );
  };

  const actionButtons = (exp: Expense) => (
    <div className="flex gap-1">
      <ActionIcon label={`Modifier : ${motifOf(exp)}`} onClick={() => setSelectedForEdit(exp)}>
        <Pencil className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
      </ActionIcon>
      <ActionIcon label={`Historique : ${motifOf(exp)}`} onClick={() => setSelectedForHistory(exp)}>
        <History className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
      </ActionIcon>
      <ActionIcon
        label={`Supprimer : ${motifOf(exp)}`}
        onClick={() => handleDeleteExpense(exp.id)}
        disabled={isDeleting === exp.id}
        danger
      >
        <Trash2 className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
      </ActionIcon>
    </div>
  );

  const payBadge = (exp: Expense) =>
    exp.payment_method === 'personal_money' ? (
      <Badge variant="blue">Perso</Badge>
    ) : (
      <Badge variant="green">Unité</Badge>
    );

  const emptyMessage = 'Aucune dépense ne correspond aux filtres sélectionnés.';

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {notificationMsg && <Banner tone="notice">{notificationMsg}</Banner>}
      {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

      {/* Période + exports : empilés sur téléphone, sur une ligne dès 768 px */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex min-w-0 flex-col gap-1 md:flex-1">
          <span className="text-[13px] font-bold">Période</span>
          <Select
            value={selectedPeriodId}
            onChange={(e) => onSelectPeriod(e.target.value)}
            className="min-h-[44px] rounded-lg px-2.5 font-bold"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.status === 'closed' ? '(clôturée)' : '(ouverte)'}
              </option>
            ))}
          </Select>
        </label>

        {(onExportCsv || onExportZip) && (
          <div className="grid grid-cols-2 gap-2.5 md:flex md:shrink-0">
            {onExportCsv && (
              <Button
                variant="primary"
                onClick={() => onExportCsv(filteredExpenses)}
                className="min-h-[46px] whitespace-normal rounded-[14px] px-2.5 text-[14px] leading-tight shadow-[3px_3px_0_rgb(var(--shadow))]"
              >
                <Download className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
                Export CSV
              </Button>
            )}
            {onExportZip && (
              <Button
                variant="secondary"
                onClick={onExportZip}
                isLoading={isExportingZip}
                className="min-h-[46px] whitespace-normal rounded-[14px] px-2.5 text-[14px] leading-tight shadow-[3px_3px_0_rgb(var(--shadow))]"
              >
                {!isExportingZip && (
                  <Download className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
                )}
                Justificatifs ZIP
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filtres : empilés sous 768 px, sur une ligne au-dessus */}
      <section ref={filtersRef} className="flex scroll-mt-4 flex-col gap-2 rounded-[18px] border-2.5 border-line bg-surface p-3">
        <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold">
          <Filter className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          Filtres dynamiques
        </h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-[12px] font-bold text-muted">Unité</span>
            <Select
              value={filterUnitId}
              onChange={(e) => setFilterUnitId(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">Toutes</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-[12px] font-bold text-muted">Chef</span>
            <Select
              value={filterChefId}
              onChange={(e) => setFilterChefId(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">Tous</option>
              {chefsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-[12px] font-bold text-muted">Remboursement</span>
            <Select
              value={filterReimbursement}
              onChange={(e) => setFilterReimbursement(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">Tous</option>
              <option value="pending">À rembourser</option>
              <option value="reimbursed">Remboursées</option>
              <option value="unit">Argent de l'unité</option>
            </Select>
          </label>
        </div>
      </section>

      {/* Total selon les filtres, juste sous les filtres */}
      <div className="flex flex-col gap-0.5 rounded-[18px] border-2.5 border-line bg-surface2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-extrabold">Total · {countLabel}</span>
          <span className="whitespace-nowrap text-[15px] font-extrabold text-success">
            {formatCurrency(filteredTotal)}
          </span>
        </div>
        {pendingReimbursementTotal > 0 && (
          <span className="text-[13px] font-semibold text-muted">
            dont {formatCurrency(pendingReimbursementTotal)} à rembourser
          </span>
        )}
      </div>

      {/* Cartes sous 1024 px (2 colonnes entre 768 et 1023 px) */}
      <div className="flex flex-col gap-3 lg:hidden">
        {filteredExpenses.length === 0 ? (
          <p className="rounded-[18px] border-2.5 border-dashed border-divider p-6 text-center text-[14px] font-semibold text-muted">
            {emptyMessage}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredExpenses.map((exp) => {
              const isPersonal = exp.payment_method === 'personal_money';
              const isReimbursed = exp.reimbursement_status === 'reimbursed';
              const hasProof = hasValidProof(exp);

              return (
                <li
                  key={exp.id}
                  className="flex min-w-0 flex-col gap-2 rounded-[18px] border-2.5 border-line bg-surface p-3.5 shadow-pop-sm"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="break-words text-[16px] font-extrabold leading-tight">{motifOf(exp)}</span>
                      <span className="break-words text-[13px] font-semibold text-muted">
                        {formatDateFr(exp.date)} · {exp.unit?.name || 'Inconnue'} · {chefOf(exp)}
                      </span>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[18px] font-extrabold">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>

                  {exp.comment && (
                    <p className="line-clamp-2 break-words text-[13px] font-medium text-muted">{exp.comment}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {payBadge(exp)}
                    {!hasProof && (
                      <Badge variant="red" className="text-[11px] font-extrabold">
                        ⚠️ Justificatif manquant
                      </Badge>
                    )}
                    {!isPersonal && (
                      <span className="text-[12px] font-semibold text-muted">Pas de remboursement</span>
                    )}
                  </div>

                  {/* Bouton large ergonomique de remboursement (Retour terrain Arthur Boubou) */}
                  {isPersonal && (
                    <div className="pt-2 border-t border-divider flex flex-col gap-1.5">
                      {!isReimbursed ? (
                        !hasProof ? (
                          <button
                            type="button"
                            onClick={() => setUploadMissingProofExp(exp)}
                            className="flex flex-col items-center justify-center w-full min-h-[46px] rounded-[14px] border-2 border-dashed border-error bg-error-bg/25 px-3 py-1.5 text-center text-error hover:bg-error-bg/40 transition-colors"
                            title="Justificatif manquant : cliquer pour ajouter le reçu et débloquer le remboursement"
                          >
                            <span className="text-[12px] font-extrabold">⚠️ Justificatif manquant (remboursement bloqué)</span>
                            <span className="text-[11px] font-bold underline text-ink">📸 Cliquer ici pour ajouter le reçu</span>
                          </button>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => setConfirmReimburse(exp)}
                            className="w-full justify-center gap-2 font-extrabold min-h-[46px] text-[14px] rounded-[14px] bg-green text-on-color shadow-pop-sm"
                          >
                            <span className="flex items-center gap-1.5">
                              <Check className="h-4 w-4 stroke-[3]" />
                              Rembourser {formatCurrency(exp.amount)}
                            </span>
                          </Button>
                        )
                      ) : (
                        <div className="flex items-center gap-2 text-success font-extrabold text-[14px] py-1">
                          <CheckCircle2 className="h-5 w-5" />
                          Remboursée ({formatCurrency(exp.amount)})
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t-2 border-divider pt-2">
                    <div className="flex items-center gap-2">
                      {receiptButton(exp)}
                      {!hasProof && (
                        <button
                          type="button"
                          onClick={() => setUploadMissingProofExp(exp)}
                          className="flex items-center gap-1 text-[12px] font-extrabold text-error hover:underline text-left"
                          title="Cliquer pour ajouter le justificatif"
                        >
                          <span>Pas de reçu</span>
                          <span className="text-[11px] font-semibold underline text-ink">(Ajouter 📸)</span>
                        </button>
                      )}
                    </div>
                    {actionButtons(exp)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Vrai tableau dès 1024 px : 9 colonnes à largeurs fixes, sans défilement horizontal */}
      <div className="hidden overflow-hidden rounded-[18px] border-2.5 border-line bg-surface shadow-pop lg:block">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col className="w-[92px]" />
            <col className="w-[96px]" />
            <col className="w-[112px]" />
            <col />
            <col className="w-[104px]" />
            <col className="w-[88px]" />
            <col className="w-[100px]" />
            <col className="w-[64px]" />
            <col className="w-[164px]" />
          </colgroup>
          <thead>
            <tr className="bg-surface2 text-left">
              <th scope="col" className="px-2.5 py-2.5 font-extrabold">Date</th>
              <th scope="col" className="px-2.5 py-2.5 font-extrabold">Unité</th>
              <th scope="col" className="px-2.5 py-2.5 font-extrabold">Chef</th>
              <th scope="col" className="px-2.5 py-2.5 font-extrabold">Motif</th>
              <th scope="col" className="px-2.5 py-2.5 text-right font-extrabold">Montant</th>
              <th scope="col" className="px-2.5 py-2.5 font-extrabold">Paiement</th>
              <th scope="col" className="px-2.5 py-2.5 font-extrabold">Remboursée</th>
              <th scope="col" className="px-2.5 py-2.5 font-extrabold">Justif.</th>
              <th scope="col" className="px-2.5 py-2.5 font-extrabold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr className="border-t-2 border-divider">
                <td colSpan={9} className="p-8 text-center font-semibold text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => {
                const isPersonal = exp.payment_method === 'personal_money';
                return (
                  <tr key={exp.id} className="border-t-2 border-divider">
                    <td className="whitespace-nowrap px-2.5 py-2 font-semibold">{formatDateFr(exp.date)}</td>
                    <td className="break-words px-2.5 py-2 font-semibold">{exp.unit?.name || 'Inconnue'}</td>
                    <td className="break-words px-2.5 py-2 font-semibold">{chefOf(exp)}</td>
                    <td className="px-2.5 py-2 font-bold" title={exp.comment || undefined}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="line-clamp-2 break-words">{motifOf(exp)}</span>
                        {!hasValidProof(exp) && (
                          <button
                            type="button"
                            onClick={() => setUploadMissingProofExp(exp)}
                            title="Justificatif manquant : cliquer pour ajouter le reçu"
                            className="inline-flex items-center"
                          >
                            <Badge variant="red" className="text-[10px] font-extrabold py-0 px-1 shrink-0 hover:brightness-95 cursor-pointer">
                              Sans reçu 📸
                            </Badge>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-right font-extrabold">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-2.5 py-2">{payBadge(exp)}</td>
                    <td className="px-1.5 py-0.5">
                      {isPersonal ? (
                        reimbursedCheckbox(exp, false)
                      ) : (
                        <span className="px-2.5 text-muted">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Sans objet</span>
                        </span>
                      )}
                    </td>
                    <td className="px-1.5 py-1">{receiptButton(exp)}</td>
                    <td className="px-2.5 py-1">{actionButtons(exp)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2.5 border-line bg-surface2">
              <th scope="row" colSpan={4} className="px-2.5 py-2.5 text-left font-extrabold">
                Total · {countLabel}
              </th>
              <td className="whitespace-nowrap px-2.5 py-2.5 text-right text-[15px] font-extrabold text-success">
                {formatCurrency(filteredTotal)}
              </td>
              <td colSpan={4} className="px-2.5 py-2.5 font-semibold text-muted">
                {pendingReimbursementTotal > 0 && `dont ${formatCurrency(pendingReimbursementTotal)} à rembourser`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modale d'édition */}
      <ExpenseEditModal
        isOpen={Boolean(selectedForEdit)}
        onClose={() => setSelectedForEdit(null)}
        expense={selectedForEdit}
        categories={categories}
        units={units}
        isAdmin={true}
        onUpdated={onRefresh}
      />

      {/* Modale d'historique */}
      <ExpenseHistoryModal
        isOpen={Boolean(selectedForHistory)}
        onClose={() => setSelectedForHistory(null)}
        expenseId={selectedForHistory?.id || null}
        expenseAmount={selectedForHistory?.amount}
      />

      {/* Aperçu du justificatif (lien signé) */}
      <Dialog
        isOpen={Boolean(confirmReimburse)}
        onClose={() => {
          if (!isReimbursing) {
            setConfirmReimburse(null);
            setCopiedIban(false);
          }
        }}
        title="Confirmer le remboursement"
        variant="center"
        role="alertdialog"
        className="max-w-[440px]"
      >
        {confirmReimburse && (() => {
          const chefIban = confirmReimburse.creator?.iban || profiles?.find((p) => p.id === confirmReimburse.created_by)?.iban;
          const chefName = [confirmReimburse.creator?.first_name, confirmReimburse.creator?.last_name].filter(Boolean).join(' ') || 'ce chef';

          return (
            <div className="flex flex-col gap-3.5">
              <p className="text-[15px] leading-relaxed">
                As-tu bien remboursé <strong>{formatCurrency(confirmReimburse.amount)}</strong> à{' '}
                <strong>{chefName}</strong>{' '}
                ({motifOf(confirmReimburse)}, {formatDateFr(confirmReimburse.date)}) ?
              </p>

              {chefIban ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-3 py-2.5">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[11px] font-bold text-muted">IBAN pour le virement</span>
                    <span className="break-all font-mono text-[13px] font-bold tracking-wider text-ink">
                      {formatIban(chefIban)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(cleanIban(chefIban));
                      setCopiedIban(true);
                      setTimeout(() => setCopiedIban(false), 2000);
                    }}
                    className="min-h-[38px] shrink-0 gap-1.5 rounded-lg border text-[12px] font-bold"
                    aria-label="Copier l'IBAN"
                  >
                    {copiedIban ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green" aria-hidden="true" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copier l'IBAN</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Banner tone="warning">
                  ⚠️ Aucun IBAN renseigné pour ce chef. Demande-lui son RIB avant de procéder au virement.
                </Banner>
              )}

              <Banner tone="warning">
                C'est définitif : la dépense ne pourra plus revenir « À rembourser ».
                {!isMockMode && ' Le chef reçoit un email de confirmation.'}
              </Banner>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="neutral" onClick={() => { setConfirmReimburse(null); setCopiedIban(false); }} disabled={isReimbursing}>
                  Annuler
                </Button>
                <Button onClick={handleConfirmReimbursed} disabled={isReimbursing}>
                  {isReimbursing ? 'Enregistrement…' : 'Oui, c\'est remboursé'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Dialog>

      <Dialog
        isOpen={Boolean(preview?.signed_proof_url)}
        onClose={() => setPreview(null)}
        title="Justificatif"
        description={preview ? `${motifOf(preview)} · ${formatCurrency(preview.amount)}` : undefined}
        variant="center"
        className="max-w-[560px]"
      >
        {preview?.signed_proof_url && (
          <div className="flex flex-col gap-3">
            {isPdf(preview) ? (
              <p className="text-[14px] font-semibold text-muted">
                Ce justificatif est un PDF : ouvre-le ou télécharge-le avec le lien ci-dessous.
              </p>
            ) : (
              <img
                src={preview.signed_proof_url}
                alt={`Justificatif : ${motifOf(preview)}`}
                className="max-h-[65dvh] w-full rounded-xl border-2 border-line object-contain"
              />
            )}
            <a
              href={preview.signed_proof_url}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-extrabold text-link underline underline-offset-2"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Télécharger le fichier original
            </a>
          </div>
        )}
      </Dialog>

      {/* Modale d'ajout de justificatif manquant pour l'administrateur */}
      <ProofUploadModal
        isOpen={Boolean(uploadMissingProofExp)}
        expense={uploadMissingProofExp}
        onClose={() => setUploadMissingProofExp(null)}
        onSuccess={() => {
          setUploadMissingProofExp(null);
          onRefresh();
        }}
      />
    </div>
  );
};
