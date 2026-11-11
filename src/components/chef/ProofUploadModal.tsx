import React, { useState, useEffect } from 'react';
import { Camera, FileText, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/feedback';
import { Expense } from '@/types/database';
import { formatCurrency, formatDateFr } from '@/lib/utils';
import { processProofFile, ProcessedProof } from '@/lib/compression';
import { supabase } from '@/lib/supabase';
import { expenseMotif } from './ExpenseList';

interface ProofUploadModalProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProofUploadModal: React.FC<ProofUploadModalProps> = ({
  isOpen,
  expense,
  onClose,
  onSuccess,
}) => {
  const [proof, setProof] = useState<ProcessedProof | null>(null);
  const [proofName, setProofName] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setProof(null);
      setProofName('');
      setErrorMsg(null);
      setIsCompressing(false);
      setIsUploading(false);
    }
  }, [isOpen]);

  if (!isOpen || !expense) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setIsCompressing(true);
    try {
      const processed = await processProofFile(file);
      setProof(processed);
      setProofName(file.name);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du traitement du fichier.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!proof) {
      setErrorMsg('Veuillez sélectionner un ticket ou une facture.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const ext = proof.isPdf ? 'pdf' : 'jpg';
      const unitName = (expense.unit?.name || 'Unite').replace(/\s+/g, '-');
      const fileName = `${Date.now()}_${unitName}_${expense.amount}EUR.${ext}`;
      const filePath = `${expense.unit_id}/${fileName}`;

      // 1. Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, proof.file);
      if (uploadError) {
        throw new Error(`Échec de l'envoi du justificatif : ${uploadError.message}`);
      }

      // 2. Mise à jour de la dépense
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ proof_path: filePath })
        .eq('id', expense.id);

      if (updateError) {
        throw new Error(`Échec de la mise à jour de la dépense : ${updateError.message}`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-proof-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="relative flex w-full max-w-md flex-col gap-4 rounded-3xl border-2.5 border-line bg-surface p-6 shadow-pop-lg max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="upload-proof-title" className="text-[20px] font-extrabold text-ink leading-tight">
              Ajouter le ticket manquant
            </h2>
            <p className="text-[13px] font-semibold text-muted pt-0.5">
              Régularise cette dépense pour débloquer son remboursement
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-line bg-surface text-ink hover:bg-surface2"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Rappel dépense */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-line bg-surface2/60 p-3.5">
          <div className="min-w-0">
            <span className="block text-[15px] font-extrabold text-ink truncate">
              {expenseMotif(expense)}
            </span>
            <span className="block text-[13px] font-semibold text-muted">
              {formatDateFr(expense.date)}
            </span>
          </div>
          <span className="text-[18px] font-extrabold text-ink shrink-0">
            {formatCurrency(expense.amount)}
          </span>
        </div>

        {/* Sélection fichier */}
        {proof ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line bg-surface p-4">
            <div className="flex h-32 w-28 items-center justify-center overflow-hidden rounded-lg border-2 border-line bg-white">
              {proof.isPdf ? (
                <div className="flex flex-col items-center gap-1 text-on-color">
                  <FileText className="h-10 w-10" />
                  <span className="text-[11px] font-bold">PDF</span>
                </div>
              ) : (
                <img src={proof.previewUrl} alt="Aperçu ticket" className="h-full w-full object-contain" />
              )}
            </div>
            <span className="text-[13px] font-extrabold text-ink truncate max-w-full">
              {proofName}
            </span>
            <label className="cursor-pointer text-[13px] font-extrabold text-blue hover:underline">
              Changer de fichier
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <label
            className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2.5 border-dashed border-line bg-surface p-4 text-center hover:bg-surface2 ${
              isCompressing ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue text-on-color border-2 border-on-color">
              <Camera className="h-6 w-6" />
            </span>
            <div>
              <span className="block text-[15px] font-extrabold text-ink">
                Prendre une photo ou choisir un fichier
              </span>
              <span className="block text-[12px] font-semibold text-muted">
                Ticket, facturette ou reçu (Photo ou PDF)
              </span>
            </div>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              disabled={isCompressing}
              onChange={handleFileChange}
            />
          </label>
        )}

        {isCompressing && (
          <p className="text-center text-[13px] font-bold text-muted animate-pulse">
            Traitement de l'image…
          </p>
        )}

        {errorMsg && (
          <Banner tone="error" className="text-[13px]">
            {errorMsg}
          </Banner>
        )}

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="neutral" onClick={onClose} disabled={isUploading}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleUploadSubmit}
            isLoading={isUploading}
            disabled={!proof || isCompressing}
            className="flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};
