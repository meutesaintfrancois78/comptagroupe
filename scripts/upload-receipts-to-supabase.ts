import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Récupération des variables d'environnement (depuis .env.local ou variables système)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
  console.error('❌ Erreur : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadReceipts() {
  const receiptsDir = path.resolve(__dirname, '../public/mock-receipts');
  const files = fs.readdirSync(receiptsDir).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));

  console.log(`📤 Envoi de ${files.length} reçus réels vers Supabase Storage (bucket "receipts")...`);

  for (const filename of files) {
    const filePath = path.join(receiptsDir, filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Upload vers le bucket receipts
    const { error } = await supabase.storage
      .from('receipts')
      .upload(filename, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn(`⚠️ Erreur d'envoi pour ${filename}:`, error.message);
    } else {
      console.log(`✅ Fichier uploadé avec succès : ${filename}`);
    }
  }

  console.log('\n🎉 Tous les justificatifs ont été synchronisés avec Supabase Storage !');
}

uploadReceipts();
