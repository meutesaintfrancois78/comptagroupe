import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface PendingAccountScreenProps {
  /**
   * 'pending' : écran 6, validation en attente. 'suspended' : écran 7, accès suspendu.
   * Sans valeur, déduit du statut du profil (rejected ou deactivated → suspended).
   */
  variant?: 'pending' | 'suspended';
}

/** Écrans 6 et 7 : compte en attente de validation, ou accès suspendu (refusé, désactivé) */
export const PendingAccountScreen: React.FC<PendingAccountScreenProps> = ({ variant }) => {
  const { profile, refreshProfile, signOut } = useAuth();
  const [unitName, setUnitName] = useState<string | null>(profile?.primary_unit?.name ?? null);

  const suspended =
    variant === 'suspended' ||
    (!variant && (profile?.status === 'rejected' || profile?.status === 'deactivated'));

  // Nom de l'unité demandée à l'inscription (le profil ne porte que son identifiant)
  useEffect(() => {
    const unitId = profile?.primary_unit_id;
    if (suspended || unitName || !unitId) return;
    let cancelled = false;
    supabase
      .from('units')
      .select('name')
      .eq('id', unitId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data && (data as { name?: string }).name) setUnitName((data as { name: string }).name);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.primary_unit_id, suspended, unitName]);

  const firstName = profile?.first_name?.trim();

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-bg px-[22px] py-6 text-ink">
      <main className="mx-auto flex w-full max-w-[440px] flex-col items-center gap-3.5 rounded-3xl border-2.5 border-line bg-surface px-[22px] py-[26px] text-center shadow-pop-lg">
        {suspended ? (
          <MartyMascot
            expression="error"
            size={100}
            circle="red"
            alt="Marty, le bison, l'air désolé"
            badge={
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2.5 border-on-color bg-white text-on-color"
              >
                <Lock className="h-5 w-5" strokeWidth={2.4} />
              </span>
            }
          />
        ) : (
          <MartyMascot
            expression="waiting"
            size={100}
            circle="blue"
            badge={
              <span aria-hidden="true" className="-mr-0.5 block text-[30px] leading-none">
                ⏰
              </span>
            }
          />
        )}

        <Badge variant={suspended ? 'red' : 'yellow'} className="px-3 py-1 text-[13px]">
          {suspended ? 'Accès suspendu' : 'Validation en attente'}
        </Badge>

        <h1 className="text-[28px] font-extrabold leading-tight">Bonjour{firstName ? ` ${firstName}` : ''} !</h1>

        {suspended ? (
          <>
            <p className="text-[15px] font-medium leading-[1.45] text-muted">
              Ton compte a été désactivé, ou ta demande d'inscription n'a pas été acceptée.
            </p>
            <p className="text-[15px] font-medium leading-[1.45] text-muted">
              Si tu penses que c'est une erreur, contacte un admin du groupe.
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-medium leading-[1.45] text-muted">
              Ton compte chef{unitName ? ` pour ${unitName}` : ''} est bien créé. Un admin du groupe doit encore le
              valider.
            </p>
            <p className="text-[15px] font-medium leading-[1.45] text-muted">
              Tu pourras déclarer tes dépenses dès que c'est fait. Reviens vérifier un peu plus tard.
            </p>
          </>
        )}

        <Button variant="primary" className="mt-1.5 min-h-[54px] w-full" onClick={() => refreshProfile()}>
          Vérifier si j'ai été validé
        </Button>
        <Button variant="neutral" className="min-h-[50px] w-full" onClick={() => signOut()}>
          Me déconnecter
        </Button>
      </main>
    </div>
  );
};

/** Écran 7, pour un routage explicite dans App.tsx */
export const SuspendedAccountScreen: React.FC = () => <PendingAccountScreen variant="suspended" />;
