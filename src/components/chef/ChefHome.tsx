import React, { useState } from 'react';
import { PlusCircle, Table, Sparkles } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';
import { Profile, Unit, Period, ExpenseCategory, Expense } from '@/types/database';
import { ExpenseMultiStepForm } from './ExpenseMultiStepForm';
import { ExpenseList } from './ExpenseList';

interface ChefHomeProps {
  profile: Profile;
  unit: Unit;
  activePeriod: Period;
  categories: ExpenseCategory[];
  expenses: Expense[];
  isOnline: boolean;
  onRefresh: () => void;
}

export const ChefHome: React.FC<ChefHomeProps> = ({
  profile,
  unit,
  activePeriod,
  categories,
  expenses,
  isOnline,
  onRefresh,
}) => {
  const [view, setView] = useState<'home' | 'new_expense' | 'list'>('home');

  if (view === 'new_expense') {
    return (
      <ExpenseMultiStepForm
        profile={profile}
        unit={unit}
        activePeriod={activePeriod}
        categories={categories}
        isOnline={isOnline}
        onSuccess={() => {
          onRefresh();
          setView('list');
        }}
        onCancel={() => setView('home')}
      />
    );
  }

  if (view === 'list') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('home')}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Retour à l'accueil
        </Button>
        <ExpenseList
          expenses={expenses}
          unit={unit}
          categories={categories}
          onRefresh={onRefresh}
          onNewExpense={() => setView('new_expense')}
        />
      </div>
    );
  }

  const isBrandNewChef = expenses.length === 0;

  return (
    <div className="max-w-md mx-auto py-6 px-4 space-y-6 text-center">
      {/* Si chef tout neuf sans dépense : Marty tend les mains "à toi de jouer" */}
      {isBrandNewChef ? (
        <div className="bg-card rounded-3xl border p-6 shadow-sm">
          <MartyMascot
            expression="ready"
            size="lg"
            title="À toi de jouer !"
            subtitle={`Bienvenue à la ${unit.name}. Tu n'as pas encore saisi de dépense.`}
          />
        </div>
      ) : (
        <div className="text-left bg-card rounded-3xl border p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Espace Chef d'Unité
          </div>
          <h2 className="text-xl font-extrabold text-foreground mt-0.5">
            {unit.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Période active : <strong>{activePeriod.name}</strong> • {expenses.length} dépense(s)
          </p>
        </div>
      )}

      {/* Les Deux Gros Boutons (Section 4 du cahier des charges) */}
      <div className="space-y-4 pt-2">
        {/* 1. NOUVELLE DÉPENSE (Le plus gros et le plus visible) */}
        <button
          onClick={() => setView('new_expense')}
          className="w-full group p-6 rounded-3xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white shadow-xl shadow-emerald-900/20 transition-all flex flex-col items-center justify-center text-center space-y-2 border-2 border-emerald-600"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white mb-1 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-10 h-10" />
          </div>
          <span className="text-2xl font-black tracking-tight">
            Nouvelle dépense
          </span>
          <span className="text-xs text-emerald-100 font-medium max-w-xs">
            Prends en photo ton ticket et déclare ton achat en 30 secondes
          </span>
        </button>

        {/* 2. DÉPENSES TOTALES */}
        <button
          onClick={() => setView('list')}
          className="w-full p-4 rounded-2xl bg-card hover:bg-accent active:scale-[0.98] text-foreground border shadow-sm transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base text-foreground">
                Dépenses totales
              </div>
              <div className="text-xs text-muted-foreground">
                Consulter et modifier les dépenses de {unit.name}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-primary">
            {expenses.length} dépenses →
          </span>
        </button>
      </div>
    </div>
  );
};
