import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Profile, Unit } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Banner, IconTile } from '@/components/ui/feedback';
import { supabase } from '@/lib/supabase';
import {
  shouldShowAdminBanner,
  calculateDismissUntil,
  getRemainingSeconds,
  BANNER_STORAGE_KEY,
} from '@/lib/bannerTimer';

/* ---------- Demandes de changement d'unité (partagé avec l'onglet Comptes) ---------- */

/** Profils qui ont une demande de changement d'unité à traiter */
export function getUnitChangeRequests(profiles: Profile[]): Profile[] {
  return profiles.filter((p) => Boolean(p.requested_unit_id) && p.status !== 'pending');
}

/** Valider : l'unité demandée devient l'unité principale, la demande est effacée */
export async function acceptUnitChangeRequest(profile: Profile): Promise<{ error: string | null }> {
  if (!profile.requested_unit_id) return { error: null };
  const { error } = await supabase
    .from('profiles')
    .update({ primary_unit_id: profile.requested_unit_id, requested_unit_id: null })
    .eq('id', profile.id);
  return { error: error ? error.message || "Erreur lors du changement d'unité." : null };
}

/** Refuser : la demande est effacée, l'unité ne change pas */
export async function rejectUnitChangeRequest(profile: Profile): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ requested_unit_id: null }).eq('id', profile.id);
  return { error: error ? error.message || 'Erreur lors du refus de la demande.' : null };
}

/* ---------- Fenêtre « Comptes chefs en attente » ---------- */

interface PendingValidationBannerProps {
  pendingProfiles: Profile[];
  units: Unit[];
  onValidate: (profileId: string, unitId: string) => Promise<void>;
  onReject: (profileId: string) => Promise<void>;
  /**
   * Tous les profils : la fenêtre en tire les demandes de changement d'unité
   * (requested_unit_id). Sans ce prop, seule la section des comptes en attente s'affiche.
   */
  profiles?: Profile[];
  /** Appelé après la validation ou le refus d'une demande de changement d'unité */
  onRefresh?: () => void;
}

const formatSignupDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fullName = (p: Profile) => `${p.first_name} ${p.last_name}`.trim();

const choiceButtonClass = 'min-h-[44px] rounded-lg px-3 text-[15px]';

export const PendingValidationBanner: React.FC<PendingValidationBannerProps> = ({
  pendingProfiles,
  units,
  onValidate,
  onReject,
  profiles,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, setTick] = useState<number>(0);

  const unitRequests = profiles ? getUnitChangeRequests(profiles) : [];
  const totalCount = pendingProfiles.length + unitRequests.length;
  const unitName = (id: string | null | undefined) => units.find((u) => u.id === id)?.name;

  // Unité proposée par défaut pour chaque compte en attente
  useEffect(() => {
    const map: Record<string, string> = {};
    pendingProfiles.forEach((p) => {
      map[p.id] = p.primary_unit_id || units[0]?.id || '';
    });
    setSelectedUnits(map);
  }, [pendingProfiles, units]);

  // Vérification périodique du rappel de 3 minutes
  useEffect(() => {
    const checkState = () => {
      if (totalCount === 0) {
        setIsOpen(false);
        return;
      }
      const rawStored = localStorage.getItem(BANNER_STORAGE_KEY);
      const dismissUntil = rawStored ? parseInt(rawStored, 10) : null;
      setIsOpen(shouldShowAdminBanner(totalCount, dismissUntil));
      setTick((t) => t + 1);
    };

    checkState();
    const interval = setInterval(checkState, 1000);
    return () => clearInterval(interval);
  }, [totalCount]);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_STORAGE_KEY, calculateDismissUntil().toString());
    setIsOpen(false);
  };

  const withProcessing = async (key: string, action: () => Promise<void>) => {
    setErrorMsg(null);
    setIsProcessing((prev) => ({ ...prev, [key]: true }));
    try {
      await action();
    } finally {
      setIsProcessing((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleValidateClick = (profileId: string) =>
    withProcessing(profileId, () => onValidate(profileId, selectedUnits[profileId] || units[0]?.id));

  const handleRejectClick = (profileId: string) => {
    if (!window.confirm('Confirmer le refus de cette demande de compte ?')) return;
    return withProcessing(profileId, () => onReject(profileId));
  };

  const handleUnitRequest = (profile: Profile, accept: boolean) =>
    withProcessing(`req-${profile.id}`, async () => {
      const { error } = accept
        ? await acceptUnitChangeRequest(profile)
        : await rejectUnitChangeRequest(profile);
      if (error) {
        setErrorMsg(error);
        return;
      }
      onRefresh?.();
    });

  if (totalCount === 0) return null;

  // Rappel discret pendant les 3 minutes de « Plus tard »
  if (!isOpen) {
    const rawStored = typeof localStorage !== 'undefined' ? localStorage.getItem(BANNER_STORAGE_KEY) : null;
    const remainingSeconds = getRemainingSeconds(rawStored ? parseInt(rawStored, 10) : null);
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b-2 border-on-color bg-yellow px-4 py-1 text-[13px] font-semibold text-on-color">
        <span className="flex min-w-0 items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-extrabold">
              {totalCount} demande{totalCount > 1 ? 's' : ''} en attente
            </strong>{' '}
            · rappel dans {Math.floor(remainingSeconds / 60)} min {remainingSeconds % 60} s
          </span>
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="min-h-[44px] font-extrabold underline underline-offset-2"
        >
          Ouvrir maintenant
        </button>
      </div>
    );
  }

  // Fenêtre imposée : ni Échap, ni clic sur le voile ; seulement « Plus tard (3 min) »
  return (
    <Dialog
      isOpen
      preventClose
      variant="sheet"
      role="alertdialog"
      title={
        <span className="flex items-center gap-3">
          <IconTile color="yellow" size={48} className="rounded-full">
            <AlertTriangle className="h-6 w-6" strokeWidth={2.4} />
          </IconTile>
          <span className="min-w-0 flex-1 text-[21px] leading-tight">Comptes chefs en attente</span>
          <span className="flex h-[34px] min-w-[34px] shrink-0 items-center justify-center rounded-full border-2.5 border-on-color bg-green px-2 text-[16px] font-extrabold text-on-color">
            <span className="sr-only">, </span>
            {totalCount}
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[14px] font-medium leading-snug text-muted">
          Ces chefs ne peuvent rien déclarer tant que leur compte n'est pas validé. Vérifie l'unité avant de
          valider.
        </p>

        {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

        {pendingProfiles.length === 0 ? (
          <p className="rounded-[14px] bg-surface2 p-3.5 text-center text-[15px] font-bold">
            Tous les comptes sont traités.
          </p>
        ) : (
          pendingProfiles.map((p) => (
            <div key={p.id} className="flex flex-col gap-2.5 rounded-[18px] border-2.5 border-line p-3">
              <div className="flex flex-col gap-0.5">
                <span className="break-words text-[17px] font-extrabold">{fullName(p)}</span>
                {p.email && <span className="break-all text-[13px] font-semibold text-muted">{p.email}</span>}
                <span className="text-[13px] font-semibold text-muted">
                  Unité demandée : {unitName(p.primary_unit_id) || 'non précisée'}
                  {formatSignupDate(p.created_at) && ` · inscription le ${formatSignupDate(p.created_at)}`}
                </span>
              </div>
              <Select
                aria-label={`Unité à attribuer à ${fullName(p)}`}
                value={selectedUnits[p.id] || p.primary_unit_id || ''}
                onChange={(e) => setSelectedUnits((prev) => ({ ...prev, [p.id]: e.target.value }))}
                className="min-h-[44px] rounded-lg px-2.5 font-bold"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  onClick={() => handleValidateClick(p.id)}
                  isLoading={isProcessing[p.id]}
                  className={`${choiceButtonClass} shadow-none`}
                >
                  Valider
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRejectClick(p.id)}
                  disabled={isProcessing[p.id]}
                  className={choiceButtonClass}
                >
                  Refuser
                </Button>
              </div>
            </div>
          ))
        )}

        {unitRequests.length > 0 && (
          <section aria-labelledby="unit-requests-title" className="flex flex-col gap-2.5 pt-1">
            <h3 id="unit-requests-title" className="text-[17px] font-extrabold">
              Demandes de changement d'unité
            </h3>
            {unitRequests.map((p) => {
              const key = `req-${p.id}`;
              return (
                <div key={p.id} className="flex flex-col gap-2.5 rounded-[18px] border-2.5 border-line p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="break-words text-[17px] font-extrabold">{fullName(p)}</span>
                    <span className="text-[13px] font-semibold text-muted">
                      {unitName(p.primary_unit_id) || 'Non rattaché'} → {unitName(p.requested_unit_id) || 'unité inconnue'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      onClick={() => handleUnitRequest(p, true)}
                      isLoading={isProcessing[key]}
                      aria-label={`Valider le changement d'unité de ${fullName(p)}`}
                      className={`${choiceButtonClass} shadow-none`}
                    >
                      Valider
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleUnitRequest(p, false)}
                      disabled={isProcessing[key]}
                      aria-label={`Refuser le changement d'unité de ${fullName(p)}`}
                      className={choiceButtonClass}
                    >
                      Refuser
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <Clock className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
          Cette fenêtre revient toutes les 3 minutes tant qu'il reste des comptes ou des demandes en attente.
        </p>
        <Button variant="neutral" onClick={handleDismiss}>
          Plus tard (3 min)
        </Button>
      </div>
    </Dialog>
  );
};
