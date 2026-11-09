import React, { useEffect, useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/feedback';
import { Profile, Unit } from '@/types/database';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface UnitChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  units: Unit[];
  /** Appelé après l'envoi ou l'annulation d'une demande */
  onChanged?: (requestedUnitId: string | null) => void;
}

/**
 * Demande de changement d'unité par un chef : écrit profiles.requested_unit_id,
 * qu'un admin accepte ou refuse dans la gestion des utilisateurs.
 */
export const UnitChangeRequestModal: React.FC<UnitChangeRequestModalProps> = ({
  isOpen,
  onClose,
  profile,
  units,
  onChanged,
}) => {
  // État local : la demande reste à jour entre deux ouvertures sans recharger le profil
  const [requestedId, setRequestedId] = useState<string | null>(profile.requested_unit_id ?? null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setRequestedId(profile.requested_unit_id ?? null);
  }, [profile.id, profile.requested_unit_id]);

  useEffect(() => {
    if (isOpen) {
      setSelectedId('');
      setErrorMsg(null);
      setNotice(null);
    }
  }, [isOpen]);

  const currentIds = [profile.primary_unit_id, profile.secondary_unit_id].filter(Boolean) as string[];
  const currentUnits = currentIds
    .map((id) => units.find((u) => u.id === id))
    .filter((u): u is Unit => Boolean(u));
  const choices = units.filter((u) => u.is_active && !currentIds.includes(u.id));
  const requestedUnit = requestedId ? units.find((u) => u.id === requestedId) : undefined;

  const save = async (value: string | null) => {
    setIsSaving(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const { error } = await supabase.from('profiles').update({ requested_unit_id: value }).eq('id', profile.id);
      if (error) throw new Error(error.message);
      setRequestedId(value);
      setNotice(value ? 'Demande envoyée. Un admin du groupe va la traiter.' : 'Demande annulée.');
      onChanged?.(value);
    } catch (err: any) {
      setErrorMsg(err?.message || "La demande n'a pas pu être enregistrée. Réessaie dans un instant.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="text-[24px]">Changer d'unité</span>}
      description="Un admin du groupe valide chaque changement d'unité."
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-muted">
            {currentUnits.length > 1 ? 'Unités actuelles' : 'Unité actuelle'}
          </span>
          <div className="flex flex-wrap gap-2">
            {currentUnits.length > 0 ? (
              currentUnits.map((u) => (
                <Badge key={u.id} variant="green" className="text-[13px]">
                  {u.name}
                </Badge>
              ))
            ) : (
              <Badge variant="dashed" className="text-[13px]">
                Aucune
              </Badge>
            )}
          </div>
        </div>

        {notice && <Banner tone="notice">{notice}</Banner>}
        {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

        {requestedId ? (
          <>
            <div className="flex items-center gap-3 rounded-[18px] border-2.5 border-on-color bg-yellow px-4 py-3.5 text-on-color">
              <Clock className="h-6 w-6 shrink-0" strokeWidth={2.4} aria-hidden="true" />
              <span className="min-w-0 text-[16px] font-extrabold leading-snug break-words">
                Demande en attente : {requestedUnit?.name || 'unité inconnue'}
              </span>
            </div>
            <Button
              variant="destructive"
              className="min-h-[52px] w-full"
              isLoading={isSaving}
              onClick={() => save(null)}
            >
              Annuler la demande
            </Button>
          </>
        ) : choices.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-divider px-4 py-5 text-center text-[14px] font-semibold text-muted">
            Aucune autre unité active pour le moment.
          </p>
        ) : (
          <>
            <div role="group" aria-labelledby="unit-change-question" className="flex flex-col gap-2.5">
              <span id="unit-change-question" className="text-[14px] font-bold">
                Nouvelle unité
              </span>
              {choices.map((u) => {
                const on = selectedId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelectedId(u.id)}
                    className={cn(
                      'flex min-h-[52px] items-center justify-between gap-3 rounded-xl border-2.5 border-line px-4 py-2 text-left text-[16px] font-extrabold',
                      on ? 'bg-green text-on-color shadow-pop' : 'bg-surface text-ink hover:bg-surface2'
                    )}
                  >
                    <span className="min-w-0 break-words">{u.name}</span>
                    {on && (
                      <span
                        aria-hidden="true"
                        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 border-on-color bg-white text-on-color"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2.5">
              <Button variant="neutral" className="px-2 text-[15px]" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="primary"
                className="whitespace-normal px-2 text-[15px] leading-tight"
                disabled={!selectedId}
                isLoading={isSaving}
                onClick={() => save(selectedId)}
              >
                Envoyer la demande
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};
