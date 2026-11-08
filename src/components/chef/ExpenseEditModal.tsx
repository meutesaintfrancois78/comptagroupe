import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Expense, ExpenseCategory, PaymentMethod } from '@/types/database';
import { parseAmount } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ExpenseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  categories: ExpenseCategory[];
  onUpdated: () => void;
}

export const ExpenseEditModal: React.FC<ExpenseEditModalProps> = ({
  isOpen,
  onClose,
  expense,
  categories,
  onUpdated,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('unit_money');
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
      setComment(expense.comment || '');
      setErrorMsg(null);
    }
  }, [expense, categories]);

  if (!expense) return null;

  const selectedCat = categories.find((c) => c.id === categoryId);
  const isAutre = selectedCat?.name.toLowerCase() === 'autre';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!parsed || parsed <= 0) {
      setErrorMsg('Veuillez saisir un montant valide.');
      return;
    }
    if (isAutre && !customCategory.trim()) {
      setErrorMsg('Veuillez renseigner le motif pour "Autre".');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const updates: any = {
        amount: parsed,
        date,
        category_id: categoryId,
        custom_category: isAutre ? customCategory.trim() : null,
        payment_method: paymentMethod,
        comment: comment.trim() || null,
      };

      // Si passage en personal_money et ancien statut était not_applicable
      if (paymentMethod === 'personal_money' && expense.reimbursement_status === 'not_applicable') {
        updates.reimbursement_status = 'pending';
      } else if (paymentMethod === 'unit_money') {
        updates.reimbursement_status = 'not_applicable';
      }

      const { error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expense.id);

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

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier la dépense"
      description="Toute modification est tracée dans l'historique d'audit."
      className="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        {errorMsg && (
          <div className="p-3 bg-destructive/15 text-destructive rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">
            Montant (€)
          </label>
          <Input
            type="text"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">
            Date
          </label>
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">
            Catégorie / Motif
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isAutre && (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">
              Précision du motif libre
            </label>
            <Input
              type="text"
              required
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">
            Mode de paiement
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium"
          >
            <option value="unit_money">Argent de l'unité</option>
            <option value="personal_money">Argent perso (à rembourser)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">
            Commentaire facultatif
          </label>
          <Input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div className="pt-4 flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="default" isLoading={isLoading}>
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
