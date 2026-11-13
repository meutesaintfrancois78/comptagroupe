/**
 * Utilitaires de validation et de formatage des IBAN (International Bank Account Number).
 * Utilisé pour la collecte obligatoire du RIB à l'inscription et la vérification ISO 7064 Modulo 97.
 */

/** Longueurs officielles d'IBAN par code pays SEPA courant */
export const IBAN_COUNTRY_LENGTHS: Record<string, number> = {
  FR: 27, // France
  MC: 27, // Monaco
  BE: 16, // Belgique
  DE: 22, // Allemagne
  CH: 21, // Suisse
  LU: 20, // Luxembourg
  ES: 24, // Espagne
  IT: 27, // Italie
  NL: 18, // Pays-Bas
  PT: 25, // Portugal
  GB: 22, // Royaume-Uni
  IE: 22, // Irlande
  AT: 20, // Autriche
};

/**
 * Nettoie une chaîne IBAN brute : supprime tous les espaces, tirets et caractères non alphanumériques,
 * et passe en majuscules.
 */
export function cleanIban(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Formate un IBAN en blocs de 4 caractères séparés par des espaces (norme visuelle bancaire).
 * Ex: "FR7630006000011234567890189" -> "FR76 3000 6000 0112 3456 7890 189"
 */
export function formatIban(raw: string | null | undefined): string {
  const cleaned = cleanIban(raw);
  if (!cleaned) return '';
  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    chunks.push(cleaned.slice(i, i + 4));
  }
  return chunks.join(' ');
}

/**
 * Calcule le modulo 97 d'un très grand nombre représenté sous forme de chaîne numérique.
 */
function modulo97(numericString: string): number {
  if (typeof BigInt !== 'undefined') {
    try {
      return Number(BigInt(numericString) % 97n);
    } catch {
      // Fallback par découpage ci-dessous si BigInt échoue
    }
  }

  // Découpage par blocs de 7 chiffres pour éviter tout débordement en Number standard
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = String(remainder) + numericString.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder;
}

/**
 * Vérifie si une chaîne est un IBAN valide selon la norme ISO 7064 Modulo 97 (MOD 97-10).
 */
export function isValidIban(raw: string | null | undefined): boolean {
  const cleaned = cleanIban(raw);
  if (!cleaned || cleaned.length < 15 || cleaned.length > 34) {
    return false;
  }

  // Doit commencer par 2 lettres majuscules puis 2 chiffres
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) {
    return false;
  }

  // Vérification de la longueur spécifique au pays si connue
  const countryCode = cleaned.slice(0, 2);
  const expectedLength = IBAN_COUNTRY_LENGTHS[countryCode];
  if (expectedLength && cleaned.length !== expectedLength) {
    return false;
  }

  // Réorganisation ISO 7064 : déplace les 4 premiers caractères à la fin
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

  // Remplace chaque lettre par sa valeur numérique (A = 10, B = 11, ..., Z = 35)
  const numericString = rearranged.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString()
  );

  // Le modulo 97 doit être égal à 1
  return modulo97(numericString) === 1;
}

/**
 * Renvoie une erreur explicite en français si l'IBAN est invalide, ou null s'il est valide.
 */
export function getIbanValidationError(raw: string | null | undefined): string | null {
  const cleaned = cleanIban(raw);
  if (!cleaned) {
    return "L'IBAN (RIB) est obligatoire pour les virements de remboursement.";
  }

  if (cleaned.length < 4) {
    return "L'IBAN est trop court. Il doit commencer par le code pays (ex: FR).";
  }

  if (!/^[A-Z]{2}/.test(cleaned)) {
    return "L'IBAN doit commencer par le code pays à 2 lettres (ex: FR).";
  }

  if (!/^[A-Z]{2}[0-9]{2}/.test(cleaned)) {
    return "Les 3ᵉ et 4ᵉ caractères de l'IBAN doivent être les 2 chiffres de contrôle.";
  }

  const countryCode = cleaned.slice(0, 2);
  const expectedLength = IBAN_COUNTRY_LENGTHS[countryCode];

  if (expectedLength) {
    if (cleaned.length < expectedLength) {
      const missing = expectedLength - cleaned.length;
      return `IBAN incomplet : il manque ${missing} caractère${missing > 1 ? 's' : ''} (${countryCode} = ${expectedLength} caractères).`;
    }
    if (cleaned.length > expectedLength) {
      return `IBAN trop long : un IBAN ${countryCode} compte exactement ${expectedLength} caractères.`;
    }
  } else {
    if (cleaned.length < 15 || cleaned.length > 34) {
      return "Longueur d'IBAN invalide (doit comporter entre 15 et 34 caractères).";
    }
  }

  if (!isValidIban(cleaned)) {
    return "Clé de contrôle IBAN invalide. Vérifie la saisie de ton RIB.";
  }

  return null;
}
