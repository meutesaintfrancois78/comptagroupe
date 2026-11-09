import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROMIUM_PATH = '/usr/bin/chromium';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.resolve('docs/screenshots');
const ARTIFACT_DIR = '/home/bison/.gemini/antigravity-cli/brain/dee23e0a-06ee-4ad1-a2a3-e108ce7ba8c1';

fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  console.log('🚀 Démarrage de la capture des parcours utilisateurs avec Chromium Headless...');

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });

  const page = await browser.newPage();

  const saveShot = async (name: string) => {
    const docPath = path.join(OUT_DIR, name);
    const artPath = path.join(ARTIFACT_DIR, name);
    await page.screenshot({ path: docPath, fullPage: false });
    fs.copyFileSync(docPath, artPath);
    console.log(`📸 Screenshot capturé : ${name} -> ${docPath}`);
  };

  try {
    // -------------------------------------------------------------
    // Screen 1: Mobile Login Screen (393x852) with password preview eye
    // -------------------------------------------------------------
    console.log('\n[1/7] Capture écran Login Mobile...');
    await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    // Type real test credentials and click eye to reveal password
    await page.type('input#login-email, input[type="email"]', 'chef.martin@gmail.com');
    await page.type('input#login-password, input[placeholder="••••••••"]', 'SuperSecretPassword123!');
    // Click the eye button to demonstrate the password preview feature
    await page.evaluate(() => {
      const eyeBtn = document.querySelector('button[aria-label*="mot de passe"]') as HTMLButtonElement;
      if (eyeBtn) eyeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    await saveShot('01_login_mobile.png');

    // -------------------------------------------------------------
    // Screen 2: Chef Home Mobile (logged in as Alexandre Martin, Meute 1)
    // -------------------------------------------------------------
    console.log('\n[2/7] Capture écran Accueil Chef Mobile...');
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => document.body.innerText.includes('Meute 1') || document.body.innerText.includes('Nouvelle dépense'),
      { timeout: 15000 }
    );
    await new Promise((r) => setTimeout(r, 2000));
    await saveShot('02_chef_home_mobile.png');

    // -------------------------------------------------------------
    // Screen 3: Multi-step Expense Form Mobile (Step 4 - Justificatif & Photo)
    // -------------------------------------------------------------
    console.log('\n[3/7] Capture formulaire déclaration dépense Mobile (étape Justificatif)...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Nouvelle dépense') || b.textContent?.includes('Nouvelle')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Step 1: Type amount 42.50
    await page.type('input#expense-amount, input[inputmode="decimal"]', '42,50');
    await new Promise((r) => setTimeout(r, 400));
    // Click Suivant
    await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Suivant'));
      if (nextBtn) nextBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Step 2: Select category Nourriture
    await page.evaluate(() => {
      const catBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Nourriture'));
      if (catBtn) catBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    // Click Suivant
    await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Suivant'));
      if (nextBtn) nextBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Step 3: Payment method (Argent perso)
    await page.evaluate(() => {
      const persBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Argent perso'));
      if (persBtn) persBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    // Click Suivant to land on Step 4 (Justificatif with 2 upload buttons)
    await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Suivant'));
      if (nextBtn) nextBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));
    await saveShot('03_expense_form_mobile.png');

    // -------------------------------------------------------------
    // Screen 4: Desktop Admin Dashboard (1280x800)
    // -------------------------------------------------------------
    console.log('\n[4/7] Capture Espace Admin Desktop...');
    await page.setViewport({ width: 1280, height: 800, isMobile: false });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.type('input#login-email, input[type="email"]', 'admin.dupont@groupe-enf.fr');
    await page.type('input#login-password, input[placeholder="••••••••"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => document.body.innerText.includes('Dépenses') || document.body.innerText.includes('Comptes & Rôles'),
      { timeout: 15000 }
    );
    await new Promise((r) => setTimeout(r, 2000));

    // Dismiss banner if visible so table is clearly visible
    await page.evaluate(() => {
      const dismissBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Plus tard') || b.getAttribute('aria-label')?.includes('Fermer')
      );
      if (dismissBtn) dismissBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await saveShot('04_admin_dashboard_desktop.png');

    // -------------------------------------------------------------
    // Screen 5: Admin User Management Desktop (1280x800)
    // -------------------------------------------------------------
    console.log('\n[5/7] Capture Gestion Utilisateurs Admin...');
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Comptes & Rôles')
      );
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await saveShot('05_admin_user_management.png');

    // -------------------------------------------------------------
    // Screen 6: Pending Account Screen Mobile (chef.claire@groupe-enf.fr)
    // -------------------------------------------------------------
    console.log('\n[6/7] Capture Écran Compte en attente Mobile...');
    await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.type('input#login-email, input[type="email"]', 'chef.claire@groupe-enf.fr');
    await page.type('input#login-password, input[placeholder="••••••••"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => document.body.innerText.includes('attente') || document.body.innerText.includes('validation'),
      { timeout: 15000 }
    );
    await new Promise((r) => setTimeout(r, 2000));
    await saveShot('06_pending_account_screen.png');

    // -------------------------------------------------------------
    // Screen 7: Offline Screen Mobile (logged in chef in offline mode)
    // -------------------------------------------------------------
    console.log('\n[7/7] Capture Écran Hors-ligne Mobile (Accueil Chef)...');
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.type('input#login-email, input[type="email"]', 'chef.martin@gmail.com');
    await page.type('input#login-password, input[placeholder="••••••••"]', 'SuperSecretPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => document.body.innerText.includes('Meute 1') || document.body.innerText.includes('Nouvelle dépense'),
      { timeout: 15000 }
    );
    await new Promise((r) => setTimeout(r, 1500));

    // Simulate going offline: trigger offline event and set offline mode
    await page.setOfflineMode(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await new Promise((r) => setTimeout(r, 1000));
    await saveShot('07_offline_screen.png');

    console.log('\n🎉 TOUTES LES CAPTURES DES 7 PARCOURS ONT ÉTÉ GÉNÉRÉES AVEC SUCCÈS !');
  } catch (err) {
    console.error('Erreur lors des captures :', err);
  } finally {
    await browser.close();
  }
}

main();
