import React, { useState } from 'react';
import { Plus, Tag, Check, X } from 'lucide-react';
import { Unit, ExpenseCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface AdminUnitCategoryManagerProps {
  units: Unit[];
  categories: ExpenseCategory[];
  onRefresh: () => void;
}

export const AdminUnitCategoryManager: React.FC<AdminUnitCategoryManagerProps> = ({
  units,
  categories,
  onRefresh,
}) => {
  const [newUnitName, setNewUnitName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    setIsSubmitting(true);
    await supabase.from('units').insert({ name: newUnitName.trim(), is_active: true });
    setNewUnitName('');
    setIsSubmitting(false);
    onRefresh();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsSubmitting(true);
    await supabase.from('expense_categories').insert({ name: newCategoryName.trim(), is_active: true });
    setNewCategoryName('');
    setIsSubmitting(false);
    onRefresh();
  };

  const handleToggleUnitActive = async (unit: Unit) => {
    await supabase.from('units').update({ is_active: !unit.is_active }).eq('id', unit.id);
    onRefresh();
  };

  const handleToggleCategoryActive = async (cat: ExpenseCategory) => {
    await supabase.from('expense_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    onRefresh();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Gestion des Unités */}
      <div className="bg-card rounded-3xl border p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Unités scoutes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unités actives dans le Groupe Saint-Martin
          </p>
        </div>

        <form onSubmit={handleCreateUnit} className="flex gap-2">
          <Input
            placeholder="Ex : Meute 4"
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            className="h-10 text-xs"
          />
          <Button size="sm" type="submit" isLoading={isSubmitting}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </form>

        <div className="space-y-2 pt-2">
          {units.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 text-xs font-semibold"
            >
              <span className={u.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}>
                {u.name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToggleUnitActive(u)}
                className="h-7 text-[11px]"
              >
                {u.is_active ? (
                  <span className="text-emerald-700">Active</span>
                ) : (
                  <span className="text-muted-foreground">Inactive</span>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Gestion des Catégories de dépenses */}
      <div className="bg-card rounded-3xl border p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Catégories de dépenses</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Liste proposée aux chefs lors de la saisie
          </p>
        </div>

        <form onSubmit={handleCreateCategory} className="flex gap-2">
          <Input
            placeholder="Ex : Assurance"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="h-10 text-xs"
          />
          <Button size="sm" type="submit" isLoading={isSubmitting}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </form>

        <div className="space-y-2 pt-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 text-xs font-semibold"
            >
              <div className="flex items-center space-x-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={c.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}>
                  {c.name}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToggleCategoryActive(c)}
                className="h-7 text-[11px]"
              >
                {c.is_active ? (
                  <span className="text-emerald-700">Active</span>
                ) : (
                  <span className="text-muted-foreground">Inactive</span>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
