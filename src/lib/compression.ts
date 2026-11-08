import imageCompression from 'browser-image-compression';

export interface ProcessedProof {
  file: File | Blob;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  isPdf: boolean;
}

export const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
export const TARGET_IMAGE_MAX_SIZE_MB = 1.0; // 1 Mo

export async function processProofFile(file: File): Promise<ProcessedProof> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    if (file.size > MAX_PDF_SIZE_BYTES) {
      throw new Error('Le fichier PDF dépasse la taille maximale autorisée de 5 Mo.');
    }
    return {
      file,
      previewUrl: '', // Pas de prévisualisation directe pour PDF
      originalSize: file.size,
      compressedSize: file.size,
      isPdf: true,
    };
  }

  // Vérifier format image
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    throw new Error('Format de justificatif invalide. Formats acceptés : Photos (JPG, PNG, WebP) et PDF.');
  }

  // Si l'image fait déjà moins de 1 Mo, compression légère
  const options = {
    maxSizeMB: TARGET_IMAGE_MAX_SIZE_MB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const previewUrl = URL.createObjectURL(compressedBlob);

    return {
      file: compressedBlob,
      previewUrl,
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      isPdf: false,
    };
  } catch (err) {
    console.warn('Erreur compression image, utilisation du fichier d’origine :', err);
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      originalSize: file.size,
      compressedSize: file.size,
      isPdf: false,
    };
  }
}
