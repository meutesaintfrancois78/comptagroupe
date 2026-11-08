import JSZip from 'jszip';
import { Expense } from '@/types/database';
import { normalizeReceiptFileName } from './exportCsv';

export async function generateAndDownloadReceiptsZip(
  expenses: Expense[],
  archiveName: string = 'Justificatifs_Compta_ENF.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const exp of expenses) {
    const ext = exp.proof_path.endsWith('.pdf') ? 'pdf' : 'jpg';
    const filename = normalizeReceiptFileName(exp, ext);

    try {
      if (exp.signed_proof_url) {
        const response = await fetch(exp.signed_proof_url);
        if (response.ok) {
          const blob = await response.blob();
          zip.file(filename, blob);
        } else {
          zip.file(
            filename + '.txt',
            `Fichier non disponible au téléchargement direct (${exp.proof_path})`
          );
        }
      } else {
        zip.file(
          filename + '.txt',
          `Justificatif pour la dépense du ${exp.date} (${exp.amount} € - ${exp.unit?.name})`
        );
      }
    } catch {
      zip.file(
        filename + '.txt',
        `Erreur réseau lors de la récupération du fichier (${exp.proof_path})`
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
}
