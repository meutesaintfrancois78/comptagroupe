import React, { useState, useEffect } from 'react';
import { Camera, Check, CreditCard, FileText, History, Wallet } from 'lucide-react';
import { MartyMascot } from '@/components/shared/MartyMascot';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Banner, StepProgress } from '@/components/ui/feedback';
import { Profile, Unit, Period, ExpenseCategory, PaymentMethod } from '@/types/database';
import { cn, parseAmount, formatCurrency, amountError, expenseDateError, todayLocal } from '@/lib/utils';
import { processProofFile, ProcessedProof } from '@/lib/compression';
import { supabase } from '@/lib/supabase';
import { categoryIcon } from './ExpenseList';
import { getChefProofStorageKey, calculateDismissUntil } from '@/lib/bannerTimer';

interface ExpenseMultiStepFormProps {
  profile: Profile;
  unit: Unit;
  activePeriod: Period;
  categories: ExpenseCategory[];
  isOnline: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  /** Appelé dès que la dépense est enregistrée (pour rafraîchir les données en arrière-plan) */
  onSubmitted?: () => void;
}

const DRAFT_STORAGE_KEY = 'saint_martin_expense_draft';
const LAST_MOTIF_KEY = 'saint_martin_last_motif';

const STEP_NAMES = ['Montant', 'Motif', 'Paiement', 'Justificatif', 'Récapitulatif'];

/** « 3,2 Mo » ou « 284 Ko » */
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function readLastMotif(): { savedCatId: string; savedCustom: string } | null {
  try {
    const saved = localStorage.getItem(LAST_MOTIF_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/** Boutons Retour / Suivant en bas de chaque étape */
const StepNav: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
  <div
    className={cn(
      'grid gap-3',
      wide ? 'grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : 'grid-cols-[repeat(2,minmax(0,1fr))]'
    )}
  >
    {children}
  </div>
);

const navBtn = 'min-h-[54px] px-3';

export const ExpenseMultiStepForm: React.FC<ExpenseMultiStepFormProps> = ({
  profile,
  unit,
  activePeriod,
  categories,
  isOnline,
  onSuccess,
  onCancel,
  onSubmitted,
}) => {
  // Catégories actives seulement, « Autre » toujours en dernier comme dans la maquette
  const activeCategories = categories.filter((c) => c.is_active !== false);
  const orderedCategories = [
    ...activeCategories.filter((c) => c.name !== 'Autre'),
    ...activeCategories.filter((c) => c.name === 'Autre'),
  ];
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('unit_money');
  const [proof, setProof] = useState<ProcessedProof | null>(null);
  const [proofName, setProofName] = useState<string>('');
  const [skipProof, setSkipProof] = useState<boolean>(false);
  const [date, setDate] = useState<string>(() => todayLocal());
  const [comment, setComment] = useState<string>('');

  // UI state
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [lastMotif] = useState(readLastMotif);

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
      } else if (orderedCategories.length > 0 && !categoryId) {
        setCategoryId(orderedCategories[0].id);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {}
    }
  }, [amountInput, categoryId, customCategory, paymentMethod, date, comment, isSubmitted]);

  // « Annuler » abandonne la dépense : le brouillon ne sert qu'en cas de coupure, pas après une annulation
  const handleCancel = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    onCancel();
  };

  // Détecter si la catégorie sélectionnée est "Autre"
  const selectedCatObj = categories.find((c) => c.id === categoryId);
  const isAutre = selectedCatObj?.name.toLowerCase() === 'autre';

  // Bouton « Dernier motif »
  const lastMotifCat = lastMotif ? activeCategories.find((c) => c.id === lastMotif.savedCatId) : undefined;
  const lastMotifLabel = lastMotifCat
    ? lastMotifCat.name.toLowerCase() === 'autre' && lastMotif?.savedCustom
      ? lastMotif.savedCustom
      : lastMotifCat.name
    : null;

  const handleApplyLastMotif = () => {
    if (lastMotif && lastMotifCat) {
      setCategoryId(lastMotif.savedCatId);
      setCustomCategory(lastMotif.savedCustom || '');
      setErrorMsg(null);
    }
  };

  // Traitement du justificatif
  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setIsCompressing(true);
    try {
      const processed = await processProofFile(file);
      setProof(processed);
      setProofName(file.name);
      setSkipProof(false);
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
      const amountMsg = amountError(amountInput);
      if (amountMsg) {
        setErrorMsg(amountMsg);
        return;
      }
    }
    if (currentStep === 2) {
      if (!categoryId) {
        setErrorMsg('Choisis un motif de dépense.');
        return;
      }
      if (isAutre && !customCategory.trim()) {
        setErrorMsg('Précise le motif dans le champ texte.');
        return;
      }
      // Sauvegarder dans le dernier motif
      try {
        localStorage.setItem(
          LAST_MOTIF_KEY,
          JSON.stringify({ savedCatId: categoryId, savedCustom: customCategory.trim() })
        );
      } catch {}
    }
    if (currentStep === 4) {
      if (!proof && !skipProof) {
        setErrorMsg("Ajoute un justificatif ou choisis de l'ajouter plus tard.");
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
      setErrorMsg(amountError(amountInput) || 'Montant invalide.');
      return;
    }
    const dateMsg = expenseDateError(date, activePeriod?.start_date);
    if (dateMsg) {
      setErrorMsg(dateMsg);
      return;
    }
    if (!proof && !skipProof) {
      setErrorMsg('Justificatif manquant. Ajoute un justificatif ou choisis le mode différé.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let filePath = '';

      // 1. Upload du justificatif s'il est fourni
      if (proof) {
        const ext = proof.isPdf ? 'pdf' : 'jpg';
        const fileName = `${Date.now()}_${unit.name.replace(/\s+/g, '-')}_${parsedAmount}EUR.${ext}`;
        filePath = `${unit.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, proof.file);

        if (uploadError) {
          throw new Error(
            `Impossible d'enregistrer le justificatif (${uploadError.message}). L'envoi est bloqué conformément à l'obligation comptable.`
          );
        }
      }

      // 2. Insertion de la dépense (proof_path = '' si différé)
      const reimbursementStatus = paymentMethod === 'personal_money' ? 'pending' : 'not_applicable';

      const { error: insertError } = await supabase.from('expenses').insert({
        type: 'dépense',
        date,
        amount: parsedAmount,
        category_id: categoryId,
        custom_category: isAutre ? customCategory.trim() : null,
        payment_method: paymentMethod,
        proof_path: filePath || '',
        comment: comment.trim() || null,
        reimbursement_status: reimbursementStatus,
        unit_id: unit.id,
        created_by: profile.id,
        period_id: activePeriod.id,
      });

      if (insertError) {
        throw new Error(insertError.message || "Erreur lors de l'enregistrement de la dépense.");
      }

      // 3. Si justificatif différé, enclencher le délai de grâce de 3 minutes pour le rappel
      if (skipProof) {
        try {
          localStorage.setItem(getChefProofStorageKey(unit.id), calculateDismissUntil().toString());
        } catch {}
      }

      // 4. Nettoyage du brouillon local
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      setIsSubmitted(true);
      setIsSubmitting(false);
      onSubmitted?.();
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de l'envoi.");
      setIsSubmitting(false);
    }
  };

  const amountLabel = formatCurrency(parseAmount(amountInput) || 0);
  const motifLabel = isAutre ? customCategory.trim() || 'Autre' : selectedCatObj?.name || '—';

  /* ---------------------------- Écran 15 : envoyée ---------------------------- */
  if (isSubmitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-[18px] px-1 py-6 text-center">
        <MartyMascot
          expression="success"
          size={132}
          circle="green"
          shadow={6}
          badge={
            <span aria-hidden="true" className="-mr-1 -mt-0.5 block text-[36px] leading-none">
              🎉
            </span>
          }
        />
        <h1 className="text-[32px] font-extrabold leading-[1.05]">Super, c'est validé !</h1>
        <p className="text-[17px] font-semibold leading-snug text-muted" role="status">
          Ta dépense de <strong className="text-success">{amountLabel}</strong> pour {unit.name} est bien envoyée.
        </p>
        <div className="mt-2 flex w-full flex-col gap-3">
          <Button
            variant="primary"
            className={navBtn}
            onClick={() => {
              setIsSubmitted(false);
              setCurrentStep(1);
              setAmountInput('');
              setProof(null);
              setProofName('');
              setComment('');
            }}
          >
            Déclarer une autre dépense
          </Button>
          <Button variant="secondary" className={cn(navBtn, 'shadow-none')} onClick={onSuccess}>
            Voir les dépenses de mon unité
          </Button>
        </div>
      </div>
    );
  }

  const errorBanner = errorMsg ? <Banner tone="error">{errorMsg}</Banner> : null;

  /* ------------------------------ Étapes 1 à 5 ------------------------------ */
  return (
    <div className="flex flex-1 flex-col gap-4">
      <StepProgress step={currentStep} total={5} name={STEP_NAMES[currentStep - 1]} />

      {/* Étape 1 : Montant */}
      {currentStep === 1 && (
        <>
          <div className="flex flex-1 flex-col justify-center gap-3.5">
            <div className="flex flex-col items-center gap-3.5 rounded-3xl border-2.5 border-line bg-surface px-5 py-[30px] shadow-pop-lg">
              <label htmlFor="expense-amount" className="text-[17px] font-bold">
                Combien as-tu dépensé ?
              </label>
              <div className="flex min-w-0 max-w-full items-center justify-center gap-1 border-b-4 border-green px-1.5 pb-1">
                <input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  autoComplete="off"
                  aria-describedby="expense-amount-hint"
                  placeholder="0,00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNext();
                  }}
                  className="w-[220px] min-w-0 shrink bg-transparent p-0 text-right text-[52px] font-extrabold text-ink outline-none placeholder:text-muted/50 min-[360px]:text-[64px]"
                />
                <span aria-hidden="true" className="shrink-0 text-[44px] font-extrabold min-[360px]:text-[52px]">
                  €
                </span>
              </div>
              <span id="expense-amount-hint" className="text-center text-[14px] font-semibold text-muted">
                Points et virgules acceptés : 12,50 ou 12.50
              </span>
            </div>
            {errorBanner}
          </div>
          <StepNav>
            <Button variant="neutral" className={navBtn} onClick={handleCancel}>
              Annuler
            </Button>
            <Button variant="primary" className={navBtn} onClick={handleNext}>
              Suivant
            </Button>
          </StepNav>
        </>
      )}

      {/* Étape 2 : Motif */}
      {currentStep === 2 && (
        <>
          <div className="flex flex-1 flex-col gap-3.5">
            {lastMotifLabel && (
              <button
                type="button"
                onClick={handleApplyLastMotif}
                className="flex min-h-[44px] max-w-full items-center gap-2 self-start rounded-full border-2 border-line bg-surface2 px-3.5 py-1.5 text-left text-[14px] font-bold text-ink"
              >
                <History className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                <span className="min-w-0 break-words">Dernier motif : {lastMotifLabel}</span>
              </button>
            )}

            <div role="group" aria-label="Motif de la dépense" className="grid grid-cols-3 gap-2.5">
              {orderedCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                const Icon = categoryIcon(cat.name);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setCategoryId(cat.id);
                      setErrorMsg(null);
                    }}
                    className={cn(
                      'flex min-h-[104px] min-w-0 flex-col items-center justify-center gap-2 rounded-[18px] border-2.5 border-line px-1 py-2 text-center text-[14px] font-extrabold leading-tight transition-transform',
                      isSelected ? 'bg-green text-on-color shadow-pop' : 'bg-surface text-ink hover:bg-surface2'
                    )}
                  >
                    <Icon className="h-7 w-7 shrink-0" strokeWidth={2.2} aria-hidden="true" />
                    <span lang="fr" className="max-w-full hyphens-auto">{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {isAutre && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="expense-custom" className="text-[14px] font-bold">
                  Précisez le motif
                </label>
                <Input
                  id="expense-custom"
                  type="text"
                  placeholder="Ex : double des clés du local"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  autoFocus
                  className="min-h-[50px] rounded-[14px] font-medium"
                />
              </div>
            )}
            {errorBanner}
          </div>
          <StepNav>
            <Button variant="neutral" className={navBtn} onClick={handleBack}>
              Retour
            </Button>
            <Button variant="primary" className={navBtn} onClick={handleNext}>
              Suivant
            </Button>
          </StepNav>
        </>
      )}

      {/* Étape 3 : Mode de paiement */}
      {currentStep === 3 && (
        <>
          <div className="flex flex-1 flex-col gap-3.5">
            <h2 id="pay-question" className="text-[17px] font-bold">
              Avec quel argent as-tu payé ?
            </h2>
            <div role="group" aria-labelledby="pay-question" className="flex flex-col gap-3.5">
              {(
                [
                  {
                    id: 'unit_money',
                    title: "Argent de l'unité",
                    sub: "Payé avec la carte ou la caisse de l'unité",
                    Icon: CreditCard,
                    tile: 'bg-green',
                  },
                  {
                    id: 'personal_money',
                    title: 'Argent perso',
                    sub: "Tu as avancé l'argent : le groupe te rembourse",
                    Icon: Wallet,
                    tile: 'bg-blue',
                  },
                ] as const
              ).map(({ id, title, sub, Icon, tile }) => {
                const on = paymentMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      'flex min-h-[128px] items-center gap-4 rounded-[22px] border-2.5 border-line p-[18px] text-left',
                      on ? 'bg-green text-on-color shadow-pop-md' : 'bg-surface text-ink hover:bg-surface2'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2.5 border-on-color text-on-color',
                        on ? 'bg-white' : tile
                      )}
                    >
                      <Icon className="h-7 w-7" strokeWidth={2.2} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[20px] font-extrabold leading-tight">{title}</span>
                      <span className="text-[14px] font-semibold leading-snug">{sub}</span>
                    </span>
                    {on && (
                      <span
                        aria-hidden="true"
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-on-color bg-white text-on-color"
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {errorBanner}
          </div>
          <StepNav>
            <Button variant="neutral" className={navBtn} onClick={handleBack}>
              Retour
            </Button>
            <Button variant="primary" className={navBtn} onClick={handleNext}>
              Suivant
            </Button>
          </StepNav>
        </>
      )}

      {/* Étape 4 : Justificatif obligatoire ou différé */}
      {currentStep === 4 && (
        <>
          <div className="flex flex-1 flex-col gap-3.5">
            {proof ? (
              <div className="flex flex-col items-center gap-3.5 rounded-3xl border-2.5 border-line bg-surface p-[18px] shadow-pop-md">
                <div className="flex h-[200px] w-[150px] items-center justify-center overflow-hidden rounded-md border-2 border-on-color bg-white text-on-color">
                  {proof.isPdf ? (
                    <span className="flex flex-col items-center gap-1">
                      <FileText className="h-14 w-14" aria-hidden="true" />
                      <span className="text-[12px] font-extrabold">PDF</span>
                    </span>
                  ) : (
                    <img src={proof.previewUrl} alt="Aperçu du justificatif" className="h-full w-full object-contain" />
                  )}
                </div>
                <div className="flex max-w-full flex-col items-center gap-0.5 text-center">
                  <span className="max-w-full break-all text-[16px] font-extrabold">{proofName || 'Justificatif'}</span>
                  <span className="text-[14px] font-semibold text-muted">
                    {proof.isPdf || proof.compressedSize >= proof.originalSize
                      ? formatSize(proof.originalSize)
                      : `Compressé : ${formatSize(proof.originalSize)} → ${formatSize(proof.compressedSize)}`}
                  </span>
                </div>
                <label className="relative flex min-h-[48px] cursor-pointer items-center rounded-[14px] border-2.5 border-line bg-surface px-[18px] text-[15px] font-extrabold text-ink focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-link hover:bg-surface2">
                  Changer de justificatif
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    onChange={handleProofChange}
                  />
                </label>
              </div>
            ) : skipProof ? (
              <div className="flex flex-col items-center gap-3.5 rounded-3xl border-2.5 border-line bg-surface p-5 text-center shadow-pop-md">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-line bg-surface2 text-3xl">
                  ⏳
                </span>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[19px] font-extrabold text-ink">Justificatif différé</span>
                  <p className="text-[14px] font-semibold text-muted leading-snug">
                    Tu déclares cette dépense maintenant et tu pourras ajouter la photo de ton ticket plus tard depuis la liste.
                  </p>
                  <p className="text-[13px] font-bold text-red pt-1">
                    ⚠️ Rappel : aucun remboursement ne sera validé par l'intendance tant que le ticket n'est pas fourni.
                  </p>
                </div>
                <label className="relative mt-2 flex min-h-[46px] cursor-pointer items-center rounded-[14px] border-2.5 border-line bg-surface px-[18px] text-[14px] font-extrabold text-ink hover:bg-surface2">
                  📸 Prendre la photo maintenant
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    onChange={handleProofChange}
                  />
                </label>
              </div>
            ) : (
              <>
                <label
                  className={cn(
                    'relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-3.5 rounded-3xl border-3 border-dashed border-line bg-surface p-5 text-center text-ink focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-link min-[400px]:min-h-[280px]',
                    isCompressing && 'cursor-wait opacity-80'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-20 w-20 items-center justify-center rounded-full border-2.5 border-on-color bg-blue text-on-color"
                  >
                    <Camera className="h-[38px] w-[38px]" strokeWidth={2} />
                  </span>
                  <span className="max-w-[240px] text-[20px] font-extrabold leading-tight">
                    Prendre en photo ou choisir un fichier
                  </span>
                  <span className="text-[14px] font-semibold text-muted">Ticket, facture ou reçu · photo ou PDF</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    disabled={isCompressing}
                    onChange={handleProofChange}
                  />
                </label>
                <div className="flex flex-col items-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSkipProof(true);
                      setProof(null);
                      setProofName('');
                    }}
                    className="text-[14px] font-extrabold text-muted hover:text-ink underline decoration-line underline-offset-4 p-2 transition-colors"
                  >
                    Je n'ai pas le ticket sous la main (ajouter plus tard)
                  </button>
                </div>
              </>
            )}
            {isCompressing && (
              <p role="status" className="text-center text-[14px] font-bold text-muted">
                Compression de l'image en cours…
              </p>
            )}
            {errorBanner}
          </div>
          <StepNav>
            <Button variant="neutral" className={navBtn} onClick={handleBack}>
              Retour
            </Button>
            <Button variant="primary" className={navBtn} onClick={handleNext} disabled={isCompressing}>
              Suivant
            </Button>
          </StepNav>
        </>
      )}

      {/* Étape 5 : Récapitulatif et validation */}
      {currentStep === 5 && (
        <>
          <div className="flex flex-1 flex-col gap-3">
            {(!proof || skipProof) && (
              <Banner tone="warning" className="text-[14px] font-bold">
                ⚠️ Justificatif différé : pense à rajouter ton ticket depuis l'accueil pour pouvoir être remboursé.
              </Banner>
            )}

            <dl className="m-0 flex flex-col rounded-[22px] border-2.5 border-line bg-surface px-4 py-1.5 shadow-pop-md">
              {[
                { k: 'Chef', v: <span className="text-[16px] font-bold">{`${profile.first_name} ${profile.last_name}`.trim()}</span> },
                { k: 'Unité', v: <span className="text-[16px] font-bold">{unit.name}</span> },
                { k: 'Montant', v: <span className="whitespace-nowrap text-[24px] font-extrabold text-success min-[360px]:text-[28px]">{amountLabel}</span> },
                { k: 'Motif', v: <span className="text-[16px] font-bold">{motifLabel}</span> },
                {
                  k: 'Paiement',
                  v: (
                    <Badge variant={paymentMethod === 'personal_money' ? 'blue' : 'green'} className="text-[13px]">
                      {paymentMethod === 'personal_money' ? 'Argent perso' : "Argent de l'unité"}
                    </Badge>
                  ),
                },
                {
                  k: 'Justificatif',
                  v: proof ? (
                    <Badge variant="green" className="text-[13px] font-bold">
                      Fourni ({proofName || 'Photo'})
                    </Badge>
                  ) : (
                    <Badge variant="red" className="text-[13px] font-extrabold">
                      ⚠️ Manquant (différé)
                    </Badge>
                  ),
                },
              ].map((row, i) => (
                <div
                  key={row.k}
                  className={cn('flex items-center justify-between gap-3 py-2.5', i > 0 && 'border-t-2 border-divider')}
                >
                  <dt className="shrink-0 text-[14px] font-semibold text-muted">{row.k}</dt>
                  <dd className="m-0 min-w-0 break-words text-right">{row.v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-date" className="text-[14px] font-bold">
                Date de la dépense
              </label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                min={activePeriod?.start_date || '2026-09-01'}
                max={todayLocal()}
                onChange={(e) => setDate(e.target.value)}
                className="min-w-0 rounded-[14px] font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-comment" className="text-[14px] font-bold">
                Commentaire (facultatif)
              </label>
              <Textarea
                id="expense-comment"
                rows={2}
                maxLength={300}
                placeholder="Ex : courses pour le week-end des 14 et 15 novembre"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none rounded-[14px] font-medium"
              />
            </div>
            {errorBanner}
          </div>
          <StepNav wide>
            <Button variant="neutral" className={navBtn} onClick={handleBack} disabled={isSubmitting}>
              Retour
            </Button>
            <Button
              variant="primary"
              className={cn(navBtn, 'whitespace-normal leading-tight')}
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Valider et envoyer
            </Button>
          </StepNav>
        </>
      )}
    </div>
  );
};
