import React, { useEffect, useState } from 'react';
import { History, Clock, ArrowRight } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ExpenseHistory } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface ExpenseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string | null;
  expenseAmount?: number;
}

export const ExpenseHistoryModal: React.FC<ExpenseHistoryModalProps> = ({
  isOpen,
  onClose,
  expenseId,
  expenseAmount,
}) => {
  const [history, setHistory] = useState<ExpenseHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !expenseId) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    supabase
      .from('expense_history')
      .select('*')
      .eq('expense_id', expenseId)
      .order('changed_at', { ascending: false })
      .then(({ data }) => {
        setHistory((data || []) as ExpenseHistory[]);
        setIsLoading(false);
      });
  }, [isOpen, expenseId]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Historique des modifications"
      description={expenseAmount ? `Dépense de ${expenseAmount} €` : undefined}
      className="max-w-md"
    >
      <div className="py-2">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            Chargement de l'historique...
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <History className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">Aucune modification enregistrée.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cette dépense est conforme à sa saisie initiale.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {history.map((item) => {
              const dateStr = new Date(item.changed_at).toLocaleString('fr-FR', {
                dateStyle: 'short',
                timeStyle: 'short',
              });
              return (
                <div
                  key={item.id}
                  className="bg-muted/40 rounded-2xl p-3.5 border border-border text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span className="text-primary font-bold">{item.field_name}</span>
                    <span className="text-[11px] text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1 inline" /> {dateStr}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-foreground/80 pt-1">
                    <span className="line-through text-muted-foreground bg-destructive/10 px-2 py-0.5 rounded">
                      {item.old_value || 'vide'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {item.new_value || 'vide'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
};
