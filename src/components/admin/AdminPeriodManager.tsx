import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Period, Expense } from '@/types/database';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Banner, IconTile } from '@/components/ui/feedback';
import { generateCsvContent, downloadCsv } from '@/lib/exportCsv';
import { generateAndDownloadReceiptsZip } from '@/lib/exportZip';
import { cn, formatCurrency, formatDateFr, sumAmounts } from '@/lib/utils';
import { canPurgePeriod } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';

interface AdminPeriodManagerProps {
  periods: Period[];
  expenses: Expense[];
  onRefresh: () => void;
}

const RETENTION_YEARS = 10;

/** Vrai si la période a commencé il y a moins de 10 ans (ou si la date est illisible) */
function isWithinRetention(period: Period, now: Date = new Date()): boolean {
  const start = new Date(period.start_date);
  if (Number.isNaN(start.getTime())) return true;
  const limit = new Date(start);
  limit.setFullYear(limit.getFullYear() + RETENTION_YEARS);
  return limit > now;
}

const fileSafe = (name: string) => name.replace(/\s+/g, '_');

const smallButton = 'min-h-[44px] rounded-lg border-2 px-3 text-[14px]';

export const AdminPeriodManager: React.FC<AdminPeriodManagerProps> = ({ periods, expenses, onRefresh }) => {
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodType, setNewPeriodType] = useState<'year' | 'camp'>('year');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirm = useConfirm();
  const [busyPeriodId, setBusyPeriodId] = useState<string | null>(null);

  // Fenêtre de purge
  const [periodToPurge, setPeriodToPurge] = useState<Period | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const expensesOf = (periodId: string) => expenses.filter((e) => e.period_id === periodId);

  // Clôturer une période, avec export automatique obligatoire
  const handleClosePeriod = async (period: Period) => {
    if (
      !(await confirm({
        title: `Clôturer « ${period.name} » ?`,
        message: 'Un export automatique des comptes sera généré immédiatement.',
        confirmLabel: 'Clôturer',
      }))
    ) {
      return;
    }

    setErrorMsg(null);
    setBusyPeriodId(period.id);
    try {
      // 1. Export automatique immédiat
      const csv = generateCsvContent(expensesOf(period.id));
      downloadCsv(`Cloture_${fileSafe(period.name)}_Automatique.csv`, csv);

      // 2. Clôture de la période
      const { error } = await supabase
        .from('periods')
        .update({ status: 'closed', end_date: new Date().toISOString().split('T')[0] })
        .eq('id', period.id);
      if (error) {
        setErrorMsg(error.message || 'Erreur lors de la clôture.');
        return;
      }

      setNotification(
        `Période « ${period.name} » clôturée : les chefs ne peuvent plus y ajouter de dépenses. Export de sauvegarde téléchargé.`
      );
      onRefresh();
    } finally {
      setBusyPeriodId(null);
    }
  };

  // Rouvrir une période clôturée
  const handleReopenPeriod = async (period: Period) => {
    if (!(await confirm({ title: `Rouvrir « ${period.name} » ?`, message: 'Les chefs pourront de nouveau y déclarer et modifier des dépenses.', confirmLabel: 'Rouvrir' }))) return;
    setErrorMsg(null);
    setBusyPeriodId(period.id);
    try {
      const { error } = await supabase.from('periods').update({ status: 'open' }).eq('id', period.id);
      if (error) {
        setErrorMsg(error.message || 'Erreur lors de la réouverture.');
        return;
      }
      setNotification(`Période « ${period.name} » rouverte : les chefs peuvent de nouveau y ajouter des dépenses.`);
      onRefresh();
    } finally {
      setBusyPeriodId(null);
    }
  };

  // Créer une nouvelle période
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPeriodName.trim();
    if (!name) return;
    if (periods.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) {
      setErrorMsg(`Une période « ${name} » existe déjà.`);
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('periods').insert({
        name,
        type: newPeriodType,
        status: 'open',
        start_date: new Date().toISOString().split('T')[0],
      });
      if (error) {
        setErrorMsg(`Création impossible : ${error.message}`);
        return;
      }
      setNewPeriodName('');
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPurge = (p: Period) => {
    setPurgeConfirmText('');
    setPurgeError(null);
    setPeriodToPurge(p);
  };

  const closePurge = () => {
    if (isPurging) return;
    setPeriodToPurge(null);
    setPurgeConfirmText('');
    setPurgeError(null);
  };

  /*
   * Purge irréversible d'une période clôturée :
   * 1. sauvegarde CSV + ZIP ; on s'arrête si le ZIP n'a pas pu inclure tous les justificatifs ;
   * 2. suppression des dépenses en base ;
   * 3. suppression des fichiers du stockage (un échec ici laisse des fichiers orphelins, pas de perte) ;
   * 4. suppression de la période.
   */
  const handleExecutePurge = async () => {
    if (!periodToPurge || purgeConfirmText.trim() !== 'PURGER') return;
    if (!canPurgePeriod(periodToPurge)) {
      setPurgeError("Impossible de purger une période ouverte. Elle doit d'abord être clôturée.");
      return;
    }

    setIsPurging(true);
    setPurgeError(null);
    const period = periodToPurge;
    try {
      const periodExpenses = expensesOf(period.id);

      // 1. Sauvegarde obligatoire avant purge
      const csv = generateCsvContent(periodExpenses);
      downloadCsv(`Archive_PrePurge_${fileSafe(period.name)}.csv`, csv);
      const report = await generateAndDownloadReceiptsZip(
        periodExpenses,
        `Archive_PrePurge_Justificatifs_${fileSafe(period.name)}.zip`
      );
      if (report.missing.length > 0) {
        const n = report.missing.length;
        throw new Error(
          `sauvegarde incomplète : ${n} justificatif${n > 1 ? 's' : ''} n'${n > 1 ? 'ont' : 'a'} pas pu être ajouté${
            n > 1 ? 's' : ''
          } au ZIP. Purge annulée, rien n'a été supprimé. Réessaie plus tard.`
        );
      }

      // 2. Suppression des dépenses en base
      for (const exp of periodExpenses) {
        const { error: delExpErr } = await supabase.from('expenses').delete().eq('id', exp.id);
        if (delExpErr) throw delExpErr;
      }

      // 3. Suppression des justificatifs dans le stockage, une fois les dépenses supprimées
      const proofPaths = periodExpenses
        .map((e) => e.proof_path)
        .filter((path): path is string => Boolean(path));
      let storageWarning = '';
      if (proofPaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('receipts').remove(proofPaths);
        if (storageError) {
          console.warn('Erreur suppression fichiers storage:', storageError);
          storageWarning = ' Attention : certains fichiers sont restés dans le stockage.';
        }
      }

      // 4. Suppression de la période
      const { error: delPeriodErr } = await supabase.from('periods').delete().eq('id', period.id);
      if (delPeriodErr) throw delPeriodErr;

      setNotification(`Période « ${period.name} » purgée après sauvegarde intégrale.${storageWarning}`);
      setPeriodToPurge(null);
      setPurgeConfirmText('');
      onRefresh();
    } catch (err: any) {
      setPurgeError(`Erreur lors de la purge : ${err?.message || 'erreur inconnue'}`);
    } finally {
      setIsPurging(false);
    }
  };

  const purgeOk = purgeConfirmText.trim() === 'PURGER';

  return (
    <div className="flex flex-col gap-3">
      {notification && <Banner tone="notice">{notification}</Banner>}
      {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

      {/* Nouvelle période */}
      <section className="flex flex-col gap-2.5 rounded-[20px] border-2.5 border-line bg-surface p-3.5">
        <h2 className="text-[17px] font-extrabold">Nouvelle période</h2>
        <form onSubmit={handleCreatePeriod} className="flex flex-col gap-2.5">
          <Field label="Nom" htmlFor="new-period-name">
            <Input
              id="new-period-name"
              placeholder="Ex : Camp d'été 2027"
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
              className="min-h-[44px] rounded-lg px-3 font-medium"
            />
          </Field>
          <div role="group" aria-label="Type de période" className="grid grid-cols-2 gap-2">
            {(
              [
                ['year', 'Année'],
                ['camp', 'Camp'],
              ] as const
            ).map(([value, label]) => {
              const on = newPeriodType === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setNewPeriodType(value)}
                  className={cn(
                    'min-h-[44px] rounded-lg border-2 border-line text-[14px] font-extrabold',
                    on ? 'bg-green text-on-color' : 'bg-surface text-ink hover:bg-surface2'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={!newPeriodName.trim()}
            className="min-h-[46px] rounded-[14px] text-[15px] shadow-[3px_3px_0_rgb(var(--shadow))]"
          >
            Créer la période
          </Button>
        </form>
      </section>

      {/* Périodes : une colonne, deux dès 1024 px */}
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {periods.map((p) => {
          const isClosed = p.status === 'closed';
          const periodExpenses = expensesOf(p.id);
          const totalAmount = sumAmounts(periodExpenses.map((e) => e.amount));
          const busy = busyPeriodId === p.id;

          return (
            <li
              key={p.id}
              className="flex min-w-0 flex-col gap-2.5 rounded-[20px] border-2.5 border-line bg-surface p-3.5"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="break-words text-[17px] font-extrabold">{p.name}</span>
                  <span className="text-[13px] font-semibold text-muted">
                    {p.type === 'camp' ? 'Camp' : 'Année'} · Total {formatCurrency(totalAmount)}
                  </span>
                </div>
                <Badge variant={isClosed ? 'yellow' : 'green'} className="shrink-0">
                  {isClosed ? 'Clôturée' : 'Ouverte'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="neutral"
                  size="sm"
                  isLoading={busy}
                  onClick={() => (isClosed ? handleReopenPeriod(p) : handleClosePeriod(p))}
                  aria-label={`${isClosed ? 'Rouvrir' : 'Clôturer'} la période ${p.name}`}
                  className={smallButton}
                >
                  {isClosed ? 'Rouvrir' : 'Clôturer'}
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={() => {
                    const csv = generateCsvContent(periodExpenses);
                    downloadCsv(`Export_${fileSafe(p.name)}.csv`, csv);
                  }}
                  aria-label={`Exporter la période ${p.name} en CSV`}
                  className={smallButton}
                >
                  Exporter
                </Button>
                {/* Purge : seulement sur une période déjà clôturée */}
                {isClosed && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openPurge(p)}
                    aria-label={`Purger la période ${p.name}`}
                    className={smallButton}
                  >
                    Purger
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Fenêtre de purge */}
      <Dialog
        isOpen={Boolean(periodToPurge)}
        onClose={closePurge}
        preventClose={isPurging}
        variant="center"
        tone="danger"
        role="alertdialog"
        title={
          periodToPurge ? (
            <span className="flex items-center gap-3">
              <IconTile color="red" size={48} className="rounded-full">
                <Trash2 className="h-6 w-6" strokeWidth={2.4} />
              </IconTile>
              <span className="min-w-0 flex-1 break-words leading-tight">Purger « {periodToPurge.name} » ?</span>
            </span>
          ) : undefined
        }
      >
        {periodToPurge && (
          <div className="flex flex-col gap-3.5">
            <p className="text-[15px] font-medium leading-snug">
              Toutes les dépenses et tous les justificatifs de cette période seront supprimés définitivement. Une
              sauvegarde (CSV + ZIP des justificatifs) sera téléchargée avant : cette action est irréversible.
            </p>

            {isWithinRetention(periodToPurge) && (
              <Banner tone="warning">
                Cette période a moins de {RETENTION_YEARS} ans (début le {formatDateFr(periodToPurge.start_date)}).
                Dépenses et justificatifs doivent normalement être conservés {RETENTION_YEARS} ans : ne purge qu'en
                cas exceptionnel.
              </Banner>
            )}

            <Field label="Pour confirmer, tape PURGER" htmlFor="purge-confirm">
              <Input
                id="purge-confirm"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                className="min-h-[50px] rounded-[14px] text-[18px] font-extrabold tracking-[0.08em]"
              />
            </Field>

            {purgeError && <Banner tone="error">{purgeError}</Banner>}

            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2.5">
              <Button
                variant="neutral"
                onClick={closePurge}
                disabled={isPurging}
                className="px-2 text-[15px]"
              >
                Annuler
              </Button>
              <Button
                variant="purge"
                disabled={!purgeOk}
                isLoading={isPurging}
                onClick={handleExecutePurge}
                className="whitespace-normal px-2 text-[15px] leading-tight"
              >
                Purger définitivement
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
