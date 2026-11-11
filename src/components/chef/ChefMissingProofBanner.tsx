import React, { useState, useEffect } from 'react';
import { AlertTriangle, Camera, Clock, ArrowRight } from 'lucide-react';
import { Expense, Unit } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { IconTile } from '@/components/ui/feedback';
import { formatCurrency, formatDateFr } from '@/lib/utils';
import { expenseMotif } from './ExpenseList';
import { ProofUploadModal } from './ProofUploadModal';
import {
  shouldShowChefProofBanner,
  calculateDismissUntil,
  getRemainingSeconds,
  getChefProofStorageKey,
} from '@/lib/bannerTimer';

interface ChefMissingProofBannerProps {
  unit: Unit;
  missingExpenses: Expense[];
  onRefresh: () => void;
  onViewAllExpenses?: () => void;
}

export const ChefMissingProofBanner: React.FC<ChefMissingProofBannerProps> = ({
  unit,
  missingExpenses,
  onRefresh,
  onViewAllExpenses,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedExpenseForUpload, setSelectedExpenseForUpload] = useState<Expense | null>(null);
  const [, setTick] = useState<number>(0);

  const missingCount = missingExpenses.length;
  const storageKey = getChefProofStorageKey(unit.id);

  // Vérification périodique du rappel de 3 minutes
  useEffect(() => {
    const checkState = () => {
      if (missingCount === 0) {
        setIsOpen(false);
        return;
      }
      const rawStored = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
      const dismissUntil = rawStored ? parseInt(rawStored, 10) : null;
      setIsOpen(shouldShowChefProofBanner(missingCount, dismissUntil));
      setTick((t) => t + 1);
    };

    checkState();
    const interval = setInterval(checkState, 1000);
    return () => clearInterval(interval);
  }, [missingCount, storageKey]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, calculateDismissUntil().toString());
    } catch {}
    setIsOpen(false);
  };

  const handleOpenNow = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setIsOpen(true);
  };

  const handleViewAll = () => {
    handleDismiss();
    onViewAllExpenses?.();
  };

  if (missingCount === 0) return null;

  // 1. Rappel discret en haut d'écran pendant les 3 minutes de « Plus tard »
  if (!isOpen) {
    const rawStored = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
    const remainingSeconds = getRemainingSeconds(rawStored ? parseInt(rawStored, 10) : null);

    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b-2.5 border-on-color bg-yellow px-4 py-1.5 text-[13px] font-semibold text-on-color animate-in fade-in duration-200">
        <span className="flex min-w-0 items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-extrabold">
              {missingCount} ticket{missingCount > 1 ? 's' : ''} manquant{missingCount > 1 ? 's' : ''} ({unit.name})
            </strong>{' '}
            · rappel dans {Math.floor(remainingSeconds / 60)} min {remainingSeconds % 60} s
          </span>
        </span>
        <button
          type="button"
          onClick={handleOpenNow}
          className="min-h-[44px] font-extrabold underline underline-offset-2 hover:opacity-85"
        >
          Ajouter maintenant
        </button>
      </div>
    );
  }

  // 2. Fenêtre imposée toutes les 3 minutes
  return (
    <>
      <Dialog
        isOpen
        preventClose
        variant="sheet"
        role="alertdialog"
        title={
          <span className="flex items-center gap-3">
            <IconTile color="yellow" size={48} className="rounded-full">
              <AlertTriangle className="h-6 w-6" strokeWidth={2.4} />
            </IconTile>
            <span className="min-w-0 flex-1 text-[21px] leading-tight">Justificatifs en attente</span>
            <span className="flex h-[34px] min-w-[34px] shrink-0 items-center justify-center rounded-full border-2.5 border-on-color bg-red px-2 text-[16px] font-extrabold text-white">
              <span className="sr-only">, </span>
              {missingCount}
            </span>
          </span>
        }
        description={
          `Pour permettre le remboursement des frais et la validation des comptes de ${unit.name}, chaque dépense doit obligatoirement avoir son ticket ou sa facture.`
        }
      >
        <div className="flex flex-col gap-3.5 pt-1">
          {/* Liste des dépenses manquantes avec ajout direct */}
          <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-0.5">
            {missingExpenses.map((exp) => {
              const motif = expenseMotif(exp);
              const isPersonal = exp.payment_method === 'personal_money';
              const chefName = exp.creator ? `${exp.creator.first_name} ${exp.creator.last_name}`.trim() : 'Chef';

              return (
                <div
                  key={exp.id}
                  className="flex flex-col gap-2.5 rounded-[18px] border-2.5 border-line bg-surface p-3.5 shadow-pop-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[16px] font-extrabold text-ink leading-tight truncate">
                        {motif}
                      </span>
                      <span className="text-[13px] font-bold text-muted">
                        {formatDateFr(exp.date)} · Déclaré par {chefName}
                      </span>
                      <span className="text-[12px] font-semibold text-muted">
                        {isPersonal ? (
                          <span className="text-error font-bold">⚠️ Argent personnel (remboursement bloqué)</span>
                        ) : (
                          "Argent de l'unité"
                        )}
                      </span>
                    </div>
                    <span className="text-[18px] font-extrabold text-ink shrink-0">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setSelectedExpenseForUpload(exp)}
                    className="min-h-[44px] w-full rounded-xl text-[14px] font-extrabold"
                  >
                    <Camera className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                    Ajouter le ticket
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted pt-1">
            <Clock className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
            Cette fenêtre revient toutes les 3 minutes tant qu'il reste des justificatifs manquants pour {unit.name}.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              variant="neutral"
              onClick={handleDismiss}
              className="min-h-[48px] w-full rounded-xl border-2.5 border-line shadow-pop font-extrabold text-[15px]"
            >
              Plus tard (3 min)
            </Button>

            {onViewAllExpenses && (
              <button
                type="button"
                onClick={handleViewAll}
                className="flex items-center justify-center gap-1.5 py-2 text-[14px] font-bold text-ink underline underline-offset-4 hover:opacity-80"
              >
                Voir toutes les dépenses de l'unité
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Modale d'upload direct du justificatif */}
      <ProofUploadModal
        isOpen={Boolean(selectedExpenseForUpload)}
        expense={selectedExpenseForUpload}
        onClose={() => setSelectedExpenseForUpload(null)}
        onSuccess={() => {
          setSelectedExpenseForUpload(null);
          onRefresh();
        }}
      />
    </>
  );
};