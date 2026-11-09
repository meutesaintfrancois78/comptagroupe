import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if dismissed recently
    const dismissedTime = localStorage.getItem('pwa_install_dismissed');
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 3600 * 1000) {
      return;
    }

    // Android / Chromium beforeinstallprompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice && !isStandalone && !dismissedTime) {
      setIsIOS(true);
      // Delay showing banner slightly on iOS so it doesn't overlap loading
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-scout-dark text-white p-4 rounded-2xl shadow-2xl border border-scout-light/30 flex items-start space-x-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-scout-500 text-white font-bold text-lg shadow-sm">
          📱
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-sm font-bold tracking-tight">Installer Compta Saint-Martin</h4>
          <p className="text-xs text-emerald-100/80 mt-0.5 leading-snug">
            {isIOS
              ? "Pour installer : appuie sur Partager ⎋ puis 'Sur l'écran d'accueil' 📲"
              : "Ajoute l'application à ton écran d'accueil pour un accès instantané et le mode hors-ligne."}
          </p>

          <div className="mt-3 flex items-center space-x-2">
            {!isIOS && deferredPrompt && (
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="bg-white text-scout-dark hover:bg-emerald-50 text-xs font-bold h-8 px-3.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Installer
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-emerald-100 hover:text-white hover:bg-white/10 text-xs h-8 px-2.5"
            >
              Plus tard
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-emerald-200/60 hover:text-white p-1 rounded-lg transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
