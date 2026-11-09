import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'cgu' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'cgu',
}) => {
  const [tab, setTab] = useState<'cgu' | 'privacy'>(defaultTab);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={tab === 'cgu' ? "Conditions Générales d'Utilisation" : "Politique de Confidentialité & RGPD"}
      description="Groupe scout Saint-Martin"
      className="max-w-2xl"
    >
      <div className="flex border-b mb-4">
        <button
          onClick={() => setTab('cgu')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'cgu'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Conditions d'Utilisation
        </button>
        <button
          onClick={() => setTab('privacy')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'privacy'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Données Personnelles & RGPD
        </button>
      </div>

      <div className="space-y-4 text-sm text-foreground/90 max-h-[60vh] overflow-y-auto pr-2 leading-relaxed">
        {tab === 'cgu' ? (
          <>
            <section>
              <h4 className="font-bold text-base text-foreground mb-1">1. Objet du service</h4>
              <p>
                Cette application est mise à disposition des chefs d'unité et responsables du <strong>Groupe Saint-Martin</strong>. Elle permet la remontée dématérialisée des dépenses engagées pour les activités scoutes (sorties, week-ends, camps) avec leurs justificatifs obligatoires, ainsi que le suivi des remboursements.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-base text-foreground mb-1">2. Accès et inscription</h4>
              <p>
                L'inscription requiert une adresse email valide, les prénom et nom réels du bénévole (l'usage de totems ou noms scouts est interdit sur les pièces financières), ainsi que le rattachement à son unité scoute. Tout nouveau compte requiert la validation préalable par un administrateur du groupe.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-base text-foreground mb-1">3. Justificatifs et probité</h4>
              <p>
                Toute dépense déclarée doit obligatoirement être appuyée d'une facturette, reçu ou ticket de caisse lisible au format photo ou PDF. L'utilisateur s'engage à ne déclarer que des dépenses effectives et nécessaires aux activités de l'unité.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-base text-foreground mb-1">4. Rôle et responsabilités</h4>
              <p>
                L'application constitue un outil opérationnel de transmission et ne se substitue pas à la comptabilité générale légale de l'association nationale ou locale.
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h4 className="font-bold text-base text-foreground mb-1">1. Finalité du traitement</h4>
              <p>
                Les données sont collectées exclusivement dans le cadre de la gestion associative, de l'organisation des camps et du remboursement des frais engagés par les chefs bénévoles au bénéfice des jeunes des unités du Groupe Saint-Martin.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-base text-foreground mb-1">2. Données collectées</h4>
              <p>
                - Identité des chefs : prénom, nom, adresse email, unité(s) d'appartenance.<br />
                - Données financières : dates, montants, motifs de dépenses, mode de paiement.<br />
                - Pièces justificatives : photographies ou factures PDF des achats.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-base text-foreground mb-1">3. Durée de conservation (Règle des 10 ans)</h4>
              <p>
                Conformément à l'article L123-22 du Code de commerce et aux obligations fiscales des associations de jeunesse et d'éducation populaire, <strong>les pièces justificatives comptables sont conservées pendant une durée légale de dix (10) ans</strong>. La clôture d'une période annuelle archive les données en lecture seule sécurisée.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-base text-foreground mb-1">4. Sécurité et protection des mineurs</h4>
              <p>
                Les justificatifs sont hébergés dans un espace de stockage privé sécurisé par politiques RLS (Row Level Security). Les accès aux fichiers s'effectuent exclusivement via des liens éphémères signés. Aucune information nominative relative aux enfants mineurs ne doit être saisie dans les commentaires libres.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-base text-foreground mb-1">5. Droits d'accès et de rectification</h4>
              <p>
                Chaque bénévole dispose d'un droit d'accès et de rectification de ses données personnelles auprès des administrateurs du groupe, sous réserve du respect des obligations légales de conservation des pièces financières.
              </p>
            </section>
          </>
        )}
      </div>

      <div className="mt-6 pt-4 border-t flex justify-end">
        <Button variant="default" onClick={onClose}>
          J'ai compris
        </Button>
      </div>
    </Dialog>
  );
};
