import fs from 'fs';
import path from 'path';

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jthbkzcicmhrdewvgauw';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Erreur : Veuillez définir la variable d\'environnement SUPABASE_ACCESS_TOKEN.');
  process.exit(1);
}

async function executeSql(query: string): Promise<any> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  console.log('🚀 Application de la migration 20261109000004_justificatif_differe.sql...');
  const migrationPath = path.resolve('supabase/migrations/20261109000004_justificatif_differe.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const result = await executeSql(sql);
  console.log('✅ Résultat migration:', result);

  // Vérifications
  console.log('\n🔍 Contrôle post-migration...');
  const checkProofPath = await executeSql(
    "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='proof_path';"
  );
  console.log('1. Colonne proof_path:', checkProofPath);

  const checkDefaultBudget = await executeSql(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='units' AND column_name='default_budget';"
  );
  console.log('2. Colonne default_budget sur units:', checkDefaultBudget);

  const checkTrigger = await executeSql(
    "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='protect_expense_updates';"
  );
  console.log('3. Trigger protect_expense_updates à jour ?', checkTrigger[0]?.pg_get_functiondef?.includes('ticket ou facture'));

  console.log('\n🎉 Migration 20261109000004 appliquée avec succès sur la base Supabase !');
}

main().catch((err) => {
  console.error('❌ Erreur lors de la migration:', err);
  process.exit(1);
});
