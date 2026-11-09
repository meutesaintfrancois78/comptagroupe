import React from 'react';
import { Save, WifiOff } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';

/**
 * Écran plein « Pas de réseau pour l'instant ». Il disparaît seul au retour du réseau
 * (App l'affiche tant que useNetworkStatus renvoie false).
 */
export const OfflineScreen: React.FC = () => (
  <div className="fixed inset-0 z-50 overflow-y-auto bg-bg text-ink">
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center gap-5 px-7 py-10 text-center">
      <MartyMascot
        expression="offline"
        size={124}
        circle="surface2"
        shadow={6}
        badge={
          <span
            aria-hidden="true"
            className="flex h-11 w-11 translate-y-0.5 items-center justify-center rounded-full border-2.5 border-on-color bg-yellow text-on-color"
          >
            <WifiOff className="h-[22px] w-[22px]" strokeWidth={2.4} />
          </span>
        }
      />
      <h1 className="text-[28px] font-extrabold leading-[1.1]">Pas de réseau pour l'instant</h1>
      <p className="text-base font-medium text-muted">Attends d'être en ligne pour envoyer ta dépense.</p>
      <div className="flex items-start gap-3 rounded-[18px] border-2.5 border-line bg-surface px-4 py-3.5 text-left shadow-pop">
        <Save className="mt-px h-[22px] w-[22px] shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span className="text-[15px] font-semibold leading-[1.4]">
          Ton brouillon est gardé sur ce téléphone : tu reprendras là où tu t'es arrêté.
        </span>
      </div>
    </main>
  </div>
);
