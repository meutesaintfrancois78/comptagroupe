import { supabase } from './supabase';
import { Expense } from '@/types/database';

/**
 * Attaches signed URLs for private receipts in Supabase Storage.
 * Uses batch createSignedUrls to minimize network roundtrips.
 */
export async function attachSignedUrls(expenses: Expense[]): Promise<Expense[]> {
  if (!expenses || expenses.length === 0) return [];

  // Filter paths that need a signed URL
  const pathsToSign = Array.from(
    new Set(
      expenses
        .filter((e) => e.proof_path && !e.proof_path.startsWith('http') && !e.proof_path.startsWith('data:'))
        .map((e) => e.proof_path)
    )
  );

  if (pathsToSign.length === 0) {
    return expenses;
  }

  try {
    const { data, error } = await supabase.storage.from('receipts').createSignedUrls(pathsToSign, 3600);

    if (error || !data) {
      console.warn('Erreur lors de la génération des URLs signées:', error?.message);
      return expenses;
    }

    const urlMap = new Map<string, string>();
    for (const item of data) {
      if (item.path && item.signedUrl && !item.error) {
        urlMap.set(item.path, item.signedUrl);
      }
    }

    return expenses.map((exp) => {
      const signed = urlMap.get(exp.proof_path);
      if (signed) {
        return { ...exp, signed_proof_url: signed };
      }
      return exp;
    });
  } catch (err) {
    console.warn('Exception génération URLs signées:', err);
    return expenses;
  }
}
