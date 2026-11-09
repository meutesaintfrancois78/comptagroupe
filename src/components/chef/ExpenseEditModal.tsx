import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Banner } from '@/components/ui/feedback';
import { Expense, ExpenseCategory, PaymentMethod, Unit } from '@/types/database';
import { cn, parseAmount } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { buildExpenseUpdatePayload } from '@/lib/permissions';

interface ExpenseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  categories: ExpenseCategory[];
  units?: Unit[];
  isAdmin?: boolean;
  onUpdated: () => void;
}

// Champs compacts de la fenêtre « Modifier » : 46 px, rayon 12
const editField = 'min-h-[46px] rounded-lg px-3 min-w-0';

const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="text-[13px] font-bold">
    {children}
  </label>
);

export const ExpenseEditModal: React.FC<ExpenseEditModalProps> = ({
  isOpen,
  onClose,
  expense,
  categories,
  units = [],
  isAdmin = false,
  onUpdated,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('unit_money');
  const [unitId, setUnitId] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString().replace('.', ','));
      setDate(expense.date);
      setCategoryId(expense.category_id || categories[0]?.id || '');
      setCustomCategory(expense.custom_category || '');
      setPaymentMethod(expense.payment_method);
      setUnitId(expense.unit_id || '');
      setComment(expense.comment || '');
      setErrorMsg(null);
    }
  }, [expense, categories]);

  if (!expense) return null;

  const isRefunded = expense.reimbursement_status === 'reimbursed';
  const isLockedForChef = isRefunded && !isAdmin;

  const selectedCat = categories.find((c) => c.id === categoryId);
  const isAutre = selectedCat?.name.toLowerCase() === 'autre';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedForChef) return;
    const parsed = parseAmount(amount);
    if (!parsed || parsed <= 0) {
      setErrorMsg('Saisis un montant valide.');
      return;
    }
    if (isAutre && !customCategory.trim()) {
      setErrorMsg('Précise le motif pour « Autre ».');
      return;
    }

    const payloadResult = buildExpenseUpdatePayload(
      expense,
      {
        amount: parsed,
        date,
        category_id: categoryId,
        custom_category: isAutre ? customCategory.trim() : null,
        payment_method: paymentMethod,
        comment: comment.trim() || null,
        unit_id: unitId,
      },
      isAdmin ? 'admin' : 'chef'
    );

    if (!payloadResult.allowed) {
      setErrorMsg(payloadResult.error || 'Action non autorisée.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from('expenses').update(payloadResult.payload).eq('id', expense.id);

      if (error) {
        throw new Error(error.message || 'Erreur lors de la modification.');
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur de modification.');
    } finally {
      setIsLoading(false);
    }
  };

  const id = (name: string) => `edit-${expense.id}-${name}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="text-[24px]">{isLockedForChef ? 'Dépense remboursée' : 'Modifier la dépense'}</span>}
      description="Chaque modification est notée dans l'historique : qui, quand, avant et après."
    >
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        {isLockedForChef && (
          <div className="flex items-start gap-2.5 rounded-[14px] border-2 border-on-color bg-yellow px-3.5 py-3 text-[13px] font-semibold leading-snug text-on-color">
            <Lock className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span>
              Cette dépense a déjà été remboursée par la trésorerie : elle est verrouillée en lecture seule.
            </span>
          </div>
        )}

        {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

        <fieldset disabled={isLockedForChef} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex min-w-0 flex-col gap-1">
              <Label htmlFor={id('amount')}>Montant (€)</Label>
              <Input
                id={id('amount')}
                type="text"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(editField, 'font-bold')}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label htmlFor={id('date')}>Date</Label>
              <Input
                id={id('date')}
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={cn(editField, 'px-2 text-[15px] font-medium')}
              />
            </div>
          </div>

          {isAdmin && units.length > 0 && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={id('unit')}>Unité rattachée</Label>
              <Select
                id={id('unit')}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className={cn(editField, 'font-medium')}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor={id('cat')}>Catégorie</Label>
            <Select
              id={id('cat')}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={cn(editField, 'font-medium')}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {isAutre && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={id('custom')}>Précisez le motif</Label>
              <Input
                id={id('custom')}
                type="text"
                required
                placeholder="Ex : double des clés du local"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className={cn(editField, 'font-medium')}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor={id('pay')}>Mode de paiement</Label>
            <Select
              id={id('pay')}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className={cn(editField, 'font-medium')}
            >
              <option value="unit_money">Argent de l'unité</option>
              <option value="personal_money">Argent perso</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={id('comment')}>Commentaire</Label>
            <Textarea
              id={id('comment')}
              rows={2}
              maxLength={300}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-w-0 resize-none rounded-lg px-3 py-2.5 font-medium"
            />
          </div>
        </fieldset>

        {isLockedForChef ? (
          <Button type="button" variant="neutral" onClick={onClose} className="mt-1 w-full text-[15px]">
            Fermer
          </Button>
        ) : (
          <div className="mt-1 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2.5">
            <Button type="button" variant="neutral" onClick={onClose} className="px-2 text-[15px]">
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="whitespace-normal px-2 text-[15px] leading-tight"
            >
              Enregistrer les modifications
            </Button>
          </div>
        )}
      </form>
    </Dialog>
  );
};
