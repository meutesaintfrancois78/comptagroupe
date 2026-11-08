import React, { useState } from 'react';
import {
  TestTube2,
  Database,
  Trash2,
  Mail,
  UserPlus,
  Receipt,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase, isMockMode } from '@/lib/supabase';
import { mockClientInstance } from '@/lib/mockSupabase';

interface AdminSandboxTestProps {
  onDataReset?: () => void;
  onExit?: () => void;
}

export const AdminSandboxTest: React.FC<AdminSandboxTestProps> = ({
  onDataReset,
  onExit,
}) => {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Injecter des dépenses de test
  const handleSeedExpenses = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const unitsRes = await supabase.from('units').select('id, name');
      const catsRes = await supabase.from('expense_categories').select('id, name');
      const periodsRes = await supabase.from('periods').select('id, name');
      const profilesRes = await supabase.from('profiles').select('id, first_name');

      const units = unitsRes.data || [];
      const cats = catsRes.data || [];
      const periods = periodsRes.data || [];
      const profiles = profilesRes.data || [];

      if (units.length === 0 || periods.length === 0) {
        setStatusMsg('Impossible : aucune unité ou période trouvée.');
        return;
      }

      const fakeExpenses = [
        {
          type: 'dépense',
          date: '2026-11-02',
          amount: 24.90,
          category_id: cats[0]?.id || null,
          payment_method: 'unit_money',
          proof_path: 'mock/ticket-nourriture.jpg',
          comment: 'Chocolat chaud et biscuits pour la veillée',
          reimbursement_status: 'not_applicable',
          unit_id: units[0].id,
          created_by: profiles[0]?.id || 'user-admin-1',
          period_id: periods[0].id,
        },
        {
          type: 'dépense',
          date: '2026-11-04',
          amount: 67.40,
          category_id: cats[1]?.id || null,
          payment_method: 'personal_money',
          proof_path: 'mock/peage-carburant.jpg',
          comment: 'Plein d’essence camionnette pour transport du matériel',
          reimbursement_status: 'pending',
          unit_id: units[1 % units.length].id,
          created_by: profiles[0]?.id || 'user-admin-1',
          period_id: periods[0].id,
        },
        {
          type: 'dépense',
          date: '2026-11-06',
          amount: 112.00,
          category_id: cats[2]?.id || null,
          payment_method: 'unit_money',
          proof_path: 'mock/bricolage-ficelle.pdf',
          comment: 'Perches de bois et cordage pour froissartage',
          reimbursement_status: 'not_applicable',
          unit_id: units[2 % units.length].id,
          created_by: profiles[0]?.id || 'user-admin-1',
          period_id: periods[0].id,
        },
        {
          type: 'dépense',
          date: '2026-11-07',
          amount: 18.50,
          category_id: cats[4]?.id || null,
          payment_method: 'personal_money',
          proof_path: 'mock/pharmacie-pansements.jpg',
          comment: 'Recharge désinfectant et arnica pour la trousse',
          reimbursement_status: 'reimbursed',
          unit_id: units[0].id,
          created_by: profiles[0]?.id || 'user-admin-1',
          period_id: periods[0].id,
        },
      ];

      for (const fe of fakeExpenses) {
        await supabase.from('expenses').insert(fe);
      }

      setStatusMsg('4 fausses dépenses de test ont été générées avec succès !');
      onDataReset?.();
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Injecter 2 chefs en attente de validation
  const handleSeedPendingChefs = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const unitsRes = await supabase.from('units').select('id');
      const unitId = unitsRes.data?.[0]?.id || null;

      await supabase.from('profiles').insert([
        {
          id: 'test-pending-' + Date.now(),
          first_name: 'Arthur',
          last_name: 'De La Tour',
          role: 'chef',
          status: 'pending',
          primary_unit_id: unitId,
          secondary_unit_id: null,
        },
        {
          id: 'test-pending-2-' + Date.now(),
          first_name: 'Hélène',
          last_name: 'Rousseau',
          role: 'chef',
          status: 'pending',
          primary_unit_id: unitId,
          secondary_unit_id: null,
        },
      ]);

      setStatusMsg('2 chefs en attente créés. La bannière admin 3 minutes va se déclencher !');
      onDataReset?.();
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Réinitialiser la base de données
  const handleResetDatabase = () => {
    if (!window.confirm('Voulez-vous vraiment réinitialiser toutes les données de test ?')) return;
    if (isMockMode) {
      mockClientInstance.resetDB();
      setStatusMsg('Base de données locale réinitialisée à son état d’origine.');
      onDataReset?.();
    } else {
      setStatusMsg('En mode réel, la réinitialisation se fait via les scripts SQL dans Supabase.');
    }
  };

  // 4. Test d'envoi d'email
  const handleTestEmail = () => {
    setStatusMsg('Test email : simulation de la notification SMTP associatif vers chef@groupe-enf.fr (Succès).');
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-primary font-bold">
          <TestTube2 className="w-6 h-6" />
          <h2 className="text-xl font-black">Bac à Sable & Tests (Page Secrète)</h2>
        </div>
        {onExit && (
          <Button size="sm" variant="outline" onClick={onExit}>
            Quitter la sandbox
          </Button>
        )}
      </div>

      <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-3xl text-amber-900 dark:text-amber-200 text-xs space-y-1">
        <div className="flex items-center space-x-1.5 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Avertissement de mise en production :</span>
        </div>
        <p>
          Cette page secrète (<code>/admin/test-sandbox-secrete</code>) est destinée uniquement aux essais des administrateurs.
          Conformément au cahier des charges, elle sera retirée du build final de production grâce au flag <code>VITE_ENABLE_SANDBOX=false</code> et au script <code>bun run clean:sandbox</code>.
        </p>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-primary" />
              <span>Générer des dépenses</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Injecte 4 dépenses variées (nourriture, carburant, pharmacie) avec différents modes de paiement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              size="sm"
              onClick={handleSeedExpenses}
              isLoading={isLoading}
            >
              Injecter 4 fausses dépenses
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>Tester la bannière 3 min</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Crée 2 faux chefs en attente pour déclencher la bannière de validation admin imposée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full text-xs font-bold"
              size="sm"
              onClick={handleSeedPendingChefs}
              isLoading={isLoading}
            >
              Créer 2 chefs en attente
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Tester les notifications</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Simule le déclenchement de l'envoi d'un email de notification (remboursement / validation).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full text-xs"
              size="sm"
              onClick={handleTestEmail}
            >
              Simuler email de test
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2 text-destructive">
              <Database className="w-4 h-4" />
              <span>Réinitialiser les données</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Remet à zéro la base de données de test locale (efface les ajouts et recharge le seed ENF).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full text-xs"
              size="sm"
              onClick={handleResetDatabase}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Réinitialiser la base
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
