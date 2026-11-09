import JSZip from 'jszip';
import { Expense } from '@/types/database';
import { normalizeReceiptFileName } from './exportCsv';

/** Bilan du ZIP : combien de justificatifs ont vraiment été mis dans l'archive */
export interface ReceiptsZipReport {
  /** Nombre de dépenses traitées */
  total: number;
  /** Nombre de justificatifs réellement inclus (fichier téléchargé) */
  included: number;
  /** Chemins des justificatifs existants remplacés par un .txt (absents de l'archive) */
  missing: string[];
}

export async function generateAndDownloadReceiptsZip(
  expenses: Expense[],
  archiveName: string = 'Justificatifs_Compta_Groupe_Saint_Martin.zip'
): Promise<ReceiptsZipReport> {
  const zip = new JSZip();
  const missing: string[] = [];
  let included = 0;

  for (const exp of expenses) {
    const proofPath = exp.proof_path || '';
    const ext = proofPath.endsWith('.pdf') ? 'pdf' : 'jpg';
    const filename = normalizeReceiptFileName(exp, ext);

    try {
      if (exp.signed_proof_url) {
        const response = await fetch(exp.signed_proof_url);
        if (response.ok) {
          const blob = await response.blob();
          zip.file(filename, blob);
          included += 1;
        } else {
          missing.push(proofPath || exp.id);
          zip.file(
            filename + '.txt',
            `Fichier non disponible au téléchargement direct (${proofPath})`
          );
        }
      } else {
        // Sans fichier rattaché, rien ne manque ; sinon le lien signé n'a pas pu être obtenu
        if (proofPath) missing.push(proofPath);
        zip.file(
          filename + '.txt',
          `Justificatif pour la dépense du ${exp.date} (${exp.amount} € - ${exp.unit?.name})`
        );
      }
    } catch {
      missing.push(proofPath || exp.id);
      zip.file(
        filename + '.txt',
        `Erreur réseau lors de la récupération du fichier (${proofPath})`
      );
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', archiveName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { total: expenses.length, included, missing };
}
