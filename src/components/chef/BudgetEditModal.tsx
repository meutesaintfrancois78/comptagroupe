import React, { useState, useEffect } from 'react';
import { Coins, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banner } from '@/components/ui/feedback';
import { parseAmount, amountError } from '@/lib/utils';

interface BudgetEditModalProps {
  isOpen: boolean;
  unitName: string;
  currentBudget: number | null;
  onSave: (newBudget: number | null) => void;
  onClose: () => void;
}

export const BudgetEditModal: React.FC<BudgetEditModalProps> = ({
  isOpen,
  unitName,
  currentBudget,
  onSave,
  onClose,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountStr(currentBudget ? String(currentBudget).replace('.', ',') : '');
      setErrorMsg(null);
    }
  }, [isOpen, currentBudget]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountStr.trim()) {
      onSave(null);
      onClose();
      return;
    }

    const parsed = parseAmount(amountStr, 50000);
    if (!parsed || parsed <= 0) {
      setErrorMsg(amountError(amountStr, 50000) || 'Montant de budget invalide.');
      return;
    }

    onSave(parsed);
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-edit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border-2.5 border-line bg-surface p-6 shadow-pop-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow/20 text-yellow border-2 border-line">
              <Coins className="h-5 w-5" />
            </span>
            <div>
              <h2 id="budget-edit-title" className="text-[18px] font-extrabold text-ink leading-tight">
                Budget de l'unité
              </h2>
              <p className="text-[13px] font-semibold text-muted">{unitName}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-line bg-surface text-ink hover:bg-surface2"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="budget-input" className="text-[14px] font-bold text-ink">
              Enveloppe budgétaire prévisionnelle (€)
            </label>
            <div className="relative flex items-center">
              <Input
                id="budget-input"
                type="text"
                inputMode="decimal"
                placeholder="Ex : 2500"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setErrorMsg(null);
                }}
                className="pr-10 text-[18px] font-extrabold rounded-[14px]"
                autoFocus
              />
              <span className="absolute right-3.5 text-[16px] font-extrabold text-muted pointer-events-none">
                €
              </span>
            </div>
            <p className="text-[12px] font-semibold text-muted">
              Laisse vide pour ne pas définir de plafond limite.
            </p>
          </div>

          {errorMsg && (
            <Banner tone="error" className="text-[13px]">
              {errorMsg}
            </Banner>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" variant="primary" className="w-full justify-center">
              Enregistrer le budget
            </Button>
            {currentBudget && (
              <Button
                type="button"
                variant="neutral"
                onClick={handleClear}
                className="w-full justify-center text-muted hover:text-ink text-[13px]"
              >
                Supprimer le plafond budgétaire
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
