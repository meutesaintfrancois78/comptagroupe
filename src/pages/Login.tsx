import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LegalModal } from '@/components/legal/LegalModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Unit } from '@/types/database';

export const Login: React.FC = () => {
  const { signIn, signUp, resetPassword, isMock, switchMockUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [primaryUnitId, setPrimaryUnitId] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load units
    supabase
      .from('units')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setUnits(data as Unit[]);
          if (!primaryUnitId) setPrimaryUnitId(data[0].id);
        }
      });
  }, [primaryUnitId]);

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
        setSuccessMsg('Compte créé avec succès ! Un administrateur va valider ta demande.');
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
        setSuccessMsg('Un lien de réinitialisation a été envoyé sur ton adresse email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-background to-scout-50/30 dark:to-background">
      <div className="w-full max-w-md">
        {/* Mascotte Marty Hello */}
        <MartyMascot
          expression="hello"
          size="md"
          title="Bienvenue sur Compta Saint-Martin !"
          subtitle="La remontée de dépenses simple et rapide pour les chefs d'unité"
        />

        <Card className="mt-4 border shadow-xl rounded-3xl bg-card">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-xl">
              {mode === 'login' && 'Connexion'}
              {mode === 'register' && 'Inscription nouveau chef'}
              {mode === 'forgot' && 'Mot de passe oublié'}
            </CardTitle>
            <CardDescription>
              {mode === 'login' && 'Accède à ton unité scoute ou à ton espace admin'}
              {mode === 'register' && 'Rejoins ton unité pour déclarer tes dépenses'}
              {mode === 'forgot' && 'Reçois un lien par mail pour réinitialiser ton accès'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/15 text-destructive text-sm font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Adresse email
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="chef@groupe-saint-martin.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-primary hover:underline"
                    >
                      Oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Se connecter
                </Button>

                <div className="pt-3 text-center border-t">
                  <p className="text-xs text-muted-foreground">
                    Tu es chef et tu n'as pas encore de compte ?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setMode('register')}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Créer mon compte chef
                  </Button>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="p-3 bg-amber-500/10 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                  ⚠️ <strong>Consigne :</strong> Renseigne tes <strong>vrais prénom et nom</strong> officiels pour la comptabilité (pas ton nom scout / totem).
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Prénom réel
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Alexandre"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nom réel
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Dupont"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Ton unité scoute
                  </label>
                  <select
                    value={primaryUnitId}
                    onChange={(e) => setPrimaryUnitId(e.target.value)}
                    className="h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Adresse email
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="ton.mail@exemple.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="legal-checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <label htmlFor="legal-checkbox" className="text-xs text-muted-foreground leading-tight">
                    J'accepte les{' '}
                    <button
                      type="button"
                      onClick={() => setIsLegalOpen(true)}
                      className="text-primary underline font-medium"
                    >
                      conditions d'utilisation et la politique de confidentialité (conservation 10 ans)
                    </button>
                  </label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  M'inscrire (compte en attente)
                </Button>

                <div className="pt-2 text-center border-t">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Adresse email du compte
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="chef@groupe-saint-martin.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Envoyer le lien de réinitialisation
                </Button>

                <div className="pt-2 text-center border-t">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Boutons de test rapide en mode démo / mock */}
        {isMock && (
          <div className="mt-6 p-4 rounded-3xl border bg-card/60 backdrop-blur text-center space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              ⚡ Accès rapide Utilisateurs de Test
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-left">
              <Button
                size="sm"
                variant="outline"
                className="text-xs justify-start h-auto py-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                onClick={() => switchMockUser?.('admin')}
              >
                <div>
                  <div className="font-bold">👤 Benoît (Admin)</div>
                  <div className="text-[10px] opacity-75">Chef de groupe</div>
                </div>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-xs justify-start h-auto py-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                onClick={() => switchMockUser?.('admin2')}
              >
                <div>
                  <div className="font-bold">💼 Marie (Admin)</div>
                  <div className="text-[10px] opacity-75">Trésorière</div>
                </div>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-xs justify-start h-auto py-2 bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300"
                onClick={() => switchMockUser?.('chef1')}
              >
                <div>
                  <div className="font-bold">🐺 Guillaume</div>
                  <div className="text-[10px] opacity-75">Meute 1 & 3</div>
                </div>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-xs justify-start h-auto py-2 bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300"
                onClick={() => switchMockUser?.('chef2')}
              >
                <div>
                  <div className="font-bold">🏕️ Thomas</div>
                  <div className="text-[10px] opacity-75">Troupe 1</div>
                </div>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-xs justify-start h-auto py-2 bg-purple-500/10 border-purple-500/20 text-purple-800 dark:text-purple-300"
                onClick={() => switchMockUser?.('chef3')}
              >
                <div>
                  <div className="font-bold">🌿 Sophie</div>
                  <div className="text-[10px] opacity-75">Clairière 2</div>
                </div>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-xs justify-start h-auto py-2 bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                onClick={() => switchMockUser?.('pending')}
              >
                <div>
                  <div className="font-bold">⏳ Claire</div>
                  <div className="text-[10px] opacity-75">En attente (Cie 2)</div>
                </div>
              </Button>
            </div>
          </div>
        )}
      </div>

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
      />
    </div>
  );
};
