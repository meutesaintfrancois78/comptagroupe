import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { supabase } from '@/lib/supabase';
import { Unit, Period, ExpenseCategory, Expense, Profile } from '@/types/database';
import { Header } from '@/components/layout/Header';
import { Login } from '@/pages/Login';
import { PendingAccountScreen } from '@/components/chef/PendingAccountScreen';
import { ChefHome } from '@/components/chef/ChefHome';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { PendingValidationBanner } from '@/components/admin/PendingValidationBanner';
import { OfflineScreen } from '@/components/shared/OfflineScreen';
import { LegalModal } from '@/components/legal/LegalModal';
import { AdminSandboxTest } from '@/pages/AdminSandboxTest';
import { Button } from '@/components/ui/button';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { TestTube2 } from 'lucide-react';

export const App: React.FC = () => {
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

    // 4. Dépenses
    const { data: expData } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (expData) setExpenses(expData as Expense[]);

    // 5. Profils (si admin)
    if (profile?.role === 'admin') {
      const { data: profData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profData) setAllProfiles(profData as Profile[]);
    }
  }, [profile?.role, selectedPeriodId]);

  useEffect(() => {
    if (profile) {
      loadData();
      if (!activeUnitId && profile.primary_unit_id) {
        setActiveUnitId(profile.primary_unit_id);
      }
    }
  }, [profile, loadData, activeUnitId]);

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

  // 1. Écran de chargement initial
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <MartyMascot expression="hello" size="md" subtitle="Chargement de Compta ENF..." />
      </div>
    );
  }

  // 2. Utilisateur NON connecté -> Écran Login / Inscription
  if (!user && !profile) {
    return <Login />;
  }

  // 3. Profil non chargé ou en cours (garde-fou anti-boucle infinie)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-center">
        <div className="max-w-md w-full bg-card p-8 rounded-3xl border shadow-xl flex flex-col items-center">
          <MartyMascot expression="waiting" size="lg" />
          <h2 className="text-xl font-bold text-foreground mt-4">Initialisation du profil</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Tu es connecté avec le compte <strong>{user?.email}</strong>. Nous préparons ton profil scout...
          </p>
          {profileError && (
            <div className="mt-3 p-3 text-xs rounded-xl bg-destructive/15 text-destructive font-mono text-left w-full overflow-x-auto">
              {profileError}
            </div>
          )}
          <div className="mt-6 w-full space-y-2">
            <Button className="w-full" onClick={() => refreshProfile()}>
              Réessayer la synchronisation
            </Button>
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              Me déconnecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Compte en attente de validation
  if (profile.status === 'pending') {
    return <PendingAccountScreen />;
  }

  // 4. Compte désactivé ou refusé
  if (profile.status === 'deactivated' || profile.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-center">
        <div className="max-w-md w-full bg-card p-8 rounded-3xl border shadow-xl">
          <MartyMascot expression="error" size="lg" />
          <h2 className="text-xl font-bold text-foreground mt-4">Accès suspendu</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Ton compte a été {profile.status === 'rejected' ? 'refusé' : 'désactivé'} par un administrateur.
            Rapproche-toi de ton chef de groupe en cas d'erreur.
          </p>
          <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
            Me déconnecter
          </Button>
        </div>
      </div>
    );
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
  const currentUnit =
    units.find((u) => u.id === activeUnitId) ||
    units.find((u) => u.id === profile.primary_unit_id) ||
    units[0] || { id: 'u1', name: 'Meute 1', is_active: true, created_at: '' };

  // Dépenses de l'unité active du chef
  const chefExpenses = expenses.filter((e) => e.unit_id === currentUnit.id);

  // Profils en attente pour l'admin
  const pendingProfiles = allProfiles.filter((p) => p.status === 'pending');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header global */}
      <Header
        profile={profile}
        units={units}
        activeUnitId={activeUnitId}
        onSelectUnit={setActiveUnitId}
        onLogout={signOut}
        isOnline={isOnline}
      />

      {/* Bannière 3 min admin si comptes en attente */}
      {profile.role === 'admin' && pendingProfiles.length > 0 && !isSandboxOpen && (
        <PendingValidationBanner
          pendingProfiles={pendingProfiles}
          units={units}
          onValidate={async (pId, uId) => {
            await supabase.from('profiles').update({ status: 'active', primary_unit_id: uId }).eq('id', pId);
            loadData();
          }}
          onReject={async (pId) => {
            await supabase.from('profiles').update({ status: 'rejected' }).eq('id', pId);
            loadData();
          }}
        />
      )}

      {/* Contenu principal selon rôle */}
      <main className="flex-1 container mx-auto px-4 py-4">
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
          />
        )}
      </main>

      {/* Pied de page */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between container mx-auto px-4 gap-2">
        <div>
          Compta Éclaireurs Neutres de France (ENF) • Conservation 10 ans
        </div>
        <div className="flex items-center space-x-3">
          {profile.role === 'admin' && isSandboxEnabled && (
            <button
              onClick={() => setIsSandboxOpen(!isSandboxOpen)}
              className="text-amber-700 dark:text-amber-400 hover:underline flex items-center font-bold"
            >
              <TestTube2 className="w-3.5 h-3.5 mr-1" />
              {isSandboxOpen ? 'Quitter la Sandbox' : 'Sandbox de test'}
            </button>
          )}
          <button
            onClick={() => setIsLegalOpen(true)}
            className="hover:underline text-primary font-medium"
          >
            Mentions légales & CGU
          </button>
        </div>
      </footer>

      {/* Écran d'alerte hors-connexion */}
      {!isOnline && <OfflineScreen />}

      {/* Modale CGU & Confidentialité */}
      <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
    </div>
  );
};
