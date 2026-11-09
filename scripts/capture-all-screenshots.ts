/**
 * Captures d'écran du README, prises sur l'appli en mode démo local (données d'exemple, aucune
 * connexion à Supabase, aucun mot de passe).
 *
 * 1. Lancer l'appli SANS variables Supabase (mode démo) :  npx vite --port 3300
 * 2. Dans un autre terminal :                                npx --yes bun@1 run scripts/capture-all-screenshots.ts
 *
 * Variables facultatives : BASE_URL (défaut http://localhost:3300), CHROME_PATH (défaut google-chrome).
 */
import puppeteer, { Page } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3300';
const CHROME_PATH =
  process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) =>
    fs.existsSync(p)
  );
const OUT_DIR = path.resolve('docs/screenshots');
const RECEIPT = path.resolve('public/mock-receipts/ticket-super-u-nourriture.jpg');

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1280, height: 800, deviceScaleFactor: 1 };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function clickText(page: Page, text: string, selector = 'button') {
  const ok = await page.evaluate(
    (t, sel) => {
      const el = [...document.querySelectorAll<HTMLElement>(sel)].find((b) => b.textContent?.replace(/\s+/g, ' ').trim().includes(t));
      el?.click();
      return Boolean(el);
    },
    text,
    selector
  );
  if (!ok) throw new Error(`Bouton introuvable : « ${text} »`);
  await wait(500);
}

async function shot(page: Page, name: string) {
  await wait(400);
  // La bannière « Installer l'appli » apparaît au bout de quelques secondes : on la ferme pour les captures
  await page.evaluate(() => {
    const dialog = [...document.querySelectorAll('[role="dialog"]')].find((d) => d.textContent?.includes('Installer Compta'));
    (dialog?.querySelector('[aria-label="Fermer"]') as HTMLElement | null)?.click();
  });
  await wait(300);
  await page.screenshot({ path: path.join(OUT_DIR, name) });
  console.log(`📸 ${name}`);
}

/** Repart d'une base de démo neuve, puis se connecte avec un raccourci de démo (Benoît, Guillaume, Claire…) */
async function loginAs(page: Page, demoLabel: string | null) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(800);
  // La démo démarre connectée en admin : on se déconnecte pour revenir à l'écran de connexion
  await page.evaluate(() => (document.querySelector('header [aria-label="Se déconnecter"]') as HTMLElement | null)?.click());
  await wait(800);
  if (demoLabel) {
    await clickText(page, demoLabel);
    await wait(1200);
  }
}

async function main() {
  if (!CHROME_PATH) throw new Error('Chrome introuvable : définir CHROME_PATH');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.png')).forEach((f) => fs.unlinkSync(path.join(OUT_DIR, f)));

  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  try {
    // ---------- Écrans communs ----------
    await page.setViewport(MOBILE);
    await loginAs(page, null);
    await shot(page, '01_connexion.png');

    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.reload({ waitUntil: 'networkidle2' });
    await wait(800);
    await shot(page, '02_connexion_clair.png');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

    await page.goto(`${BASE_URL}/offline.html`, { waitUntil: 'networkidle2' });
    await shot(page, '03_hors_ligne.png');

    // ---------- Parcours chef (Guillaume, Meute 1 et Meute 3) ----------
    await loginAs(page, 'Guillaume');
    await shot(page, '04_accueil_chef.png');

    await clickText(page, 'Nouvelle dépense');
    await page.type('main input', '24,90');
    await clickText(page, 'Suivant');
    await clickText(page, 'Nourriture');
    await shot(page, '05_etape_motif.png');
    await clickText(page, 'Suivant');
    await clickText(page, 'Argent perso');
    await shot(page, '06_etape_paiement.png');
    await clickText(page, 'Suivant');
    const input = await page.$('input[type="file"]');
    await input?.uploadFile(RECEIPT);
    await wait(2000);
    await shot(page, '07_etape_justificatif.png');
    await clickText(page, 'Suivant');
    await shot(page, '08_recapitulatif.png');
    await clickText(page, 'Valider et envoyer');
    await wait(1200);
    await shot(page, '09_depense_envoyee.png');

    await clickText(page, 'Voir les dépenses de mon unité');
    await shot(page, '10_depenses_unite.png');

    await page.evaluate(() =>
      (document.querySelector('header [aria-label="Demander un changement d\'unité"]') as HTMLElement | null)?.click()
    );
    await wait(600);
    await shot(page, '11_changement_unite.png');

    // ---------- Compte en attente (Claire) ----------
    await loginAs(page, 'Claire');
    await shot(page, '12_compte_en_attente.png');

    // ---------- Admin (Benoît) ----------
    await loginAs(page, 'Benoît');
    await shot(page, '13_admin_comptes_en_attente.png');
    await clickText(page, 'Plus tard');
    await shot(page, '14_admin_depenses_mobile.png');

    await page.setViewport(DESKTOP);
    await page.reload({ waitUntil: 'networkidle2' });
    await wait(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, '15_admin_depenses_pc.png');
    await clickText(page, 'Comptes', 'nav button, nav a, [role="tablist"] button');
    await shot(page, '16_admin_comptes_pc.png');
    await clickText(page, 'Périodes', 'nav button, nav a, [role="tablist"] button');
    await shot(page, '17_admin_periodes_pc.png');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌', err?.message || err);
  process.exit(1);
});
