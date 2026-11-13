import React, { useEffect, useState } from 'react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { Banner } from '@/components/ui/feedback';
import { LegalModal } from '@/components/legal/LegalModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Unit } from '@/types/database';
import { formatIban, cleanIban, getIbanValidationError } from '@/lib/iban';

/**
 * Fin d'inscription d'un compte créé par Google : le chef confirme son vrai nom
 * (le nom Google peut être un pseudo), choisit son unité et accepte les CGU.
 * Il passe ensuite sur l'écran d'attente de validation.
 */
export const CompleteProfileScreen: React.FC = () => {
  const { profile, refreshProfile, signOut } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [firstName, setFirstName] = useState(profile?.first_name === 'Chef' ? '' : profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name === 'Scout' ? '' : profile?.last_name ?? '');
  const [unitId, setUnitId] = useState('');
  const [iban, setIban] = useState(formatIban(profile?.iban ?? ''));
  const [accepted, setAccepted] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('units')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setUnits((data as Unit[]) || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Ton vrai prénom et ton vrai nom sont obligatoires.');
      return;
    }
    if (!unitId) {
      setErrorMsg('Choisis ton unité.');
      return;
    }
    const ibanError = getIbanValidationError(iban);
    if (ibanError) {
      setErrorMsg(ibanError);
      return;
    }
    if (!accepted) {
      setErrorMsg("Tu dois accepter les conditions d'utilisation pour continuer.");
      return;
    }
    setErrorMsg(null);
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        primary_unit_id: unitId,
        iban: cleanIban(iban),
      })
      .eq('id', profile.id);
    setIsSaving(false);
    if (error) {
      setErrorMsg(`Impossible d'enregistrer ton inscription : ${error.message}`);
      return;
    }
    await refreshProfile();
  };

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-bg px-[22px] py-6 text-ink">
      <main className="mx-auto flex w-full max-w-[440px] flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <MartyMascot expression="hello" size={52} alt="Marty, le bison" />
          <span className="text-[15px] font-semibold text-muted">Encore une étape et c'est parti.</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-[11px] rounded-[22px] border-2.5 border-line bg-surface p-[18px] shadow-pop-md"
        >
          <h1 className="text-[22px] font-extrabold leading-tight">Complète ton inscription</h1>
          {profile?.email && <p className="text-[14px] font-semibold text-muted break-all">Connecté avec {profile.email}</p>}
          <Banner tone="warning">Mets ton vrai prénom et ton vrai nom, pas ton totem : ils servent aux remboursements.</Banner>
          {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Prénom" htmlFor="complete-firstname">
              <Input
                id="complete-firstname"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="min-h-[46px] rounded-lg px-3"
              />
            </Field>
            <Field label="Nom" htmlFor="complete-lastname">
              <Input
                id="complete-lastname"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="min-h-[46px] rounded-lg px-3"
              />
            </Field>
          </div>

          <Field label="Ton unité" htmlFor="complete-unit">
            <Select
              id="complete-unit"
              required
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="min-h-[46px] rounded-lg"
            >
              <option value="">Choisis ton unité</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="IBAN (RIB pour tes remboursements)" htmlFor="complete-iban">
            <Input
              id="complete-iban"
              required
              placeholder="FR76 0000 0000 0000 0000 0000 000"
              value={iban}
              onChange={(e) => setIban(formatIban(e.target.value))}
              className="min-h-[46px] rounded-lg px-3 font-mono uppercase tracking-wider text-[14px]"
            />
            <span className="text-[12px] font-semibold text-muted">
              Sert au trésorier pour effectuer tes virements de remboursement.
            </span>
          </Field>

          <label htmlFor="complete-cgu" className="flex min-h-[44px] items-center gap-2.5">
            <input
              id="complete-cgu"
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="h-[22px] w-[22px] shrink-0 accent-green"
            />
            <span className="text-[14px] font-semibold">
              J'accepte les{' '}
              <button
                type="button"
                onClick={() => setIsLegalOpen(true)}
                className="font-extrabold text-link underline underline-offset-[3px]"
              >
                conditions d'utilisation
              </button>
            </span>
          </label>

          <Button type="submit" size="lg" isLoading={isSaving}>
            Envoyer ma demande
          </Button>
        </form>

        <Button variant="link" className="self-center" onClick={signOut}>
          Me déconnecter
        </Button>
      </main>

      <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
    </div>
  );
};
