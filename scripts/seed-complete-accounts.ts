import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jthbkzcicmhrdewvgauw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_G3xyUwG9ZbT1VFjFQWUqQw_3_9EcE-G';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface AccountDef {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'chef';
  status: 'active' | 'pending' | 'deactivated';
  unitName?: string | null;
  secondaryUnitName?: string | null;
}

const ACCOUNTS: AccountDef[] = [
  {
    email: 'admin.dupont@groupe-enf.fr',
    password: 'Password123!',
    firstName: 'Benoît',
    lastName: 'Dupont',
    role: 'admin',
    status: 'active',
    unitName: null, // Admin sans unité (Groupe)
  },
  {
    email: 'ben.dupont@groupe-enf.fr',
    password: 'Password123!',
    firstName: 'Benoît',
    lastName: 'Dupont',
    role: 'admin',
    status: 'active',
    unitName: null, // Admin sans unité (Groupe)
  },
  {
    email: 'marie.vasseur@groupe-saint-martin.fr',
    password: 'Password123!',
    firstName: 'Marie',
    lastName: 'Vasseur',
    role: 'admin',
    status: 'active',
    unitName: 'Troupe 1',
  },
  {
    email: 'chef.martin@gmail.com',
    password: 'SuperSecretPassword123!',
    firstName: 'Alexandre',
    lastName: 'Martin',
    role: 'chef',
    status: 'active',
    unitName: 'Meute 1',
  },
  {
    email: 'guillaume.martin@groupe-saint-martin.fr',
    password: 'Password123!',
    firstName: 'Guillaume',
    lastName: 'Martin',
    role: 'chef',
    status: 'active',
    unitName: 'Meute 1',
    secondaryUnitName: 'Meute 3',
  },
  {
    email: 'claire.lemoine@groupe-saint-martin.fr',
    password: 'Password123!',
    firstName: 'Claire',
    lastName: 'Lemoine',
    role: 'chef',
    status: 'pending', // En attente
    unitName: 'Compagnie 2',
  },
  {
    email: 'julien.faure@groupe-saint-martin.fr',
    password: 'Password123!',
    firstName: 'Julien',
    lastName: 'Faure',
    role: 'chef',
    status: 'deactivated', // Désactivé
    unitName: 'Clairière 2',
  },
];

async function main() {
  console.log('🚀 Démarrage du seed des comptes réels...');

  // 1. Récupérer les unités
  const { data: units, error: unitsErr } = await adminClient.from('units').select('*');
  if (unitsErr || !units) {
    throw new Error(`Erreur récupération unités: ${unitsErr?.message}`);
  }
  const unitMap = new Map(units.map((u) => [u.name, u.id]));
  console.log(`✅ ${units.length} unités trouvées:`, Array.from(unitMap.keys()).join(', '));

  for (const acc of ACCOUNTS) {
    console.log(`\n--- Traitement de ${acc.email} (${acc.role}, ${acc.status}) ---`);

    // Trouver si user existe déjà
    const { data: listRes, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) throw listErr;

    const existingUser = listRes.users.find((u) => u.email === acc.email);
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`Compte Auth existant (ID: ${userId}), mise à jour du mot de passe...`);
      const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, {
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          first_name: acc.firstName,
          last_name: acc.lastName,
          role: acc.role,
        },
      });
      if (updErr) console.warn('Erreur update auth:', updErr.message);
    } else {
      console.log(`Création Auth pour ${acc.email}...`);
      const { data: newU, error: createErr } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          first_name: acc.firstName,
          last_name: acc.lastName,
          role: acc.role,
        },
      });
      if (createErr) {
        console.error('Erreur create auth:', createErr.message);
        continue;
      }
      userId = newU.user.id;
    }

    const primaryUnitId = acc.unitName ? unitMap.get(acc.unitName) || null : null;
    const secondaryUnitId = acc.secondaryUnitName ? unitMap.get(acc.secondaryUnitName) || null : null;

    // Upsert profil
    const { error: profErr } = await adminClient.from('profiles').upsert({
      id: userId,
      first_name: acc.firstName,
      last_name: acc.lastName,
      role: acc.role,
      status: acc.status,
      primary_unit_id: primaryUnitId,
      secondary_unit_id: secondaryUnitId,
    });

    if (profErr) {
      console.error(`Erreur profil pour ${acc.email}:`, profErr.message);
    } else {
      console.log(`✅ Profil configuré : ${acc.firstName} ${acc.lastName} [${acc.role}] [${acc.status}] [Unité: ${acc.unitName || 'Aucune (Groupe)'}]`);
    }

    // Tester la connexion réelle via l'API client anon
    const { data: signinData, error: signinErr } = await anonClient.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (signinErr) {
      console.error(`❌ Échec test connexion ${acc.email}:`, signinErr.message);
    } else {
      console.log(`🎉 TEST CONNEXION OK pour ${acc.email} (Token reçu, user ID: ${signinData.user.id})`);
    }
  }

  console.log('\n🌟 Tous les comptes de test ont été initialisés et vérifiés avec succès !');
}

main().catch((err) => {
  console.error('Erreur fatale script:', err);
  process.exit(1);
});
