import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  FileText,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Profile, Unit, Period, ExpenseCategory, PaymentMethod } from '@/types/database';
import { parseAmount, formatCurrency, formatDateFr } from '@/lib/utils';
import { processProofFile, ProcessedProof } from '@/lib/compression';
import { supabase } from '@/lib/supabase';

interface ExpenseMultiStepFormProps {
  profile: Profile;
  unit: Unit;
  activePeriod: Period;
  categories: ExpenseCategory[];
  isOnline: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const DRAFT_STORAGE_KEY = 'saint_martin_expense_draft';
const LAST_MOTIF_KEY = 'saint_martin_last_motif';

export const ExpenseMultiStepForm: React.FC<ExpenseMultiStepFormProps> = ({
  profile,
  unit,
  activePeriod,
  categories,
  isOnline,
  onSuccess,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('unit_money');
  const [proof, setProof] = useState<ProcessedProof | null>(null);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState<string>('');

  // UI state
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Charger le brouillon s'il existe
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.amount) setAmountInput(parsed.amount);
        if (parsed.categoryId) setCategoryId(parsed.categoryId);
        if (parsed.customCategory) setCustomCategory(parsed.customCategory);
        if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
        if (parsed.date) setDate(parsed.date);
        if (parsed.comment) setComment(parsed.comment);
      } else if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id);
      }
    } catch {}
  }, [categories]);

  // Sauvegarder automatiquement le brouillon en local à chaque changement
  useEffect(() => {
    if (!isSubmitted) {
      const draft = {
        amount: amountInput,
        categoryId,
        customCategory,
        paymentMethod,
        date,
        comment,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [amountInput, categoryId, customCategory, paymentMethod, date, comment, isSubmitted]);

  // Détecter si la catégorie sélectionnée est "Autre"
  const selectedCatObj = categories.find((c) => c.id === categoryId);
  const isAutre = selectedCatObj?.name.toLowerCase() === 'autre';

  // Bouton "Dernier motif"
  const handleApplyLastMotif = () => {
    try {
      const saved = localStorage.getItem(LAST_MOTIF_KEY);
      if (saved) {
        const { savedCatId, savedCustom } = JSON.parse(saved);
        if (categories.some((c) => c.id === savedCatId)) {
          setCategoryId(savedCatId);
          setCustomCategory(savedCustom || '');
        }
      }
    } catch {}
  };

  // Traitement du justificatif
  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsCompressing(true);
    try {
      const processed = await processProofFile(file);
      setProof(processed);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du traitement du justificatif.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Navigation entre étapes
  const handleNext = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      const parsed = parseAmount(amountInput);
      if (!parsed || parsed <= 0) {
        setErrorMsg('Veuillez saisir un montant valide supérieur à 0.');
        return;
      }
    }
    if (currentStep === 2) {
      if (!categoryId) {
        setErrorMsg('Veuillez sélectionner un motif de dépense.');
        return;
      }
      if (isAutre && !customCategory.trim()) {
        setErrorMsg('Veuillez préciser le motif dans le champ texte.');
        return;
      }
      // Sauvegarder dans le dernier motif
      localStorage.setItem(
        LAST_MOTIF_KEY,
        JSON.stringify({ savedCatId: categoryId, savedCustom: customCategory.trim() })
      );
    }
    if (currentStep === 4) {
      if (!proof) {
        setErrorMsg('Le justificatif (photo ou PDF) est obligatoire.');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Soumission finale de la dépense
  const handleSubmit = async () => {
    if (!isOnline) {
      setErrorMsg("Pas de connexion internet. L'envoi est bloqué, mais ton formulaire reste enregistré !");
      return;
    }
    const parsedAmount = parseAmount(amountInput);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Montant invalide.');
      return;
    }
    if (!proof) {
      setErrorMsg('Justificatif manquant.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Upload du justificatif
      const ext = proof.isPdf ? 'pdf' : 'jpg';
      const fileName = `${Date.now()}_${unit.name.replace(/\s+/g, '-')}_${parsedAmount}EUR.${ext}`;
      const filePath = `${unit.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, proof.file);

      if (uploadError) {
        throw new Error(
          `Impossible d'enregistrer le justificatif (${uploadError.message}). L'envoi est bloqué conformément à l'obligation comptable.`
        );
      }

      // 2. Insertion de la dépense
      const reimbursementStatus =
        paymentMethod === 'personal_money' ? 'pending' : 'not_applicable';

      const { error: insertError } = await supabase.from('expenses').insert({
        type: 'dépense',
        date,
        amount: parsedAmount,
        category_id: categoryId,
        custom_category: isAutre ? customCategory.trim() : null,
        payment_method: paymentMethod,
        proof_path: filePath,
        comment: comment.trim() || null,
        reimbursement_status: reimbursementStatus,
        unit_id: unit.id,
        created_by: profile.id,
        period_id: activePeriod.id,
      });

      if (insertError) {
        throw new Error(insertError.message || "Erreur lors de l'enregistrement de la dépense.");
      }

      // 3. Nettoyage du brouillon local
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de l'envoi.");
      setIsSubmitting(false);
    }
  };

  // Écran de succès après soumission (Étape 6)
  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto p-4 py-8 text-center animate-in zoom-in-95 duration-300">
        <MartyMascot
          expression="success"
          size="lg"
        />

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mt-2 mb-2">
          <CheckCircle className="w-4 h-4" />
          <span>Dépense enregistrée avec succès !</span>
        </div>

        <h2 className="text-2xl font-extrabold text-foreground mt-2">
          Super, c'est validé !
        </h2>

        <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
          Ta dépense de <strong>{formatCurrency(parseAmount(amountInput) || 0)}</strong> pour <strong>{unit.name}</strong> a bien été transmise aux trésoriers.
        </p>

        {paymentMethod === 'personal_money' && (
          <div className="my-4 p-3 rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium max-w-xs mx-auto">
            💰 Dépense avancée sur ton argent personnel : elle apparaîtra "À rembourser" pour les administrateurs.
          </div>
        )}

        <div className="mt-8 space-y-3 max-w-xs mx-auto">
          <Button
            size="lg"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={() => {
              setIsSubmitted(false);
              setCurrentStep(1);
              setAmountInput('');
              setProof(null);
              setComment('');
            }}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Déclarer une autre dépense
          </Button>

          <Button
            variant="outline"
            size="default"
            className="w-full"
            onClick={onSuccess}
          >
            Voir les dépenses de mon unité
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-12">
      {/* Barre de progression des 5 étapes */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
          <span>Étape {currentStep} sur 5</span>
          <span className="text-primary">
            {currentStep === 1 && '1. Montant'}
            {currentStep === 2 && '2. Motif'}
            {currentStep === 3 && '3. Mode de paiement'}
            {currentStep === 4 && '4. Justificatif'}
            {currentStep === 5 && '5. Récapitulatif'}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-destructive/15 text-destructive text-sm font-medium flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Étape 1 : Montant */}
      {currentStep === 1 && (
        <Card className="rounded-3xl border shadow-md">
          <CardContent className="p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Montant de la dépense
            </span>
            <div className="relative mt-4 flex items-center justify-center">
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                autoFocus
                aria-label="Montant de la dépense en euros"
                placeholder="0,00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full text-center text-4xl sm:text-5xl font-black bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/30"
              />
              <span className="text-3xl sm:text-4xl font-bold text-muted-foreground ml-1">
                €
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Points et virgules acceptés. Supérieur à 0 €.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Étape 2 : Motif de dépense */}
      {currentStep === 2 && (
        <Card className="rounded-3xl border shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Catégorie de dépense
              </span>
              <button
                type="button"
                onClick={handleApplyLastMotif}
                className="text-xs font-semibold text-primary hover:underline flex items-center"
              >
                <Clock className="w-3.5 h-3.5 mr-1" />
                Dernier motif
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`p-3.5 rounded-2xl text-left font-semibold text-sm transition-all border ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                        : 'border-input bg-card hover:bg-accent text-foreground'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {isAutre && (
              <div className="pt-2 animate-in fade-in">
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  Précisez le motif (obligatoire) :
                </label>
                <Input
                  type="text"
                  placeholder="Ex : Achat de bois pour table d'intendance"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Étape 3 : Mode de paiement */}
      {currentStep === 3 && (
        <Card className="rounded-3xl border shadow-md">
          <CardContent className="p-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Avec quel argent as-tu payé ?
            </span>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('unit_money')}
                className={`w-full p-4 rounded-2xl text-left border flex items-center justify-between transition-all ${
                  paymentMethod === 'unit_money'
                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary shadow-sm'
                    : 'border-input bg-card hover:bg-accent text-muted-foreground'
                }`}
              >
                <div>
                  <div className="font-bold text-base text-foreground">
                    Argent de l'unité (par défaut)
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Payé avec la carte de l'unité ou la caisse d'avance
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                  {paymentMethod === 'unit_money' && (
                    <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('personal_money')}
                className={`w-full p-4 rounded-2xl text-left border flex items-center justify-between transition-all ${
                  paymentMethod === 'personal_money'
                    ? 'border-amber-600 bg-amber-500/10 text-foreground ring-2 ring-amber-600 shadow-sm'
                    : 'border-input bg-card hover:bg-accent text-muted-foreground'
                }`}
              >
                <div>
                  <div className="font-bold text-base text-foreground">
                    Argent perso (à me rembourser)
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Tu as avancé tes propres deniers personnels
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-amber-600 flex items-center justify-center">
                  {paymentMethod === 'personal_money' && (
                    <div className="w-2.5 h-2.5 bg-amber-600 rounded-full" />
                  )}
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 4 : Justificatif obligatoire */}
      {currentStep === 4 && (
        <Card className="rounded-3xl border shadow-md">
          <CardContent className="p-6 space-y-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Justificatif obligatoire (Ticket ou Facture)
            </span>

            {proof ? (
              <div className="space-y-3 pt-2">
                <div className="relative mx-auto w-40 h-40 rounded-2xl overflow-hidden border shadow-inner bg-muted flex items-center justify-center">
                  {proof.isPdf ? (
                    <div className="flex flex-col items-center text-red-600">
                      <FileText className="w-16 h-16" />
                      <span className="text-xs font-bold mt-1">Fichier PDF</span>
                    </div>
                  ) : (
                    <img
                      src={proof.previewUrl}
                      alt="Aperçu justificatif"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Taille originale : {(proof.originalSize / 1024 / 1024).toFixed(2)} Mo
                  {!proof.isPdf && (
                    <span>
                      {' '}➔ compressé à{' '}
                      <strong className="text-foreground">
                        {(proof.compressedSize / 1024).toFixed(0)} Ko
                      </strong>
                    </span>
                  )}
                </div>

                <label className="inline-block cursor-pointer">
                  <span className="text-xs text-primary font-bold hover:underline">
                    Changer de justificatif
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={handleProofChange}
                  />
                </label>
              </div>
            ) : (
              <div className="py-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1 : Prendre une photo directe */}
                  <label className="cursor-pointer border-2 border-dashed border-primary/40 rounded-2xl p-5 hover:bg-accent transition-colors flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-foreground">Prendre une photo</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">Appareil photo direct</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleProofChange}
                    />
                  </label>

                  {/* Option 2 : Choisir un fichier / PDF / Galerie */}
                  <label className="cursor-pointer border-2 border-dashed border-muted-foreground/30 rounded-2xl p-5 hover:bg-accent transition-colors flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center mb-2">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-foreground">Choisir un fichier</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">Galerie photo ou PDF</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleProofChange}
                    />
                  </label>
                </div>

                {isCompressing && (
                  <p className="text-xs text-primary font-semibold mt-3 animate-pulse">
                    Compression automatique de l'image en cours...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Étape 5 : Récapitulatif et validation */}
      {currentStep === 5 && (
        <Card className="rounded-3xl border shadow-md">
          <CardContent className="p-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Récapitulatif avant validation
            </span>

            <div className="bg-muted/50 rounded-2xl p-4 space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Chef déclarant :</span>
                <span className="font-bold text-foreground">
                  {profile.first_name} {profile.last_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Unité :</span>
                <span className="font-semibold text-foreground">{unit.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Montant :</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(parseAmount(amountInput) || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Motif :</span>
                <span className="font-semibold text-foreground">
                  {isAutre ? `Autre (${customCategory})` : selectedCatObj?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Paiement :</span>
                <Badge
                  variant={paymentMethod === 'personal_money' ? 'warning' : 'secondary'}
                >
                  {paymentMethod === 'personal_money' ? 'Argent perso' : "Argent de l'unité"}
                </Badge>
              </div>
            </div>

            {/* Date modifiable */}
            <div>
              <label htmlFor="expense-date" className="block text-xs font-bold text-muted-foreground mb-1">
                Date de la dépense :
              </label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                min={activePeriod?.start_date || '2026-09-01'}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="font-medium"
              />
            </div>

            {/* Commentaire facultatif n'apparaît qu'à cette étape */}
            <div>
              <label htmlFor="expense-comment" className="block text-xs font-bold text-muted-foreground mb-1">
                Commentaire facultatif :
              </label>
              <Input
                id="expense-comment"
                type="text"
                maxLength={300}
                placeholder="Ex : Remplace le matériel cassé au dernier jeu"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boutons de navigation (Suivant / Précédent / Valider) */}
      <div className="mt-6 flex items-center justify-between space-x-3">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onCancel}
            className="flex-1 text-muted-foreground"
          >
            Annuler
          </Button>
        )}

        {currentStep < 5 ? (
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handleNext}
            className="flex-1"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
          >
            Valider et envoyer
          </Button>
        )}
      </div>
    </div>
  );
};
