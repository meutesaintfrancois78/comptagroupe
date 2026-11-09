import React, { useState, useEffect } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';
import { Input, Select, Field, PasswordInput } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Banner } from '@/components/ui/feedback';
import { LegalModal } from '@/components/legal/LegalModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Unit } from '@/types/database';

type Mode = 'login' | 'register' | 'forgot';

// Champs de la maquette : 50 px / rayon 14 sur connexion et mot de passe oublié, 46 px / rayon 12 sur l'inscription
const bigField = 'min-h-[50px] rounded-[14px] px-3.5';
const smallField = 'min-h-[46px] rounded-lg px-3';

/** Retour à la connexion : chevron + texte 15 px, cible 44 px */
const BackButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-[44px] items-center gap-1.5 text-[15px] font-bold text-ink ${className ?? ''}`}
  >
    <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
    Retour à la connexion
  </button>
);

/** Label 13 px au-dessus d'un champ de l'inscription */
const SmallField: React.FC<{ label: string; htmlFor: string; children: React.ReactNode }> = ({
  label,
  htmlFor,
  children,
}) => (
  <div className="flex min-w-0 flex-col gap-1">
    <label htmlFor={htmlFor} className="text-[13px] font-bold">
      {label}
    </label>
    {children}
  </div>
);

export const Login: React.FC = () => {
  const { signIn, signUp, resetPassword, isMock, switchMockUser } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [primaryUnitId, setPrimaryUnitId] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    // Unités actives, pour le choix « Ton unité » de l'inscription
    supabase
      .from('units')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) setUnits(data as Unit[]);
      });
  }, []);

  const goTo = (next: Mode) => {
    setMode(next);
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetSent(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        const msg = error.message || '';
        if (msg.includes('Email not confirmed')) {
          setErrorMsg("Adresse email non confirmée. Désactive 'Confirm email' dans Supabase (Auth > Providers > Email) ou confirme ton email.");
        } else if (msg.includes('rate limit')) {
          setErrorMsg("Limite d'envoi d'emails atteinte sur Supabase. Désactive 'Confirm email' dans les réglages Supabase pour contourner.");
        } else if (msg.includes('Invalid login credentials')) {
          setErrorMsg('Email ou mot de passe incorrect.');
        } else {
          setErrorMsg(msg || 'Erreur lors de la connexion.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedLegal) {
      setErrorMsg("Tu dois accepter les conditions d'utilisation pour continuer.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Prénom et nom réels sont obligatoires.');
      return;
    }
    if (!primaryUnitId) {
      setErrorMsg('Choisis ton unité.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signUp({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        primaryUnitId,
      });
      if (error) {
        setErrorMsg(error.message || "Erreur lors de l'inscription.");
      } else {
        setSuccessMsg('Compte créé ! Un admin du groupe va valider ta demande.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setErrorMsg('Erreur lors de la demande de réinitialisation.');
      } else {
        setResetSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const errorBanner = errorMsg && <Banner tone="error">{errorMsg}</Banner>;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {mode === 'login' && (
        <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-[18px] px-6 pb-6 pt-10 md:justify-center">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <MartyMascot
              expression="hello"
              size={80}
              shadow={4}
              badge={
                <span aria-hidden="true" className="block translate-x-0.5 text-2xl leading-none">
                  👋
                </span>
              }
            />
            <h1 className="mt-1 text-[30px] font-extrabold leading-[1.05]">Bienvenue !</h1>
            <p className="max-w-[300px] text-[15px] font-medium text-muted">
              Déclare les dépenses de ton unité au Groupe Saint-Martin en deux minutes.
            </p>
          </div>

          <Card className="p-5">
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
              <h2 className="text-[22px] font-extrabold">Connexion</h2>
              {errorBanner}
              <Field label="Email" htmlFor="login-email">
                <Input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="prenom.nom@email.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={bigField}
                />
              </Field>
              <Field
                label="Mot de passe"
                htmlFor="login-password"
                aside={
                  <button
                    type="button"
                    onClick={() => goTo('forgot')}
                    className="-my-1.5 min-h-[44px] text-[14px] font-bold text-link underline underline-offset-[3px]"
                  >
                    Oublié ?
                  </button>
                }
              >
                <PasswordInput
                  id="login-password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={bigField}
                />
              </Field>
              <Button type="submit" size="lg" isLoading={isLoading}>
                Se connecter
              </Button>
            </form>
          </Card>

          <div aria-hidden="true" className="flex items-center gap-3 text-[14px] font-bold text-muted">
            <span className="h-0.5 flex-1 bg-divider" />
            ou
            <span className="h-0.5 flex-1 bg-divider" />
          </div>

          <Button variant="secondary" size="lg" onClick={() => goTo('register')}>
            Créer mon compte chef
          </Button>

          {/* Accès rapide aux comptes de démo (mode mock uniquement) */}
          {isMock && switchMockUser && (
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-divider p-3">
              <span className="text-center text-[13px] font-bold text-muted">Démo : entrer en tant que…</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'admin', label: 'Benoît', hint: 'Admin' },
                  { id: 'admin2', label: 'Marie', hint: 'Admin trésorière' },
                  { id: 'chef1', label: 'Guillaume', hint: 'Meute 1 & 3' },
                  { id: 'chef2', label: 'Thomas', hint: 'Troupe 1' },
                  { id: 'chef3', label: 'Sophie', hint: 'Clairière 2' },
                  { id: 'pending', label: 'Claire', hint: 'En attente' },
                ].map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => switchMockUser(u.id)}
                    className="flex min-h-[44px] min-w-0 flex-col items-start justify-center rounded-lg border-2 border-line bg-surface px-3 py-1.5 text-left hover:bg-surface2"
                  >
                    <span className="truncate text-[14px] font-extrabold">{u.label}</span>
                    <span className="truncate text-[12px] font-semibold text-muted">{u.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {mode === 'register' && (
        <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-3.5 px-[22px] pb-5 pt-7 md:justify-center">
          <div className="flex items-center gap-3">
            <MartyMascot expression="ready" size={52} />
            <span className="text-[15px] font-semibold text-muted">Quelques infos et c'est parti.</span>
          </div>

          <Card className="p-[18px]">
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-[11px]">
              <h1 className="text-[22px] font-extrabold leading-[1.1]">Inscription nouveau chef</h1>
              <Banner tone="warning">
                Mets ton vrai prénom et ton vrai nom, pas ton totem : ils servent aux remboursements.
              </Banner>
              {errorBanner}
              {successMsg && <Banner tone="notice">{successMsg}</Banner>}

              <div className="grid grid-cols-2 gap-2.5">
                <SmallField label="Prénom" htmlFor="reg-firstname">
                  <Input
                    id="reg-firstname"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={smallField}
                  />
                </SmallField>
                <SmallField label="Nom" htmlFor="reg-lastname">
                  <Input
                    id="reg-lastname"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={smallField}
                  />
                </SmallField>
              </div>

              <SmallField label="Ton unité" htmlFor="reg-unit">
                <Select
                  id="reg-unit"
                  required
                  value={primaryUnitId}
                  onChange={(e) => setPrimaryUnitId(e.target.value)}
                  className={`${smallField} pl-2.5`}
                >
                  <option value="" disabled>
                    Choisis ton unité
                  </option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </SmallField>

              <SmallField label="Email" htmlFor="reg-email">
                <Input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={smallField}
                />
              </SmallField>

              <SmallField label="Mot de passe" htmlFor="reg-password">
                <PasswordInput
                  id="reg-password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={smallField}
                />
              </SmallField>

              <div className="flex min-h-[32px] items-center gap-2.5">
                {/* Case de 22 px dans une zone cliquable de 44 px */}
                <label className="-m-[11px] flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    required
                    aria-label="J'accepte les conditions d'utilisation"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="m-0 h-[22px] w-[22px] accent-green"
                  />
                </label>
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
              </div>

              <Button type="submit" size="lg" className="min-h-[52px]" isLoading={isLoading}>
                M'inscrire
              </Button>
            </form>
          </Card>

          <BackButton onClick={() => goTo('login')} className="self-center" />
        </main>
      )}

      {mode === 'forgot' && (
        <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-5 px-6 pb-6 pt-10">
          <BackButton onClick={() => goTo('login')} className="self-start" />

          <Card className="p-[22px]">
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3.5">
              <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
              <p className="text-[15px] font-medium text-muted">
                Indique ton email : on t'envoie un lien pour choisir un nouveau mot de passe.
              </p>
              {errorBanner}
              <Field label="Email" htmlFor="forgot-email">
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="prenom.nom@email.fr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setResetSent(false);
                  }}
                  className={bigField}
                />
              </Field>
              {resetSent ? (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border-2 border-line bg-surface2 p-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-on-color bg-green text-on-color"
                  >
                    <Check className="h-[18px] w-[18px]" strokeWidth={3} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-extrabold">Email envoyé !</span>
                    <span className="text-[14px] font-medium text-muted">
                      Si un compte existe avec cette adresse, tu vas recevoir le lien. Pense à regarder tes spams.
                    </span>
                  </span>
                </div>
              ) : (
                <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
                  Envoyer le lien
                </Button>
              )}
            </form>
          </Card>
        </main>
      )}

      <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
    </div>
  );
};
