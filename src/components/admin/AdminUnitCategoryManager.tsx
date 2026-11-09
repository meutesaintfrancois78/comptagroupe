import React, { useState } from 'react';
import { Unit, ExpenseCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banner, Switch } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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

/** Bloc de la maquette : titre, liste avec interrupteurs, champ + « Ajouter » */
function ManagerBlock({
  title,
  items,
  addLabel,
  placeholder,
  onToggle,
  onAdd,
}: {
  title: string;
  items: BlockItem[];
  addLabel: string;
  placeholder: string;
  /** Renvoient un message d'erreur, ou null si tout s'est bien passé */
  onToggle: (item: BlockItem) => Promise<string | null>;
  onAdd: (name: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    if (items.some((it) => it.name.trim().toLowerCase() === name.toLowerCase())) {
      setErrorMsg(`« ${name} » existe déjà.`);
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const error = await onAdd(name);
      if (error) setErrorMsg(error);
      else setValue('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: BlockItem) => {
    setErrorMsg(null);
    const error = await onToggle(item);
    if (error) setErrorMsg(error);
  };

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-[20px] border-2.5 border-line bg-surface p-3.5 shadow-pop">
      <h2 className="mb-0.5 text-[18px] font-extrabold">{title}</h2>
      <ul className="flex flex-col">
        {items.map((it) => (
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
          aria-label={addLabel}
          placeholder={placeholder}
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

export const AdminUnitCategoryManager: React.FC<AdminUnitCategoryManagerProps> = ({
  units,
  categories,
  onRefresh,
}) => {
  // Chaque écriture renvoie l'erreur éventuelle de la base pour l'afficher sous le bloc
  const done = (error: { message?: string } | null | undefined, action: string) => {
    if (error) return `${action} impossible : ${error.message || 'erreur inconnue'}`;
    onRefresh();
    return null;
  };

  const handleCreateUnit = async (name: string) => {
    const { error } = await supabase.from('units').insert({ name, is_active: true });
    return done(error, "Ajout de l'unité");
  };

  const handleCreateCategory = async (name: string) => {
    const { error } = await supabase.from('expense_categories').insert({ name, is_active: true });
    return done(error, 'Ajout de la catégorie');
  };

  const handleToggleUnitActive = async (unit: BlockItem) => {
    const { error } = await supabase.from('units').update({ is_active: !unit.is_active }).eq('id', unit.id);
    return done(error, "Modification de l'unité");
  };

  const handleToggleCategoryActive = async (cat: BlockItem) => {
    const { error } = await supabase.from('expense_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    return done(error, 'Modification de la catégorie');
  };

  return (
    // Empilés sur téléphone et tablette, côte à côte dès 1024 px
    <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
      <ManagerBlock
        title="Unités scoutes"
        items={units}
        addLabel="Nouvelle unité"
        placeholder="Ex : Meute 4"
        onToggle={handleToggleUnitActive}
        onAdd={handleCreateUnit}
      />
      <ManagerBlock
        title="Catégories de dépenses"
        items={categories}
        addLabel="Nouvelle catégorie"
        placeholder="Ex : Assurance"
        onToggle={handleToggleCategoryActive}
        onAdd={handleCreateCategory}
      />
    </div>
  );
};
