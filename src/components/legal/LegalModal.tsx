import React, { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LegalTab = 'cgu' | 'privacy';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: LegalTab;
}

interface LegalSection {
  title: string;
  text: string;
}

// Textes de la maquette (écran « Conditions et données »)
const SECTIONS: Record<LegalTab, LegalSection[]> = {
  cgu: [
    { title: '1. À quoi sert l’appli', text: 'Déclarer les dépenses engagées pour le Groupe Saint-Martin et suivre leur remboursement.' },
    { title: '2. Ton compte', text: 'Un compte par chef, à ton vrai nom. Un admin du groupe valide chaque inscription.' },
    { title: '3. Les justificatifs', text: 'Chaque dépense est accompagnée d’un justificatif lisible : ticket, facture ou reçu.' },
    { title: '4. Conservation', text: 'Les dépenses et leurs justificatifs sont conservés 10 ans.' },
  ],
  privacy: [
    { title: '1. Données collectées', text: 'Prénom, nom, email, unité, dépenses déclarées et justificatifs.' },
    { title: '2. Pourquoi', text: 'Uniquement pour la comptabilité du groupe et les remboursements.' },
    { title: '3. Qui y a accès', text: '[À COMPLÉTER : qui consulte les dépenses et les justificatifs.]' },
    { title: '4. Tes droits', text: '[À COMPLÉTER : comment consulter, corriger ou supprimer tes données.]' },
  ],
};

const TABS: { id: LegalTab; label: string }[] = [
  { id: 'cgu', label: "Conditions d'utilisation" },
  { id: 'privacy', label: 'Données personnelles et RGPD' },
];

/** Fenêtre du bas « Conditions et données » : 2 onglets, fermée par « J'ai compris » ou Échap */
export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, defaultTab = 'cgu' }) => {
  const [tab, setTab] = useState<LegalTab>(defaultTab);
  const tabRefs = useRef<Record<LegalTab, HTMLButtonElement | null>>({ cgu: null, privacy: null });
  const baseId = useId();

  useEffect(() => {
    if (isOpen) setTab(defaultTab);
  }, [isOpen, defaultTab]);

  // La maquette n'a pas de bouton Fermer : Échap reste disponible
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const index = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? TABS.length - 1
          : (index + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      preventClose
      variant="sheet"
      title={<span className="text-2xl">Conditions et données</span>}
      className="flex h-[90dvh] flex-col pt-[22px] md:h-[80dvh] md:max-h-[760px]"
    >
      <div className="-mt-0.5 flex min-h-0 flex-1 flex-col gap-3.5">
        <div
          role="tablist"
          aria-label="Conditions et données"
          className="grid grid-cols-2 gap-2"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={cn(
                  'min-h-[48px] min-w-0 rounded-[14px] border-2.5 border-line px-2.5 py-1.5 text-[14px] font-extrabold leading-[1.15]',
                  selected ? 'bg-green text-on-color' : 'bg-surface text-ink hover:bg-surface2'
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${tab}`}
          tabIndex={0}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0.5 py-1"
        >
          {SECTIONS[tab].map((sec) => (
            <section key={sec.title} className="flex flex-col gap-1">
              <h3 className="text-[17px] font-extrabold">{sec.title}</h3>
              <p className="text-[15px] font-medium leading-[1.45] text-muted">{sec.text}</p>
            </section>
          ))}
        </div>

        <Button size="lg" onClick={onClose}>
          J'ai compris
        </Button>
      </div>
    </Dialog>
  );
};
