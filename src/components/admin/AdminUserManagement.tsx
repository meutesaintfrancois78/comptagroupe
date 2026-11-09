import React, { useState } from 'react';
import { Profile, Unit, UserRole, AccountStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Banner } from '@/components/ui/feedback';
import { supabase } from '@/lib/supabase';
import { validateProfileUnitAssignment } from '@/lib/permissions';
import { acceptUnitChangeRequest, rejectUnitChangeRequest } from './PendingValidationBanner';

interface AdminUserManagementProps {
  profiles: Profile[];
  units: Unit[];
  currentAdminId: string;
  onRefresh: () => void;
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Actif',
  pending: 'En attente',
  deactivated: 'Désactivé',
  rejected: 'Refusé',
};

const STATUS_BADGE: Record<AccountStatus, 'green' | 'yellow' | 'red'> = {
  active: 'green',
  pending: 'yellow',
  deactivated: 'red',
  rejected: 'red',
};

const fullName = (p: Profile) => `${p.first_name} ${p.last_name}`.trim();

interface SheetForm {
  primary: string;
  secondary: string;
  role: UserRole;
  status: AccountStatus;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  profiles,
  units,
  currentAdminId,
  onRefresh,
}) => {
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [form, setForm] = useState<SheetForm | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHandlingRequest, setIsHandlingRequest] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeAdminsCount = profiles.filter((p) => p.role === 'admin' && p.status === 'active').length;
  const unitName = (id: string | null | undefined) => units.find((u) => u.id === id)?.name;

  const unitsLabel = (p: Profile) => {
    const primary = unitName(p.primary_unit_id) || (p.role === 'admin' ? 'Non rattaché (Groupe)' : 'Non rattaché');
    const secondary = p.secondary_unit_id ? unitName(p.secondary_unit_id) : null;
    return secondary ? `${primary} + ${secondary}` : primary;
  };

  const openSheet = (p: Profile) => {
    setSelectedUser(p);
    setSheetError(null);
    setForm({
      primary: p.primary_unit_id || '',
      secondary: p.secondary_unit_id || '',
      role: p.role,
      status: p.status,
    });
  };

  const closeSheet = () => {
    setSelectedUser(null);
    setForm(null);
    setSheetError(null);
  };

  const updateForm = (patch: Partial<SheetForm>) => {
    setSheetError(null);
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // Enregistrer la fiche : unités, rôle et statut, avec le garde-fou du dernier admin
  const handleSave = async () => {
    if (!selectedUser || !form) return;
    setSheetError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    const target = selectedUser;
    const name = fullName(target);

    // Garde-fou : le dernier admin actif ne peut ni perdre son rôle ni changer de statut
    const isLastActiveAdmin = target.role === 'admin' && target.status === 'active' && activeAdminsCount <= 1;
    if (isLastActiveAdmin && (form.role !== 'admin' || form.status !== 'active')) {
      setSheetError(
        `Impossible : ${name} est le dernier admin actif. Nomme un autre admin avant de changer son rôle ou son statut.`
      );
      return;
    }

    const validation = validateProfileUnitAssignment(form.role, form.primary);
    if (!validation.isValid) {
      setSheetError(validation.error || 'Unité principale obligatoire pour les chefs.');
      return;
    }
    const secondary = form.secondary || null;
    if (secondary && secondary === validation.unitId) {
      setSheetError("La 2ᵉ unité doit être différente de l'unité principale.");
      return;
    }

    if (
      form.role === 'admin' &&
      target.role !== 'admin' &&
      !window.confirm(`Confirmer la promotion de ${name} en tant qu'administrateur ?`)
    ) {
      return;
    }

    // N'envoie que ce qui change
    const payload: Partial<Pick<Profile, 'role' | 'status' | 'primary_unit_id' | 'secondary_unit_id'>> = {};
    if (form.role !== target.role) payload.role = form.role;
    if (form.status !== target.status) payload.status = form.status;
    if (validation.unitId !== (target.primary_unit_id || null)) payload.primary_unit_id = validation.unitId;
    if (secondary !== (target.secondary_unit_id || null)) payload.secondary_unit_id = secondary;

    if (Object.keys(payload).length === 0) {
      closeSheet();
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update(payload).eq('id', target.id);
      if (error) {
        setSheetError(error.message || 'Erreur lors de la mise à jour du compte.');
        return;
      }
      setSuccessMsg(`Compte de ${name} mis à jour.`);
      closeSheet();
      onRefresh();
    } finally {
      setIsSaving(false);
    }
  };

  // Demande de changement d'unité, traitée depuis la fiche
  const handleUnitRequest = async (accept: boolean) => {
    if (!selectedUser) return;
    setSheetError(null);
    setIsHandlingRequest(true);
    try {
      const { error } = accept
        ? await acceptUnitChangeRequest(selectedUser)
        : await rejectUnitChangeRequest(selectedUser);
      if (error) {
        setSheetError(error);
        return;
      }
      setSuccessMsg(
        accept
          ? `Changement d'unité de ${fullName(selectedUser)} validé.`
          : `Demande de changement d'unité de ${fullName(selectedUser)} refusée.`
      );
      closeSheet();
      onRefresh();
    } finally {
      setIsHandlingRequest(false);
    }
  };

  const statusOptions: AccountStatus[] =
    selectedUser?.status === 'rejected'
      ? ['active', 'pending', 'deactivated', 'rejected']
      : ['active', 'pending', 'deactivated'];

  return (
    <div className="flex flex-col gap-2.5">
      {errorMsg && <Banner tone="error">{errorMsg}</Banner>}
      {successMsg && <Banner tone="notice">{successMsg}</Banner>}

      {/* Comptes : une colonne, deux dès 1024 px */}
      <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {profiles.map((p) => {
          const name = fullName(p);
          const isMe = p.id === currentAdminId;
          const requested = p.requested_unit_id ? unitName(p.requested_unit_id) || 'unité inconnue' : null;
          return (
            <li
              key={p.id}
              className="flex min-w-0 items-center gap-3 rounded-[18px] border-2.5 border-line bg-surface px-3.5 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex min-w-0 flex-col">
                  <span className="break-words text-[16px] font-extrabold leading-tight">
                    {name}
                    {isMe && <span className="text-[13px] font-semibold text-muted"> (toi)</span>}
                  </span>
                  <span className="break-all text-[13px] font-semibold text-muted">
                    {p.email || 'Email non renseigné'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={p.role === 'admin' ? 'green' : 'blue'}>{p.role === 'admin' ? 'Admin' : 'Chef'}</Badge>
                  <Badge variant={STATUS_BADGE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  <Badge variant="dashed" className="whitespace-normal font-bold">
                    {unitsLabel(p)}
                  </Badge>
                  {requested && (
                    <Badge variant="yellow" className="whitespace-normal">
                      Demande : {requested}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="neutral"
                size="sm"
                onClick={() => openSheet(p)}
                aria-label={`Modifier le compte de ${name}`}
                className="min-h-[44px] shrink-0 rounded-lg border-2 px-3 text-[14px]"
              >
                Modifier
              </Button>
            </li>
          );
        })}
      </ul>

      {/* Fiche du compte */}
      <Dialog
        isOpen={Boolean(selectedUser && form)}
        onClose={closeSheet}
        title={selectedUser ? fullName(selectedUser) : undefined}
        description={
          selectedUser ? (
            <>
              <span className="block break-all">{selectedUser.email || 'Email non renseigné'}</span>
              <span className="block">Fiche du compte</span>
            </>
          ) : undefined
        }
      >
        {selectedUser && form && (
          <div className="flex flex-col gap-3">
            {selectedUser.requested_unit_id && (
              <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-on-color bg-yellow p-3 text-on-color">
                <p className="text-[14px] font-bold leading-snug">
                  Demande de changement d'unité : {unitName(selectedUser.primary_unit_id) || 'Non rattaché'} →{' '}
                  {unitName(selectedUser.requested_unit_id) || 'unité inconnue'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleUnitRequest(true)}
                    isLoading={isHandlingRequest}
                    className="min-h-[44px] rounded-lg px-3 text-[15px] shadow-none"
                  >
                    Valider
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleUnitRequest(false)}
                    disabled={isHandlingRequest}
                    className="min-h-[44px] rounded-lg px-3 text-[15px]"
                  >
                    Refuser
                  </Button>
                </div>
              </div>
            )}

            <Field label="Unité principale" htmlFor="fiche-primary-unit">
              <Select
                id="fiche-primary-unit"
                value={form.primary}
                onChange={(e) => updateForm({ primary: e.target.value })}
              >
                <option value="">Non rattaché (Groupe)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="2ᵉ unité" htmlFor="fiche-secondary-unit">
              <Select
                id="fiche-secondary-unit"
                value={form.secondary}
                onChange={(e) => updateForm({ secondary: e.target.value })}
              >
                <option value="">Aucune</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Rôle" htmlFor="fiche-role">
                <Select
                  id="fiche-role"
                  value={form.role}
                  onChange={(e) => updateForm({ role: e.target.value as UserRole })}
                >
                  <option value="admin">Admin</option>
                  <option value="chef">Chef</option>
                </Select>
              </Field>
              <Field label="Statut" htmlFor="fiche-status">
                <Select
                  id="fiche-status"
                  value={form.status}
                  onChange={(e) => updateForm({ status: e.target.value as AccountStatus })}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {sheetError && <Banner tone="error">{sheetError}</Banner>}

            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              Enregistrer
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
};
