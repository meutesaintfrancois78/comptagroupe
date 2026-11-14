import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AVAILABLE_CATEGORY_ICONS } from '@/lib/categoryIcons';
import { cn } from '@/lib/utils';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  currentIcon?: string | null;
  onSelectIcon: (iconName: string) => Promise<void> | void;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  categoryName,
  currentIcon,
  onSelectIcon,
}) => {
  const [selected, setSelected] = useState<string>(currentIcon || 'Receipt');
  const [isSaving, setIsSaving] = useState(false);

  // Synchronise l'icône courante à l'ouverture
  React.useEffect(() => {
    if (isOpen) {
      setSelected(currentIcon || 'Receipt');
      setIsSaving(false);
    }
  }, [isOpen, currentIcon]);

  const handlePick = async (name: string) => {
    setSelected(name);
    setIsSaving(true);
    try {
      await onSelectIcon(name);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => !isSaving && onClose()}
      title={`Icône pour « ${categoryName} »`}
      description="Sélectionne l'icône la plus évocatrice parmi la palette scoute et compta."
      variant="center"
      className="max-w-[540px]"
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-2.5 max-h-[55vh] overflow-y-auto p-1 sm:grid-cols-6">
          {AVAILABLE_CATEGORY_ICONS.map((def) => {
            const Icon = def.icon;
            const isCurrent = selected === def.name;
            return (
              <button
                key={def.name}
                type="button"
                onClick={() => handlePick(def.name)}
                disabled={isSaving}
                className={cn(
                  'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-2 text-center transition-all',
                  isCurrent
                    ? 'border-green bg-green/15 text-ink shadow-sm'
                    : 'border-line bg-surface hover:bg-surface2 text-ink hover:border-ink'
                )}
                title={def.label}
                aria-label={`Choisir l'icône ${def.label}`}
              >
                <Icon className="h-6 w-6 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                <span className="text-[10px] font-bold leading-tight line-clamp-2">
                  {def.label.split('/')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-divider pt-2">
          <Button variant="neutral" onClick={onClose} disabled={isSaving}>
            Fermer
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
