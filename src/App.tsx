import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { supabase } from '@/lib/supabase';
import { Unit, Period, ExpenseCategory, Expense, Profile } from '@/types/database';
import { Header, Footer } from '@/components/layout/Header';
import { Login } from '@/pages/Login';
import { PendingAccountScreen } from '@/components/chef/PendingAccountScreen';
import { CompleteProfileScreen } from '@/components/chef/CompleteProfileScreen';
import { ChefHome } from '@/components/chef/ChefHome';
import { ChefMissingProofBanner } from '@/components/chef/ChefMissingProofBanner';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { PendingValidationBanner } from '@/components/admin/PendingValidationBanner';
import { OfflineScreen } from '@/components/shared/OfflineScreen';
import { LegalModal } from '@/components/legal/LegalModal';
import { AdminSandboxTest } from '@/pages/AdminSandboxTest';
import { Button } from '@/components/ui/button';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { PWAInstallBanner } from '@/components/shared/PWAInstallBanner';
import { Banner } from '@/components/ui/feedback';
import { attachSignedUrls } from '@/lib/storage';
import { cn, formatCurrency, sumAmounts } from '@/lib/utils';
import { hasValidProof } from '@/lib/permissions';
import { TestTube2 } from 'lucide-react';

/** Cadre des écrans pleins (chargement, erreur, profil, accès suspendu) : colonne centrée */
const CenteredScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-dvh bg-bg text-ink">
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center gap-5 px-7 py-10 text-center">
      {children}
    </main>
  </div>
);

/** Écran 5 : chargement */
const LoadingScreen: React.FC = () => (
  <div className="min-h-dvh bg-bg text-ink">
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center gap-6 p-10 text-center">
      <MartyMascot expression="ready" size={124} shadow={6} />
      <p role="status" className="max-w-[260px] text-[19px] font-extrabold leading-[1.3]">
        Chargement de Compta Groupe Saint-Martin…
      </p>
      <div
        aria-hidden="true"
        className="h-4 w-[200px] max-w-full overflow-hidden rounded-lg border-2.5 border-line bg-surface"
      >
        <div className="h-full w-[62%] bg-blue" />
      </div>
    </main>
  </div>
);

/** Écran 30 : erreur inattendue, « Réessayer » recharge l'appli */
export const ErrorScreen: React.FC = () => (
  <CenteredScreen>
    <MartyMascot
      expression="error"
      size={124}
      circle="red"
      shadow={6}
      badge={
        <span
          aria-hidden="true"
          className="flex h-11 w-11 translate-y-0.5 items-center justify-center rounded-full border-2.5 border-on-color bg-white text-2xl font-extrabold text-on-color"
        >
          !
        </span>
      }
    />
    <h1 className="text-[28px] font-extrabold leading-[1.1]">Oups, ça a coincé</h1>
    <p className="text-base font-medium text-muted">
      Une erreur est survenue. Réessaie dans un instant ; si ça continue, préviens un admin du groupe.
    </p>
    <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
      Réessayer
    </Button>
  </CenteredScreen>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Erreur inattendue dans l’appli', error, info.componentStack);
  }

  render() {
    return this.state.hasError ? <ErrorScreen /> : this.props.children;
  }
}

export const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

const AppContent: React.FC = () => {
  const { user, profile, isLoading: isAuthLoading, profileError, refreshProfile, signOut } = useAuth();
  const isOnline = useNetworkStatus();

  // Données globales
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  // Unité active pour le chef (si 2 unités)
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  // Période sélectionnée (admin ou chef)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [focusReimbursements, setFocusReimbursements] = useState(0);
  const [chefRequestedView, setChefRequestedView] = useState<'home' | 'new_expense' | 'list' | null>(null);

  // Modales et routes
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  // Vérifier si la sandbox est activée
  const isSandboxEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_SANDBOX === 'true';

  // Charger toutes les données
  const loadData = useCallback(async () => {
    // 1. Unités
    const { data: unitsData } = await supabase.from('units').select('*').order('name');
    if (unitsData) setUnits(unitsData as Unit[]);

    // 2. Catégories
    const { data: catsData } = await supabase.from('expense_categories').select('*').order('name');
    if (catsData) setCategories(catsData as ExpenseCategory[]);

    // 3. Périodes
    const { data: periodsData } = await supabase.from('periods').select('*').order('start_date', { ascending: false });
    if (periodsData && periodsData.length > 0) {
      setPeriods(periodsData as Period[]);
      if (!selectedPeriodId) {
        const openP = (periodsData as Period[]).find((p) => p.status === 'open');
        setSelectedPeriodId(openP ? openP.id : periodsData[0].id);
      }
    }

    // 4. Dépenses (avec jointures complètes unité, catégorie, créateur)
    const { data: expData } = await supabase
      .from('expenses')
      .select('*, unit:units(id, name), category:expense_categories(id, name), creator:profiles(id, first_name, last_name)')
      .order('date', { ascending: false });

    if (expData) {
      const expensesWithSignedUrls = await attachSignedUrls(expData as Expense[]);
      setExpenses(expensesWithSignedUrls);
    }

    // 5. Profils (si admin)
    if (profile?.role === 'admin') {
      const { data: profData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profData) setAllProfiles(profData as Profile[]);
    }
  }, [profile?.role, selectedPeriodId]);

  useEffect(() => {
    if (profile) loadData();
  }, [profile, loadData]);

  // Nouveau compte connecté (sans rechargement de la page) : repartir de son unité principale
  useEffect(() => {
    setActiveUnitId(profile?.primary_unit_id ?? null);
  }, [profile?.id, profile?.primary_unit_id]);

  // Écoute de l'URL hash ou path pour la sandbox secrète (/admin/test-sandbox-secrete)
  useEffect(() => {
    const checkHash = () => {
      if (
        window.location.pathname.includes('sandbox') ||
        window.location.hash.includes('sandbox')
      ) {
        setIsSandboxOpen(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // 1. Écran de chargement initial (écran 5)
  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  // 2. Utilisateur NON connecté -> Écran Login / Inscription
  if (!user && !profile) {
    return <Login />;
  }

  // 3. Profil non chargé ou en cours (garde-fou anti-boucle infinie)
  if (!profile) {
    return (
      <CenteredScreen>
        <MartyMascot expression="waiting" size={124} shadow={6} />
        <h1 className="text-[28px] font-extrabold leading-[1.1]">Initialisation du profil</h1>
        <p className="text-base font-medium text-muted">
          Tu es connecté avec le compte <strong className="break-all text-ink">{user?.email}</strong>. On prépare ton
          profil…
        </p>
        {profileError && (
          <Banner tone="error" className="w-full text-left">
            <span className="break-words font-mono text-[13px]">{profileError}</span>
          </Banner>
        )}
        <div className="flex w-full flex-col gap-3">
          <Button size="lg" onClick={() => refreshProfile()}>
            Réessayer la synchronisation
          </Button>
          <Button variant="neutral" size="lg" onClick={() => signOut()}>
            Me déconnecter
          </Button>
        </div>
      </CenteredScreen>
    );
  }

  // 3a. Compte créé par Google sans unité : finir l'inscription (vrai nom, unité, CGU)
  if (profile.status === 'pending' && profile.role === 'chef' && !profile.primary_unit_id) {
    return <CompleteProfileScreen />;
  }

  // 3. Compte en attente de validation
  if (profile.status === 'pending') {
    return <PendingAccountScreen />;
  }

  // 4. Compte désactivé ou refusé
  if (profile.status === 'deactivated' || profile.status === 'rejected') {
    return <PendingAccountScreen variant="suspended" />;
  }

  // Période ouverte active pour les chefs
  const activePeriod = periods.find((p) => p.status === 'open') || periods[0] || {
    id: 'p1',
    name: 'Année 2026-2027',
    type: 'year',
    status: 'open',
    start_date: '2026-09-01',
    created_at: '',
  };

  // Unité active du chef
  // Un chef ne peut afficher qu'une de ses unités, même si l'état garde une ancienne valeur
  const myUnitIds = [profile.primary_unit_id, profile.secondary_unit_id].filter(Boolean);
  const currentUnit =
    units.find((u) => u.id === activeUnitId && (profile.role === 'admin' || myUnitIds.includes(u.id))) ||
    units.find((u) => u.id === profile.primary_unit_id) ||
    units[0] || { id: 'u1', name: 'Meute 1', is_active: true, created_at: '' };

  // Dépenses de l'unité active du chef
  const chefExpenses = expenses.filter((e) => e.unit_id === currentUnit.id);

  // Dépenses sans justificatif de l'unité active du chef
  const chefMissingProofs = chefExpenses.filter((e) => !hasValidProof(e));

  // Profils en attente pour l'admin
  const pendingProfiles = allProfiles.filter((p) => p.status === 'pending');

  // Dépenses payées avec l'argent perso d'un chef, pas encore remboursées (toutes périodes)
  const toReimburse = expenses.filter(
    (e) => e.payment_method === 'personal_money' && e.reimbursement_status === 'pending'
  );
  const openReimbursements = () => {
    // Si la période affichée n'en contient aucune, passer sur une période qui en a
    if (!toReimburse.some((e) => e.period_id === selectedPeriodId) && toReimburse[0]) {
      setSelectedPeriodId(toReimburse[0].period_id);
    }
    setFocusReimbursements(Date.now());
  };

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-ink">
      {/* Header global */}
      <Header
        profile={profile}
        units={units}
        activeUnitId={activeUnitId}
        onSelectUnit={setActiveUnitId}
        onLogout={signOut}
        isOnline={isOnline}
      />

      {/* Fenêtre imposée toutes les 3 min : comptes en attente et demandes de changement d'unité */}
      {profile.role === 'admin' &&
        (pendingProfiles.length > 0 || allProfiles.some((p) => p.requested_unit_id) || toReimburse.length > 0) &&
        !isSandboxOpen && (
        <PendingValidationBanner
          pendingProfiles={pendingProfiles}
          profiles={allProfiles}
          onRefresh={loadData}
          reimbursementsCount={toReimburse.length}
          reimbursementsTotal={formatCurrency(sumAmounts(toReimburse))}
          onOpenReimbursements={openReimbursements}
          units={units}
          onValidate={async (pId, uId) => {
            const { error } = await supabase.from('profiles').update({ status: 'active', primary_unit_id: uId }).eq('id', pId);
            if (error) throw new Error(error.message);
            loadData();
          }}
          onReject={async (pId) => {
            const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', pId);
            if (error) throw new Error(error.message);
            loadData();
          }}
        />
      )}

      {/* Fenêtre imposée toutes les 3 min côté chef : justificatifs manquants de l'unité */}
      {profile.role === 'chef' && chefMissingProofs.length > 0 && !isSandboxOpen && (
        <ChefMissingProofBanner
          unit={currentUnit}
          missingExpenses={chefMissingProofs}
          onRefresh={loadData}
          onViewAllExpenses={() => setChefRequestedView('list')}
        />
      )}

      {/* Contenu principal selon rôle */}
      <main
        className={cn(
          'mx-auto w-full min-w-0 flex-1',
          profile.role === 'admin' || isSandboxOpen ? 'max-w-admin px-4 py-4 md:px-6' : 'max-w-chef'
        )}
      >
        {isSandboxOpen && isSandboxEnabled ? (
          <AdminSandboxTest
            onDataReset={loadData}
            onExit={() => setIsSandboxOpen(false)}
          />
        ) : profile.role === 'admin' ? (
          <AdminDashboard
            expenses={expenses}
            units={units}
            categories={categories}
            periods={periods}
            profiles={allProfiles}
            currentAdminId={profile.id}
            selectedPeriodId={selectedPeriodId}
            onSelectPeriod={setSelectedPeriodId}
            onRefresh={loadData}
            focusReimbursements={focusReimbursements}
          />
        ) : (
          <ChefHome
            profile={profile}
            unit={currentUnit}
            activePeriod={activePeriod}
            categories={categories}
            expenses={chefExpenses}
            isOnline={isOnline}
            onRefresh={loadData}
            requestedView={chefRequestedView}
          />
        )}
      </main>

      {/* Pied de page */}
      <Footer onOpenLegal={() => setIsLegalOpen(true)} width={profile.role === 'admin' || isSandboxOpen ? 'admin' : 'chef'}>
        {profile.role === 'admin' && isSandboxEnabled && (
          <button
            type="button"
            onClick={() => setIsSandboxOpen(!isSandboxOpen)}
            className="ml-3 flex min-h-[44px] items-center gap-1 text-[12px] font-bold text-ink underline underline-offset-[3px]"
          >
            <TestTube2 className="h-4 w-4" aria-hidden="true" />
            {isSandboxOpen ? 'Quitter la sandbox' : 'Sandbox de test'}
          </button>
        )}
      </Footer>

      {/* Bannière d'installation PWA mobile */}
      <PWAInstallBanner />

      {/* Écran d'alerte hors-connexion */}
      {!isOnline && <OfflineScreen />}

      {/* Modale CGU & Confidentialité */}
      <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
    </div>
  );
};
