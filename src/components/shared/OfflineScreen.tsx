import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';

interface OfflineScreenProps {
  onRetry?: () => void;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-background/95 backdrop-blur-md text-center animate-in fade-in">
      <div className="max-w-md w-full bg-card p-8 rounded-3xl border shadow-xl flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
          <WifiOff className="w-8 h-8" />
        </div>

        <MartyMascot
          expression="offline"
          size="lg"
        />

        <h2 className="text-2xl font-extrabold text-foreground mt-4">
          Pas de connexion !
        </h2>

        <p className="text-muted-foreground mt-2 text-base">
          Reviens quand tu captes. Ne t'inquiète pas : ton formulaire en cours reste bien au chaud en mémoire locale !
        </p>

        <div className="mt-6 w-full flex flex-col space-y-3">
          <Button
            variant="default"
            size="lg"
            onClick={() => onRetry ? onRetry() : window.location.reload()}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Réessayer maintenant
          </Button>
        </div>
      </div>
    </div>
  );
};
