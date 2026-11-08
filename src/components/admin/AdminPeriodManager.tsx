import React, { useState } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Trash2,
  Download,
  AlertTriangle,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { Period, Expense } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { generateCsvContent, downloadCsv } from '@/lib/exportCsv';
import { generateAndDownloadReceiptsZip } from '@/lib/exportZip';
import { supabase } from '@/lib/supabase';

interface AdminPeriodManagerProps {
  periods: Period[];
  expenses: Expense[];
  onRefresh: () => void;
}

export const AdminPeriodManager: React.FC<AdminPeriodManagerProps> = ({
  periods,
  expenses,
  onRefresh,
}) => {
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodType, setNewPeriodType] = useState<'year' | 'camp'>('year');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de purge
  const [periodToPurge, setPeriodToPurge] = useState<Period | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  // Clôturer une période avec export automatique obligatoire
  const handleClosePeriod = async (period: Period) => {
    if (
      !window.confirm(
        `Confirmer la clôture de la période "${period.name}" ?\nUn export automatique des comptes sera généré immédiatement.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Export automatique immédiat
      const periodExpenses = expenses.filter((e) => e.period_id === period.id);
      const csv = generateCsvContent(periodExpenses);
      downloadCsv(`Cloture_${period.name.replace(/\s+/g, '_')}_Automatique.csv`, csv);

      // 2. Clôture de la période
      await supabase
        .from('periods')
        .update({ status: 'closed', end_date: new Date().toISOString().split('T')[0] })
        .eq('id', period.id);

      setNotification(`Période "${period.name}" clôturée et export de sauvegarde téléchargé.`);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rouvrir une période clôturée
  const handleReopenPeriod = async (period: Period) => {
    if (!window.confirm(`Rouvrir la période "${period.name}" pour les chefs ?`)) return;
    await supabase.from('periods').update({ status: 'open' }).eq('id', period.id);
    setNotification(`Période "${period.name}" réouverte.`);
    onRefresh();
  };

  // Créer une nouvelle période
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodName.trim()) return;

    setIsSubmitting(true);
    await supabase.from('periods').insert({
      name: newPeriodName.trim(),
      type: newPeriodType,
      status: 'open',
      start_date: new Date().toISOString().split('T')[0],
    });
    setNewPeriodName('');
    setIsSubmitting(false);
    onRefresh();
  };

  // Purge irréversible d'une période (avec export obligatoire avant)
  const handleExecutePurge = async () => {
    if (!periodToPurge || purgeConfirmText.trim() !== 'PURGER') return;

    setIsPurging(true);
    try {
      const periodExpenses = expenses.filter((e) => e.period_id === periodToPurge.id);

      // 1. Export obligatoire avant purge
      const csv = generateCsvContent(periodExpenses);
      downloadCsv(`Archive_PrePurge_${periodToPurge.name.replace(/\s+/g, '_')}.csv`, csv);
      await generateAndDownloadReceiptsZip(
        periodExpenses,
        `Archive_PrePurge_Justificatifs_${periodToPurge.name.replace(/\s+/g, '_')}.zip`
      );

      // 2. Suppression de toutes les dépenses rattachées
      for (const exp of periodExpenses) {
        await supabase.from('expenses').delete().eq('id', exp.id);
      }

      // 3. Suppression de la période
      await supabase.from('periods').delete().eq('id', periodToPurge.id);

      setNotification(`Période "${periodToPurge.name}" purgée avec succès après sauvegarde intégrale.`);
      setPeriodToPurge(null);
      setPurgeConfirmText('');
      onRefresh();
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Info Conservation 10 ans */}
      <div className="bg-scout-50/50 dark:bg-card rounded-3xl border border-scout-200 dark:border-border p-5 shadow-sm">
        <h3 className="text-base font-extrabold text-foreground flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-emerald-700" />
          Gestion des Périodes (Année / Camp) & Règle des 10 ans
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Une période clôturée passe en <strong>lecture seule réservée aux administrateurs</strong> et disparaît de la vue des chefs.
          Conformément au Code de commerce et aux règles associatives ENF, les pièces et dépenses sont conservées pendant 10 ans. La purge n'est à utiliser qu'en cas exceptionnel et déclenche automatiquement un téléchargement de sauvegarde.
        </p>
      </div>

      {/* Création d'une nouvelle période */}
      <div className="bg-card rounded-3xl border p-5 shadow-sm">
        <h4 className="text-sm font-bold text-foreground mb-3">
          Ouvrir une nouvelle période (Camp d'été ou Nouvelle Année)
        </h4>
        <form onSubmit={handleCreatePeriod} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Ex : Camp d'été 2027"
            value={newPeriodName}
            onChange={(e) => setNewPeriodName(e.target.value)}
            className="flex-1 text-xs"
          />
          <select
            value={newPeriodType}
            onChange={(e) => setNewPeriodType(e.target.value as 'year' | 'camp')}
            className="h-10 text-xs font-medium rounded-lg border border-input bg-background px-3 py-1"
          >
            <option value="year">Année scoute</option>
            <option value="camp">Camp d'été</option>
          </select>
          <Button size="default" type="submit" isLoading={isSubmitting}>
            <Plus className="w-4 h-4 mr-1" />
            Ouvrir la période
          </Button>
        </form>
      </div>

      {/* Liste des périodes */}
      <div className="bg-card rounded-2xl border shadow-sm divide-y">
        {periods.map((p) => {
          const isClosed = p.status === 'closed';
          const periodExpenses = expenses.filter((e) => e.period_id === p.id);
          const totalAmount = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

          return (
            <div
              key={p.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base text-foreground">{p.name}</span>
                  {isClosed ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Clôturée
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">
                      Active / Ouverte
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground uppercase">
                    ({p.type === 'camp' ? 'Camp' : 'Année'})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {periodExpenses.length} dépense(s) déclarée(s) • Total :{' '}
                  <strong className="text-foreground">{totalAmount.toFixed(2)} €</strong>
                </div>
              </div>

              {/* Actions Période */}
              <div className="flex items-center space-x-2">
                {/* Export de la période */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const csv = generateCsvContent(periodExpenses);
                    downloadCsv(`Export_${p.name.replace(/\s+/g, '_')}.csv`, csv);
                  }}
                  title="Exporter le tableau en CSV"
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  CSV
                </Button>

                {/* Clôture / Réouverture */}
                {!isClosed ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleClosePeriod(p)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    Clôturer (avec export)
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReopenPeriod(p)}
                    className="text-xs text-emerald-700"
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1" />
                    Rouvrir
                  </Button>
                )}

                {/* Purge */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPeriodToPurge(p)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  title="Purger définitivement la période"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de purge renforcée */}
      {periodToPurge && (
        <Dialog
          isOpen={true}
          onClose={() => setPeriodToPurge(null)}
          title="Confirmation renforcée : Purge de période"
          description={`Période : ${periodToPurge.name}`}
          className="max-w-md border-destructive/30"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-destructive/15 text-destructive rounded-2xl text-xs font-semibold flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Attention action irréversible :</strong> Toutes les dépenses et données de cette période seront définitivement supprimées.
                Un export de sauvegarde complet (CSV + ZIP des justificatifs) sera obligatoirement téléchargé avant suppression.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Tape <strong>PURGER</strong> en majuscules pour confirmer :
              </label>
              <Input
                type="text"
                placeholder="PURGER"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setPeriodToPurge(null)}>
                Annuler
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={purgeConfirmText.trim() !== 'PURGER'}
                isLoading={isPurging}
                onClick={handleExecutePurge}
              >
                Purger définitivement
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
