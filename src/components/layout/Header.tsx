import React, { useState } from 'react';
import { ArrowLeftRight, LogOut } from 'lucide-react';
import { Profile, Unit } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UnitChangeRequestModal } from '@/components/chef/UnitChangeRequestModal';

interface HeaderProps {
  profile: Profile | null;
  units: Unit[];
  activeUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
  onLogout: () => void;
  isOnline: boolean;
}

/** « Claire D. » */
function displayName(p: Profile): string {
  const last = (p.last_name || '').trim();
  return `${(p.first_name || '').trim()} ${last ? last.charAt(0).toUpperCase() + '.' : ''}`.trim();
}

const iconBtn =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-line bg-transparent text-ink hover:bg-surface2';

/** En-tête des écrans connectés (maquette, écran « entete ») */
export const Header: React.FC<HeaderProps> = ({
  profile,
  units,
  activeUnitId,
  onSelectUnit,
  onLogout,
  isOnline,
}) => {
  const [isUnitRequestOpen, setIsUnitRequestOpen] = useState(false);

  const isChef = profile?.role === 'chef';
  const primaryUnit = units.find((u) => u.id === profile?.primary_unit_id);
  const secondaryUnit = units.find((u) => u.id === profile?.secondary_unit_id);
  const hasMultipleUnits = Boolean(primaryUnit && secondaryUnit);
  const activeUnit = units.find((u) => u.id === activeUnitId) || primaryUnit;

  return (
    <header className="w-full shrink-0 border-b-2.5 border-line bg-surface text-ink">
      <div
        className={cn(
          'mx-auto flex w-full flex-col gap-2.5 px-[18px] pb-3 pt-3.5',
          isChef ? 'max-w-chef' : 'max-w-admin'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2.5 border-on-color bg-green"
            >
              <img src="/icons/icon-192.png?v=2" alt="" width={40} height={40} className="h-full w-full object-cover" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[16px] font-extrabold leading-[1.1]">Compta Saint-Martin</span>
              <span className="truncate text-[12px] font-semibold text-muted">Groupe Saint-Martin</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isOnline && <Badge variant="red">Hors ligne</Badge>}
            {profile && (
              <button type="button" aria-label="Se déconnecter" onClick={onLogout} className={iconBtn}>
                <LogOut className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {profile && (
          <div className={cn('flex items-end gap-2.5', !isChef && 'justify-end')}>
            {isChef && (
              <>
                {hasMultipleUnits ? (
                  <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-muted">Unité active</span>
                    <select
                      value={activeUnitId || primaryUnit?.id || ''}
                      onChange={(e) => onSelectUnit(e.target.value)}
                      className="h-11 w-full min-w-0 rounded-lg border-2 border-line bg-field px-2 text-[15px] font-bold text-ink"
                    >
                      {primaryUnit && <option value={primaryUnit.id}>{primaryUnit.name}</option>}
                      {secondaryUnit && <option value={secondaryUnit.id}>{secondaryUnit.name}</option>}
                    </select>
                  </label>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-muted">Unité active</span>
                    <span className="truncate text-[15px] font-bold leading-[44px]">
                      {activeUnit?.name || 'Aucune unité'}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Demander un changement d'unité"
                  title="Demander un changement d'unité"
                  onClick={() => setIsUnitRequestOpen(true)}
                  className={cn(iconBtn, 'relative')}
                >
                  <ArrowLeftRight className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                  {profile.requested_unit_id && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-on-color bg-yellow"
                    />
                  )}
                </button>
              </>
            )}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="max-w-[9rem] truncate text-[14px] font-bold">{displayName(profile)}</span>
              <Badge variant={profile.role === 'admin' ? 'green' : 'blue'}>
                {profile.role === 'admin' ? 'Admin' : 'Chef'}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {profile && isChef && (
        <UnitChangeRequestModal
          isOpen={isUnitRequestOpen}
          onClose={() => setIsUnitRequestOpen(false)}
          profile={profile}
          units={units}
        />
      )}
    </header>
  );
};

interface FooterProps {
  /** Ouvre les CGU et mentions légales */
  onOpenLegal: () => void;
  /** Largeur de la colonne : 'chef' (640 px) ou 'admin' (1200 px) */
  width?: 'chef' | 'admin';
  /** Liens en plus (ex. sandbox de test côté admin) */
  children?: React.ReactNode;
}

/** Pied de page des écrans connectés : « Dépenses et justificatifs conservés 10 ans · CGU » */
export const Footer: React.FC<FooterProps> = ({ onOpenLegal, width = 'chef', children }) => (
  <footer className="w-full shrink-0 border-t-2 border-divider">
    <div
      className={cn(
        'mx-auto flex w-full flex-wrap items-center justify-center gap-x-1.5 px-[18px] text-[12px] font-semibold text-muted',
        width === 'chef' ? 'max-w-chef' : 'max-w-admin'
      )}
    >
      <span>Dépenses et justificatifs conservés 10 ans ·</span>
      <button
        type="button"
        onClick={onOpenLegal}
        className="min-h-[44px] p-0 text-[12px] font-extrabold text-link underline decoration-2 underline-offset-2"
      >
        CGU
      </button>
      {children}
    </div>
  </footer>
);
