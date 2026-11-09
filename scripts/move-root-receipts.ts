/**
 * Range les justificatifs déposés à la racine du bucket « receipts » dans le dossier de leur unité
 * (<unit_id>/<fichier>), puis met à jour expenses.proof_path.
 *
 * Nécessaire après la migration 20261109000001 : le stockage est cloisonné par unité, et un fichier
 * à la racine n'est plus visible que des admins.
 *
 * Par défaut le script n'écrit rien (simulation). Ajouter --apply pour exécuter.
 *
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npx --yes bun@1 run scripts/move-root-receipts.ts
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npx --yes bun@1 run scripts/move-root-receipts.ts --apply
 *
 * La clé service_role contourne la RLS : ne jamais la committer ni la mettre dans une variable VITE_.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');

if (!url || !serviceKey) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont obligatoires.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('id, unit_id, proof_path')
    .not('proof_path', 'like', '%/%');

  if (error) throw error;
  if (!expenses || expenses.length === 0) {
    console.log('✅ Aucun justificatif à la racine du bucket : rien à faire.');
    return;
  }

  console.log(`${apply ? '🚚' : '🔎 Simulation :'} ${expenses.length} dépense(s) à ranger.`);
  const copiedFrom = new Set<string>();
  let failures = 0;

  for (const exp of expenses) {
    const from = exp.proof_path as string;
    const to = `${exp.unit_id}/${from}`;
    console.log(`  ${from}  →  ${to}`);
    if (!apply) continue;

    // Copie plutôt que déplacement : un même fichier peut servir à plusieurs dépenses
    const { error: copyError } = await supabase.storage.from('receipts').copy(from, to);
    if (copyError && !/exists/i.test(copyError.message)) {
      console.error(`    ❌ copie impossible : ${copyError.message}`);
      failures++;
      continue;
    }
    const { error: updateError } = await supabase.from('expenses').update({ proof_path: to }).eq('id', exp.id);
    if (updateError) {
      console.error(`    ❌ mise à jour de la dépense impossible : ${updateError.message}`);
      failures++;
      continue;
    }
    copiedFrom.add(from);
  }

  if (!apply) {
    console.log('\nRelancer avec --apply pour exécuter.');
    return;
  }

  // Les originaux ne sont supprimés que s'il ne reste aucune dépense qui pointe dessus
  const { data: remaining } = await supabase.from('expenses').select('proof_path').in('proof_path', [...copiedFrom]);
  const stillUsed = new Set((remaining || []).map((r) => r.proof_path));
  const toRemove = [...copiedFrom].filter((p) => !stillUsed.has(p));
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase.storage.from('receipts').remove(toRemove);
    if (removeError) console.error(`⚠️ Originaux non supprimés : ${removeError.message}`);
    else console.log(`🧹 ${toRemove.length} original(aux) supprimé(s) de la racine.`);
  }

  console.log(failures === 0 ? '✅ Terminé.' : `⚠️ Terminé avec ${failures} erreur(s) : relancer le script, il ne traite que ce qui reste.`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error('❌', err?.message || err);
  process.exit(1);
});
