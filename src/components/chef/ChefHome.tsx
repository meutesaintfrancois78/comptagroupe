import React, { useEffect, useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Profile, Unit, Period, ExpenseCategory, Expense } from '@/types/database';
import { cn, formatCurrency, sumAmounts } from '@/lib/utils';
import { ExpenseMultiStepForm } from './ExpenseMultiStepForm';
import { ExpenseList, categoryIcon, expenseMotif, formatDateShort, shortName } from './ExpenseList';
import { hasValidProof } from '@/lib/permissions';

interface ChefHomeProps {
  profile: Profile;
  unit: Unit;
  activePeriod: Period;
  categories: ExpenseCategory[];
  expenses: Expense[];
  isOnline: boolean;
  onRefresh: () => void;
  requestedView?: 'home' | 'new_expense' | 'list' | null;
}

/** Nombre de dépenses récentes montrées sur l'accueil (le reste dans « Tout voir ») */
const HOME_PREVIEW_COUNT = 6;

/**
 * Colonne chef : 640 px max, centrée, gouttières de 18 px.
 * Hauteur mini pour poser les boutons d'action en bas d'écran (en-tête et pied de page déduits).
 */
const column = 'mx-auto flex w-full max-w-chef flex-col px-[18px] min-h-[calc(100dvh-200px)]';

export const ChefHome: React.FC<ChefHomeProps> = ({
  profile,
  unit,
  activePeriod,
  categories,
  expenses,
  isOnline,
  onRefresh,
  requestedView,
}) => {
  const [view, setView] = useState<'home' | 'new_expense' | 'list'>('home');

  useEffect(() => {
    if (requestedView) {
      setView(requestedView);
    }
  }, [requestedView]);

  // Chaque changement d'écran repart du haut de la page
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  if (view === 'new_expense') {
    return (
      <div className={cn(column, 'py-[18px]')}>
        <ExpenseMultiStepForm
          profile={profile}
          unit={unit}
          activePeriod={activePeriod}
          categories={categories}
          isOnline={isOnline}
          onSubmitted={onRefresh}
          onSuccess={() => {
            onRefresh();
            setView('list');
          }}
          onCancel={() => setView('home')}
        />
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className={cn(column, 'gap-3.5 pb-[22px] pt-3')}>
        <button
          type="button"
          onClick={() => setView('home')}
          className="flex min-h-[44px] items-center gap-1.5 self-start text-[15px] font-bold text-ink"
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
          Retour à l'accueil
        </button>
        <ExpenseList
          expenses={expenses}
          unit={unit}
          activePeriod={activePeriod}
          categories={categories}
          onRefresh={onRefresh}
          onNewExpense={() => setView('new_expense')}
        />
      </div>
    );
  }

  const total = sumAmounts(expenses);
  const recent = expenses.slice(0, HOME_PREVIEW_COUNT);
  const countLabel = `${expenses.length} dépense${expenses.length > 1 ? 's' : ''}`;

  return (
    <div className={cn(column, 'gap-3.5 pt-4 lg:pb-[18px]')}>
      {/* Gros bouton : collé en bas sur téléphone et tablette, en haut de la colonne sur PC */}
      <div className="sticky bottom-0 z-20 order-last -mx-[18px] mt-auto bg-bg px-[18px] pt-2 pb-safe lg:static lg:order-first lg:mx-0 lg:mt-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0">
        <button
          type="button"
          onClick={() => setView('new_expense')}
          className="flex h-[176px] w-full flex-col items-start justify-between rounded-[28px] border-2.5 border-line bg-green px-6 py-[22px] text-left text-on-color shadow-pop-lg transition-transform hover:brightness-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <span
            aria-hidden="true"
            className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2.5 border-on-color bg-white"
          >
            <Plus className="h-[30px] w-[30px]" strokeWidth={2.8} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[28px] font-extrabold leading-none min-[360px]:text-[32px]">Nouvelle dépense</span>
            <span className="text-[15px] font-semibold">Montant, motif, paiement, justificatif</span>
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-[21px] font-extrabold leading-tight">Dépenses de l'unité</h1>
          <span className="text-[13px] font-semibold text-muted">
            {activePeriod.name} · {countLabel} · {formatCurrency(total)}
          </span>
        </div>
        {expenses.length > 0 && (
          <button
            type="button"
            onClick={() => setView('list')}
            className="h-11 shrink-0 rounded-full border-2.5 border-line bg-blue px-3.5 text-[14px] font-extrabold text-on-color"
          >
            Tout voir
          </button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] border-2.5 border-dashed border-divider px-5 py-8 text-center">
          <MartyMascot expression="ready" size={100} circle="green" />
          <h2 className="text-[18px] font-extrabold">À toi de jouer !</h2>
          <p className="max-w-xs text-[14px] font-medium text-muted">
            Aucune dépense pour {unit.name} pour l'instant. Déclare la première avec le bouton vert.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 pb-2 pr-1.5" aria-label="Dernières dépenses">
          {recent.map((exp, i) => {
            const Icon = categoryIcon(exp.category || (exp.custom_category ? 'autre' : ''));
            return (
              <li key={exp.id} className="flex">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="flex min-h-[84px] w-full min-w-0 items-center gap-3.5 rounded-[22px] border-2.5 border-line bg-surface px-4 py-3 text-left text-ink shadow-pop-md hover:bg-surface2"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] border-2.5 border-on-color text-on-color',
                      i % 2 === 0 ? 'bg-green' : 'bg-blue'
                    )}
                  >
                    <Icon className="h-[26px] w-[26px]" strokeWidth={2.2} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span lang="fr" className="hyphens-auto text-[17px] font-extrabold leading-tight">{expenseMotif(exp)}</span>
                    <span className="text-[13px] font-semibold text-muted">
                      {formatDateShort(exp.date)} · {shortName(exp.creator)}
                    </span>
                    {!hasValidProof(exp) && (
                      <span className="text-[12px] font-extrabold text-error">
                        ⚠️ Ticket manquant
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[19px] font-extrabold">{formatCurrency(exp.amount)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
