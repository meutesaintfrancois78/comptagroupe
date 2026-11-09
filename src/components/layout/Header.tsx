import React from 'react';
import { LogOut, ShieldCheck, User as UserIcon, RefreshCw } from 'lucide-react';
import { Profile, Unit } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  profile: Profile | null;
  units: Unit[];
  activeUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
  onLogout: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  units,
  activeUnitId,
  onSelectUnit,
  onLogout,
  isOnline,
}) => {
  // Détecter si le chef a 2 unités
  const hasMultipleUnits = Boolean(profile?.primary_unit_id && profile?.secondary_unit_id);
  const primaryUnit = units.find((u) => u.id === profile?.primary_unit_id);
  const secondaryUnit = units.find((u) => u.id === profile?.secondary_unit_id);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo & Titre */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-scout-dark text-white font-bold text-lg shadow-sm">
            ⚜️
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg">
              Compta Saint-Martin
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Groupe Saint-Martin
            </p>
          </div>
        </div>

        {/* Sélecteur d'unité (si le chef a 2 unités) */}
        {hasMultipleUnits && profile?.role === 'chef' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-muted-foreground hidden md:inline">
              Unité active :
            </span>
            <select
              value={activeUnitId || ''}
              onChange={(e) => onSelectUnit(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
              aria-label="Sélectionner l'unité scoute active"
            >
              {primaryUnit && (
                <option value={primaryUnit.id}>{primaryUnit.name}</option>
              )}
              {secondaryUnit && (
                <option value={secondaryUnit.id}>{secondaryUnit.name}</option>
              )}
            </select>
          </div>
        )}

        {/* Profil & Actions */}
        <div className="flex items-center space-x-3">
          {!isOnline && (
            <Badge variant="destructive" className="animate-pulse text-[11px] px-2 py-0.5">
              Hors-ligne
            </Badge>
          )}

          {profile && (
            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-foreground">
                  {profile.first_name} {profile.last_name}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-end space-x-1">
                  {profile.role === 'admin' ? (
                    <Badge variant="success" className="text-[10px] px-1.5 py-0">
                      <ShieldCheck className="w-3 h-3 mr-1 inline" /> Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <UserIcon className="w-3 h-3 mr-1 inline" /> Chef
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                title="Déconnexion"
                aria-label="Déconnexion"
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
