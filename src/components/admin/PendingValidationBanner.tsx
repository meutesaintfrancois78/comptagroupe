import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, AlertTriangle, Clock } from 'lucide-react';
import { Profile, Unit } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  shouldShowAdminBanner,
  calculateDismissUntil,
  getRemainingSeconds,
  BANNER_STORAGE_KEY,
} from '@/lib/bannerTimer';

interface PendingValidationBannerProps {
  pendingProfiles: Profile[];
  units: Unit[];
  onValidate: (profileId: string, unitId: string) => Promise<void>;
  onReject: (profileId: string) => Promise<void>;
}

export const PendingValidationBanner: React.FC<PendingValidationBannerProps> = ({
  pendingProfiles,
  units,
  onValidate,
  onReject,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [, setTick] = useState<number>(0);

  // Initialisation des unités par défaut pour chaque profil
  useEffect(() => {
    const map: Record<string, string> = {};
    pendingProfiles.forEach((p) => {
      map[p.id] = p.primary_unit_id || units[0]?.id || '';
    });
    setSelectedUnits(map);
  }, [pendingProfiles, units]);

  // Vérification périodique du timer de 3 minutes
  useEffect(() => {
    const checkState = () => {
      if (pendingProfiles.length === 0) {
        setIsOpen(false);
        return;
      }
      const rawStored = localStorage.getItem(BANNER_STORAGE_KEY);
      const dismissUntil = rawStored ? parseInt(rawStored, 10) : null;
      const show = shouldShowAdminBanner(pendingProfiles.length, dismissUntil);
      setIsOpen(show);
      setTick((t) => t + 1);
    };

    checkState();
    const interval = setInterval(checkState, 1000); // Check every second
    return () => clearInterval(interval);
  }, [pendingProfiles.length]);

  const handleDismiss = () => {
    const until = calculateDismissUntil();
    localStorage.setItem(BANNER_STORAGE_KEY, until.toString());
    setIsOpen(false);
  };

  const handleValidateClick = async (profileId: string) => {
    setIsProcessing((prev) => ({ ...prev, [profileId]: true }));
    try {
      const unitId = selectedUnits[profileId] || units[0]?.id;
      await onValidate(profileId, unitId);
    } finally {
      setIsProcessing((prev) => ({ ...prev, [profileId]: false }));
    }
  };

  const handleRejectClick = async (profileId: string) => {
    if (!window.confirm('Confirmer le refus de cette demande de compte ?')) return;
    setIsProcessing((prev) => ({ ...prev, [profileId]: true }));
    try {
      await onReject(profileId);
    } finally {
      setIsProcessing((prev) => ({ ...prev, [profileId]: false }));
    }
  };

  // Compteur en secondes si fermé
  const rawStored = typeof localStorage !== 'undefined' ? localStorage.getItem(BANNER_STORAGE_KEY) : null;
  const dismissUntil = rawStored ? parseInt(rawStored, 10) : null;
  const remainingSeconds = getRemainingSeconds(dismissUntil);

  if (pendingProfiles.length === 0) {
    return null;
  }

  // Si fermé temporairement par "Plus tard", on affiche un discret rappel en bandeau avec le chrono
  if (!isOpen) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-600 animate-spin" />
          <span>
            <strong>{pendingProfiles.length} compte(s) chef(s) en attente</strong> — Rappel plein écran dans {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s
          </span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="underline font-bold hover:text-amber-950 dark:hover:text-amber-100"
        >
          Ouvrir maintenant
        </button>
      </div>
    );
  }

  // Grand écran plein imposé à l'administrateur (Section 5 du cahier des charges)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-card border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start space-x-4 mb-6">
          <div className="p-3 bg-amber-500/15 text-amber-600 rounded-2xl flex-shrink-0">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                Comptes chefs en attente de validation
              </h2>
              <Badge variant="warning">{pendingProfiles.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Tant que des chefs attendent, cet écran s'impose automatiquement pour ne pas bloquer les unités scoutes.
            </p>
          </div>
        </div>

        {/* Liste des comptes en attente */}
        <div className="space-y-4 my-6">
          {pendingProfiles.map((p) => {
            const unitName = units.find((u) => u.id === p.primary_unit_id)?.name || 'Non définie';
            return (
              <div
                key={p.id}
                className="bg-background rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="text-base font-bold text-foreground">
                    {p.first_name} {p.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Demande pour l'unité : <strong className="text-foreground">{unitName}</strong>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Inscrit le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={selectedUnits[p.id] || p.primary_unit_id || ''}
                    onChange={(e) =>
                      setSelectedUnits((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    className="h-10 text-xs rounded-lg border border-input bg-card px-2.5 py-1 font-medium"
                    aria-label="Ajuster l'unité"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleValidateClick(p.id)}
                      isLoading={isProcessing[p.id]}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white flex-1 sm:flex-none"
                    >
                      <UserCheck className="w-4 h-4 mr-1.5" />
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectClick(p.id)}
                      isLoading={isProcessing[p.id]}
                      className="flex-1 sm:flex-none"
                    >
                      <UserX className="w-4 h-4 mr-1.5" />
                      Refuser
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer avec bouton Plus tard et avertissement 3 min */}
        <div className="mt-8 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-xs text-muted-foreground">
            Bouton "Plus tard" : cet écran réapparaîtra automatiquement dans <strong>3 minutes</strong>.
          </p>
          <Button
            variant="outline"
            size="default"
            onClick={handleDismiss}
            className="w-full sm:w-auto"
          >
            Plus tard (3 min)
          </Button>
        </div>
      </div>
    </div>
  );
};
