# Checklist avant la mise en production

Tout ce qui existe **seulement pour la phase de test** et doit être retiré, désactivé ou modifié avant d'ouvrir l'appli aux vrais chefs. Cocher au fur et à mesure (`[ ]` → `[x]`) et noter la date dans le journal en bas.

Ordre conseillé : 1 → 7. Faire une sauvegarde de la base avant l'étape 2 (voir [MIGRATIONS.md](MIGRATIONS.md)).

## 1. Décisions à prendre d'abord

- [ ] **Base** : repartir d'un projet Supabase neuf (le plus propre) ou nettoyer le projet de test actuel (`jthbkzcicmhrdewvgauw`). Le reste de la liste suppose qu'on garde le projet actuel.
- [ ] **Adresse d'envoi des emails** : compte Google du trésorier (voir étape 5).
- [ ] **Qui est admin** : liste des vrais admins (trésorier, chef de groupe…).

## 2. Données de test

- [ ] Supprimer toutes les dépenses fictives et leurs justificatifs (Storage → bucket des justificatifs), ou purger les périodes de test depuis l'écran **Périodes**.
- [ ] Supprimer les comptes de test : Supabase → **Authentication → Users** (Benoît, Guillaume, Claire, Alexandre, Sophie, JO H, Paul Zob…). Les profils partent avec.
- [ ] Supprimer les tables de sauvegarde `public.sauvegarde_20261109_*`.
- [ ] Vérifier les unités, les catégories et la période ouverte : ce sont les vraies ?

## 3. Base de données (SQL Editor)

- [ ] Retirer l'**admin automatique** de `ben.dupont@groupe-enf.fr` et `admin.dupont@groupe-enf.fr` dans `handle_new_user` (`supabase/migrations/20261109000002_connexion_google.sql`, ligne `IF new.email IN (...)`) : nouvelle migration qui redéfinit la fonction sans ce bloc.
- [ ] Retirer la règle d'**insertion libre dans l'historique** (`history_insert_policy`, `20261108000001_rls.sql`) : l'historique doit être écrit seulement par les triggers.
- [ ] Vérifier que `20261109000003_remboursement_definitif.sql` est appliquée.
- [ ] Ne plus utiliser les scripts de test : `supabase/SET_ADMIN_BEN_DUPONT.sql`, `supabase/seed.sql`, `supabase/seed_test_data.sql`, `supabase/00_SETUP_COMPLET.sql`, `scripts/seed-complete-accounts.ts`, `scripts/upload-receipts-to-supabase.ts`, `scripts/generate-receipts.py` → les supprimer du dépôt.
- [ ] Nommer le **premier vrai admin** à la main (`UPDATE profiles SET role = 'admin', status = 'active' WHERE email = '…';`).

## 4. Code et Vercel

- [ ] Supprimer la **page sandbox** : `npm run clean:sandbox`, puis retirer sa route dans `src/App.tsx`.
- [ ] Vercel → Environment Variables : supprimer `VITE_ENABLE_SANDBOX` (Production et Preview).
- [ ] README : retirer la liste des **comptes de test et mots de passe** (section 3) et les raccourcis de connexion de la démo.
- [ ] Rédiger les textes RGPD « Qui y a accès » et « Tes droits » (`src/components/legal/LegalModal.tsx`), avec le nom du responsable et l'adresse de contact.
- [ ] Redéployer et vider le cache de l'appli sur un téléphone de test (le service worker garde l'ancienne version jusqu'au rechargement).

## 5. Emails

- [ ] Créer un mot de passe d'application sur le compte Google du **trésorier** ([EMAILS.md](EMAILS.md), étape 1).
- [ ] Vercel : remplacer `SMTP_USER` et `SMTP_PASSWORD`, puis redéployer.
- [ ] Révoquer le mot de passe d'application « ComptaGroupe » du compte de la meute (myaccount.google.com/apppasswords).
- [ ] Envoyer un vrai remboursement de test et vérifier qu'il n'arrive pas en spam ; prévenir les chefs d'ajouter l'adresse aux contacts.

## 6. Supabase et Google

- [ ] **Authentication → URL Configuration** : retirer `http://localhost:3300/**` des Redirect URLs.
- [ ] **Authentication → Sign In / Providers → Email** : laisser **« Confirm email » activé**.
- [ ] Google Cloud (projet `plenary-shard-514210-v6`) : adresse d'assistance et de contact = celle du groupe ou du trésorier ; transférer la propriété du projet si le compte change.
- [ ] Offre gratuite Supabase : un projet sans activité pendant 7 jours est **mis en pause**. Prévoir une visite régulière ou un petit appel planifié, et une **sauvegarde régulière** (export CSV/ZIP depuis l'écran admin, l'offre gratuite n'a pas de sauvegarde automatique téléchargeable).
- [ ] Changer les mots de passe des comptes qui ont servi aux tests (Supabase, Vercel, Google de la meute) si d'autres personnes les ont eus.

## 7. Vérification finale

| Faire | Résultat attendu |
| :--- | :--- |
| S'inscrire avec une vraie adresse | Email de confirmation, puis écran « Validation en attente » |
| Valider le compte en admin | Le chef accède à l'accueil |
| Déclarer une dépense en argent perso avec photo | Visible côté admin, justificatif lisible |
| Confirmer le remboursement | Email reçu par le chef, case verrouillée |
| Export complet (CSV + ZIP des justificatifs) | Fichiers complets, montants justes, pas de caractère de formule dans le CSV |
| Se connecter avec Google | Écran « Complète ton inscription » |
| Ouvrir `/` avec un compte chef d'une autre unité | Il ne voit pas les dépenses des autres unités |

## Journal

| Date | Étape | Qui | Remarque |
| :--- | :--- | :--- | :--- |
| | | | |
