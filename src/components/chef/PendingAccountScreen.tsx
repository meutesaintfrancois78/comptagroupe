import React from 'react';
import { RefreshCw, LogOut, Clock } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export const PendingAccountScreen: React.FC = () => {
  const { profile, refreshProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full bg-card p-8 rounded-3xl border shadow-xl flex flex-col items-center text-center animate-in fade-in">
        <MartyMascot
          expression="waiting"
          size="lg"
        />

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>Validation en attente</span>
        </div>

        <h2 className="text-2xl font-extrabold text-foreground">
          Bonjour {profile?.first_name} !
        </h2>

        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Ton inscription pour l'unité <strong>{profile?.primary_unit?.name || 'scoute'}</strong> a bien été enregistrée.
        </p>

        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Un administrateur (chef de groupe ou trésorier) doit valider ton compte avant que tu puisses saisir ou consulter les dépenses.
        </p>

        <div className="mt-8 w-full space-y-3">
          <Button
            variant="default"
            size="lg"
            onClick={refreshProfile}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Vérifier si j'ai été validé
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={signOut}
            className="w-full text-muted-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Me déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
};
