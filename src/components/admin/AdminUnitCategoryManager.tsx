import React, { useState } from 'react';
import { Unit, ExpenseCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banner, Switch } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { IconPickerModal } from './IconPickerModal';
import {
  getCategoryIcon,
  isSystemCategory,
  canActivateCategory,
  getActiveCustomCategoriesCount,
  MAX_ACTIVE_CUSTOM_CATEGORIES,
} from '@/lib/categoryIcons';

interface AdminUnitCategoryManagerProps {
  units: Unit[];
  categories: ExpenseCategory[];
  onRefresh: () => void;
}

interface BlockItem {
  id: string;
  name: string;
  is_active: boolean;
}

/** Bloc des unités scoutes : liste avec interrupteurs, champ + « Ajouter » */
function UnitManagerBlock({
  units,
  onRefresh,
}: {
  units: Unit[];
  onRefresh: () => void;
}) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    if (units.some((it) => it.name.trim().toLowerCase() === name.toLowerCase())) {
      setErrorMsg(`« ${name} » existe déjà.`);
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('units').insert({ name, is_active: true });
      if (error) {
        setErrorMsg(`Ajout de l'unité impossible : ${error.message || 'erreur inconnue'}`);
      } else {
        setValue('');
        onRefresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (unit: BlockItem) => {
    setErrorMsg(null);
    const { error } = await supabase.from('units').update({ is_active: !unit.is_active }).eq('id', unit.id);
    if (error) {
      setErrorMsg(`Modification de l'unité impossible : ${error.message || 'erreur inconnue'}`);
    } else {
      onRefresh();
    }
  };

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-[20px] border-2.5 border-line bg-surface p-3.5 shadow-pop">
      <h2 className="mb-0.5 text-[18px] font-extrabold text-ink">Unités scoutes</h2>
      <ul className="flex flex-col">
        {units.map((it) => (
          <li key={it.id} className="flex min-h-[44px] items-center justify-between gap-2.5">
            <span className={cn('min-w-0 break-words text-[15px] font-bold', it.is_active ? 'text-ink' : 'text-muted')}>
              {it.name}
            </span>
            <Switch
              checked={it.is_active}
              onChange={() => handleToggle(it)}
              label={`${it.name} : ${it.is_active ? 'active' : 'inactive'}`}
            />
          </li>
        ))}
      </ul>
      {errorMsg && <Banner tone="error">{errorMsg}</Banner>}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t-2 border-divider pt-2">
        <Input
          aria-label="Nouvelle unité"
          placeholder="Ex : Meute 4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-[44px] min-w-0 flex-1 rounded-lg px-3 font-medium"
        />
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="min-h-[44px] shrink-0 rounded-lg px-3.5 text-[14px] shadow-none"
        >
          Ajouter
        </Button>
      </form>
    </section>
  );
}

/** Bloc des motifs de paiement : icônes personnalisables, quota strict 5 + Autre */
function CategoryManagerBlock({
  categories,
  onRefresh,
}: {
  categories: ExpenseCategory[];
  onRefresh: () => void;
}) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [editingIconCat, setEditingIconCat] = useState<ExpenseCategory | null>(null);

  const activeCustomCount = getActiveCustomCategoriesCount(categories);
  const isQuotaFull = activeCustomCount >= MAX_ACTIVE_CUSTOM_CATEGORIES;

  // Tri : catégories personnalisées d'abord (alphabétique), puis le motif système « Autre » en dernier
  const sortedCategories = [
    ...categories.filter((c) => !isSystemCategory(c)).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    ...categories.filter((c) => isSystemCategory(c)),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    if (categories.some((it) => it.name.trim().toLowerCase() === name.toLowerCase())) {
      setErrorMsg(`« ${name} » existe déjà.`);
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSubmitting(true);
    try {
      const willBeActive = !isQuotaFull;
      const { error } = await supabase.from('expense_categories').insert({
        name,
        is_active: willBeActive,
        icon: 'Receipt',
      });
      if (error) {
        setErrorMsg(`Ajout impossible : ${error.message || 'erreur inconnue'}`);
      } else {
        setValue('');
        if (!willBeActive) {
          setInfoMsg(`« ${name} » a été ajouté en statut inactif car le quota de ${MAX_ACTIVE_CUSTOM_CATEGORIES} motifs actifs (+ Autre) est atteint.`);
        }
        onRefresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (cat: ExpenseCategory) => {
    setErrorMsg(null);
    setInfoMsg(null);

    // « Autre » est le motif système indispensable : impossible de le désactiver
    if (isSystemCategory(cat)) {
      return;
    }

    if (!cat.is_active) {
      const check = canActivateCategory(categories, cat.id);
      if (!check.canActivate) {
        setErrorMsg(check.reason || `Quota atteint : maximum ${MAX_ACTIVE_CUSTOM_CATEGORIES} motifs actifs (+ Autre).`);
        return;
      }
    }

    const { error } = await supabase
      .from('expense_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id);

    if (error) {
      setErrorMsg(`Modification impossible : ${error.message || 'erreur inconnue'}`);
    } else {
      onRefresh();
    }
  };

  const handleSelectIcon = async (iconName: string) => {
    if (!editingIconCat) return;
    setErrorMsg(null);
    const { error } = await supabase
      .from('expense_categories')
      .update({ icon: iconName })
      .eq('id', editingIconCat.id);

    if (error) {
      setErrorMsg(`Mise à jour de l'icône impossible : ${error.message || 'erreur inconnue'}`);
    } else {
      onRefresh();
    }
  };

  return (
    <>
      <section className="flex min-w-0 flex-col gap-2 rounded-[20px] border-2.5 border-line bg-surface p-3.5 shadow-pop">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-extrabold text-ink">Motifs de paiement</h2>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border',
              isQuotaFull
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-green/15 text-forest border-green/30'
            )}
          >
            {activeCustomCount} / {MAX_ACTIVE_CUSTOM_CATEGORIES} actifs (+ Autre)
          </span>
        </div>

        <p className="text-[12px] font-medium text-muted">
          Clique sur l'icône d'un motif pour la personnaliser. Le motif système « Autre » reste toujours actif pour la saisie libre.
        </p>

        <ul className="flex flex-col divide-y divide-divider/40">
          {sortedCategories.map((cat) => {
            const isSystem = isSystemCategory(cat);
            const Icon = getCategoryIcon(cat.icon, cat.name);

            return (
              <li
                key={cat.id}
                className="flex min-h-[48px] items-center justify-between gap-2.5 py-1"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingIconCat(cat)}
                    title={`Changer l'icône de « ${cat.name} »`}
                    aria-label={`Changer l'icône de ${cat.name}`}
                    className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-surface2 text-ink transition-transform hover:scale-105 hover:border-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                    <span className="sr-only">Changer l'icône</span>
                  </button>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'min-w-0 break-words text-[15px] font-bold',
                        cat.is_active ? 'text-ink' : 'text-muted'
                      )}
                    >
                      {cat.name}
                    </span>
                    {isSystem && (
                      <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted">
                        Système
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <Switch
                    checked={isSystem ? true : cat.is_active}
                    disabled={isSystem}
                    onChange={() => handleToggle(cat)}
                    label={`${cat.name} : ${isSystem ? 'système actif obligatoire' : cat.is_active ? 'actif' : 'inactif'}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {errorMsg && <Banner tone="error">{errorMsg}</Banner>}
        {infoMsg && <Banner tone="notice">{infoMsg}</Banner>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-t-2 border-divider pt-2">
          {isQuotaFull && (
            <p className="text-[11px] font-medium text-amber-800">
              Quota de {MAX_ACTIVE_CUSTOM_CATEGORIES} motifs actifs atteint. Les nouveaux motifs seront ajoutés avec le statut inactif.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              aria-label="Nouveau motif"
              placeholder="Ex : Activité extraordinaire"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="min-h-[44px] min-w-0 flex-1 rounded-lg px-3 font-medium"
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="min-h-[44px] shrink-0 rounded-lg px-3.5 text-[14px] shadow-none"
            >
              Ajouter
            </Button>
          </div>
        </form>
      </section>

      {editingIconCat && (
        <IconPickerModal
          isOpen={true}
          onClose={() => setEditingIconCat(null)}
          categoryName={editingIconCat.name}
          currentIcon={editingIconCat.icon}
          onSelectIcon={(iconName) => handleSelectIcon(iconName)}
        />
      )}
    </>
  );
}

export const AdminUnitCategoryManager: React.FC<AdminUnitCategoryManagerProps> = ({
  units,
  categories,
  onRefresh,
}) => {
  return (
    // Empilés sur téléphone et tablette, côte à côte dès 1024 px
    <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
      <UnitManagerBlock units={units} onRefresh={onRefresh} />
      <CategoryManagerBlock categories={categories} onRefresh={onRefresh} />
    </div>
  );
};
