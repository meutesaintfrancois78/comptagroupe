import React, { useState, useEffect, useId, useRef } from 'react';
import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/feedback';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed';

const readDismissed = (): string | null => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

/** Carte « Installer Compta Saint-Martin », posée en bas de l'écran sur un voile */
export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    // Déjà installée : rien à proposer
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Refusée il y a moins de 7 jours
    const dismissedTime = readDismissed();
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 3600 * 1000) {
      return;
    }

    // Android / Chromium : beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS : pas d'invite système, on montre la marche à suivre
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice && !dismissedTime) {
      setIsIOS(true);
      // Léger délai pour ne pas recouvrir le chargement
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // stockage indisponible : la carte reviendra à la prochaine visite
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      handleDismiss();
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  // Focus sur la carte à l'ouverture, Échap pour fermer
  useEffect(() => {
    if (!isVisible) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-end p-3.5 pb-safe md:p-6"
      style={{ background: 'var(--backdrop)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="flex w-full max-w-[440px] flex-col gap-3.5 rounded-3xl border-2.5 border-line bg-surface p-[18px] text-ink shadow-pop-md outline-none"
      >
        <div className="flex items-start gap-3.5">
          <IconTile size={56} className="rounded-xl text-[30px] leading-none">
            ⚜
          </IconTile>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={titleId} className="text-[19px] font-extrabold leading-[1.15]">
              Installer Compta Saint-Martin
            </h2>
            <p id={descId} className="text-[14px] font-medium leading-[1.4] text-muted">
              Ajoute l'appli à ton écran d'accueil pour déclarer une dépense en un geste.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={handleDismiss}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-surface2"
          >
            <X className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {isIOS && (
          <div className="flex items-center gap-2.5 rounded-[14px] bg-surface2 px-3 py-2.5 text-[13px] font-semibold leading-[1.35]">
            <Share className="h-5 w-5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span>Sur iPhone : touche Partager, puis « Sur l'écran d'accueil ».</span>
          </div>
        )}

        <Button size="default" className="min-h-[52px] text-[17px]" onClick={handleInstallClick}>
          {deferredPrompt ? 'Installer' : "J'ai compris"}
        </Button>
      </div>
    </div>
  );
};
