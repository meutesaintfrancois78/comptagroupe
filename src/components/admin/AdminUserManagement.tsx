import React, { useState } from 'react';
import {
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  UserMinus,
  UserPlus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Profile, Unit, UserRole, AccountStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface AdminUserManagementProps {
  profiles: Profile[];
  units: Unit[];
  currentAdminId: string;
  onRefresh: () => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  profiles,
  units,
  currentAdminId,
  onRefresh,
}) => {
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeAdminsCount = profiles.filter(
    (p) => p.role === 'admin' && p.status === 'active'
  ).length;

  const handleUpdateStatus = async (profileId: string, status: AccountStatus) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const target = profiles.find((p) => p.id === profileId);
    if (target?.role === 'admin' && status !== 'active' && activeAdminsCount <= 1) {
      setErrorMsg('Action impossible : le système doit conserver au moins un administrateur actif.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', profileId);

    if (error) {
      setErrorMsg(error.message || 'Erreur lors de la modification du statut.');
    } else {
      setSuccessMsg('Statut mis à jour avec succès.');
      onRefresh();
    }
  };

  const handleToggleAdminRole = async (profile: Profile) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const newRole: UserRole = profile.role === 'admin' ? 'chef' : 'admin';

    // Garde-fou dernier admin
    if (profile.role === 'admin' && activeAdminsCount <= 1) {
      setErrorMsg('Action impossible : le système doit conserver au moins un administrateur actif.');
      return;
    }

    if (
      newRole === 'admin' &&
      !window.confirm(`Confirmer la promotion de ${profile.first_name} ${profile.last_name} en tant qu'administrateur ?`)
    ) {
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profile.id);

    if (error) {
      setErrorMsg(error.message || 'Erreur lors du changement de rôle.');
    } else {
      setSuccessMsg(
        newRole === 'admin'
          ? `${profile.first_name} a été promu administrateur.`
          : `${profile.first_name} est désormais chef d'unité.`
      );
      onRefresh();
    }
  };

  const handleUpdateUnits = async (
    profileId: string,
    primaryUnitId: string,
    secondaryUnitId: string | null
  ) => {
    setErrorMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        primary_unit_id: primaryUnitId,
        secondary_unit_id: secondaryUnitId || null,
      })
      .eq('id', profileId);

    if (error) {
      setErrorMsg(error.message || "Erreur lors de l'affectation d'unité.");
    } else {
      setSuccessMsg('Unités mises à jour.');
      setSelectedUser(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-destructive/15 text-destructive rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      <div className="bg-card rounded-3xl border p-5 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">
            Gestion des Comptes & Rôles
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Validation, affectation d'unités (1ère ou 2ème unité) et promotion d'admins
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-bold px-3 py-1">
          {activeAdminsCount} admin{activeAdminsCount > 1 ? 's' : ''} actif{activeAdminsCount > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm divide-y">
        {profiles.map((p) => {
          const primaryUnitName =
            units.find((u) => u.id === p.primary_unit_id)?.name || 'Non rattaché';
          const secondaryUnitName = p.secondary_unit_id
            ? units.find((u) => u.id === p.secondary_unit_id)?.name
            : null;
          const isAdmin = p.role === 'admin';
          const isMe = p.id === currentAdminId;

          return (
            <div
              key={p.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base text-foreground">
                    {p.first_name} {p.last_name}
                  </span>
                  {isAdmin ? (
                    <Badge variant="success" className="text-[10px]">
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Chef
                    </Badge>
                  )}
                  {p.status === 'pending' && (
                    <Badge variant="warning" className="text-[10px]">
                      En attente
                    </Badge>
                  )}
                  {p.status === 'deactivated' && (
                    <Badge variant="destructive" className="text-[10px]">
                      Désactivé
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mt-1 space-x-2">
                  <span>
                    Unité principale : <strong className="text-foreground">{primaryUnitName}</strong>
                  </span>
                  {secondaryUnitName && (
                    <span>
                      • 2e unité : <strong className="text-foreground">{secondaryUnitName}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Actions d'administration */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Modifier les unités */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedUser(p)}
                  className="text-xs"
                >
                  Unités
                </Button>

                {/* Validation / Refus si en attente */}
                {p.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleUpdateStatus(p.id, 'active')}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleUpdateStatus(p.id, 'rejected')}
                      className="text-xs"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      Refuser
                    </Button>
                  </>
                )}

                {/* Activer / Désactiver si actif */}
                {p.status === 'active' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUpdateStatus(p.id, 'deactivated')}
                    disabled={isAdmin && activeAdminsCount <= 1}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Désactiver
                  </Button>
                )}

                {p.status === 'deactivated' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(p.id, 'active')}
                    className="text-xs text-emerald-700 border-emerald-500/30"
                  >
                    Réactiver
                  </Button>
                )}

                {/* Promouvoir / Rétrograder Admin */}
                <Button
                  size="sm"
                  variant={isAdmin ? 'outline' : 'secondary'}
                  onClick={() => handleToggleAdminRole(p)}
                  disabled={isAdmin && activeAdminsCount <= 1}
                  title={
                    isAdmin && activeAdminsCount <= 1
                      ? 'Impossible de retirer le dernier admin'
                      : undefined
                  }
                  className="text-xs"
                >
                  {isAdmin ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Retirer Admin
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5 mr-1 text-primary" />
                      Nommer Admin
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal d'ajustement des unités (1ère et 2ème unité) */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-md bg-card p-6 rounded-3xl border shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground">
              Affectation d'unité : {selectedUser.first_name} {selectedUser.last_name}
            </h3>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Unité principale (obligatoire)
              </label>
              <select
                id="edit-primary-unit"
                defaultValue={selectedUser.primary_unit_id || units[0]?.id}
                className="h-10 w-full text-xs font-medium rounded-lg border border-input bg-background px-3 py-1"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Deuxième unité (facultative - chef rattaché à 2 unités)
              </label>
              <select
                id="edit-secondary-unit"
                defaultValue={selectedUser.secondary_unit_id || ''}
                className="h-10 w-full text-xs font-medium rounded-lg border border-input bg-background px-3 py-1"
              >
                <option value="">Aucune 2e unité</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Si une 2e unité est ajoutée, un sélecteur d'unité apparaîtra sur l'accueil du chef.
              </p>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedUser(null)}>
                Annuler
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  const pri = (document.getElementById('edit-primary-unit') as HTMLSelectElement).value;
                  const sec = (document.getElementById('edit-secondary-unit') as HTMLSelectElement).value;
                  handleUpdateUnits(selectedUser.id, pri, sec || null);
                }}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
