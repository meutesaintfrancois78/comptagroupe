# Compta ENF - Remontée de Dépenses Scoutes

Application mobile-first Progressive Web App (PWA) de remontée et de suivi de dépenses pour les chefs d'unité d'un groupe scout affilié aux **Éclaireurs Neutres de France (ENF)**.

Développée selon une architecture **Zero-Backend (sans serveur Node.js)**, déployable gratuitement sur **Vercel** et s'appuyant sur l'infrastructure **Supabase** (PostgreSQL avec Row Level Security, Authentification et Storage privé).

---

## 🏕️ 1. Fonctionnalités Principales

### Parcours Chef d'Unité
- **Accueil mobile au pouce** :
  - Gros bouton prioritaire **"Nouvelle dépense"**
  - Bouton **"Dépenses totales"** verrouillé sur son unité
  - Écran explicatif convivial avec **Marty le bison** pour un chef sans dépense
- **Saisie en 5 étapes rapides** :
  1. *Nom* : Rempli automatiquement depuis le profil connecté (lecture seule).
  2. *Montant* : Champ géant avec conversion automatique virgule/point, validation > 0 €.
  3. *Motif* : Menu des catégories validées (*Nourriture*, *Transport*, *Matériel*, *Hébergement*, *Pharmacie*, *Autre*) avec mémorisation instantanée du "Dernier motif".
  4. *Mode de paiement* : Choix tactile entre **"Argent de l'unité"** (par défaut) et **"Argent perso"** (à rembourser).
  5. *Justificatif obligatoire* : Prise de photo directe avec compression automatique dans le navigateur (~1 Mo) ou sélection de fichier PDF (jusqu'à 5 Mo).
  6. *Récapitulatif & Validation* : Date modifiable, commentaire facultatif, bouton anti-doublon désactivé au premier clic.
- **Mode hors-connexion sécurisé** : Enregistrement continu en mémoire locale (`localStorage`). En l'absence de réseau, un écran explicatif avec Marty bloque l'envoi sans rien perdre.
- **Consultation collaborative d'unité** : Le chef voit et peut modifier toutes les dépenses de son unité, avec historique d'audit complet (*qui, quand, ancienne valeur*). **Suppression strictement interdite** pour les chefs.

### Parcours Administrateur (Chefs de groupe & Trésoriers)
- **Bannière plein écran obligatoire** : S'impose automatiquement tant qu'il reste des comptes chefs en attente. Clic sur "Plus tard" repousse le rappel avec un minuteur persistant de **3 minutes**.
- **Tableau de bord dense et réactif** :
  - Colonnes Date, Unité, Chef, Montant, Motif, Mode de paiement, Statut remboursement, Vignette du justificatif.
  - Filtres dynamiques combinables par unité, chef et statut de remboursement.
  - Ligne de totalisation en bas de tableau recalculée instantanément.
- **Remboursements** : Passage en un clic en "Remboursée" pour les dépenses engagées sur fonds personnels (avec notification email au chef).
- **Gestion des comptes & unités** : Validation, refus, désactivation de chef parti, affectation d'une 2e unité (débloquant le sélecteur d'unité), promotion admin avec **garde-fou interdisant le retrait du dernier admin**.
- **Périodes, Clôture & Règle des 10 ans** :
  - Période unique active (Année ou Camp).
  - Clôture verrouillant la période en lecture seule pour les admins et la masquant pour les chefs.
  - **Export automatique de sauvegarde obligatoire** avant toute clôture.
  - Purge protégée par confirmation forte ("PURGER") et téléchargement d'archive obligatoire.
- **Exports modulaires** :
  - Export CSV compatible Excel FR (séparateur point-virgule et encodage UTF-8 BOM).
  - Export ZIP de l'ensemble des justificatifs renommés selon la nomenclature : `AAAA-MM-JJ_[Unite]_[Montant]EUR.[extension]`.

### Mascotte : Marty le bison
Personnage kawaii original (corps tout rond, yeux brillants, foulard scout vert ENF et carnet de comptes sous le bras) décliné en images WebP légères pour les 6 états émotionnels (accueil, attente, encouragements, joie, hors-ligne, erreur). Marty n'apparaît côté admin que sur l'écran de login pour préserver le sérieux de l'espace comptable.

---

## 🛠️ 2. Stack Technique (Zero-Server)

- **Frontend & PWA** : React 18, Vite, TypeScript, Tailwind CSS, composants inspirés shadcn/ui (Radix UI).
- **Outillage & Tests** : **Bun** (remplace entièrement Node.js en local et exécute les tests TDD natifs `bun test` en moins de 30 ms).
- **Base de données & Auth** : Supabase (PostgreSQL 15, RLS strictes, Auth email/mot de passe, Storage bucket privé).
- **Hébergement** : Vercel (déploiement statique Edge 100% gratuit, 0 serveur à administrer).

---

## 🚀 3. Installation et Démarrage Local

### Prérequis
- [Bun](https://bun.sh) installé en local (`curl -fsSL https://bun.sh/install | bash`).

### Lancement
```bash
# 1. Cloner le projet et installer les dépendances
bun install

# 2. Lancer les tests unitaires TDD
bun test

# 3. Lancer le serveur de développement
bun dev
```

L'application démarre par défaut en **mode démo autonome** : une base de données locale simulée en `localStorage` vous permet de tester immédiatement tous les écrans sans avoir besoin de configurer Supabase à l'avance.

Des boutons d'accès rapide en bas de l'écran de connexion permettent de basculer en un clic entre :
- 👤 **Admin** (Benoît Dupont)
- 🏕️ **Chef d'unité** (Guillaume Martin)
- ⏳ **Chef en attente** (Claire Lemoine)

---

## ☁️ 4. Déploiement en Production

### 1. Configuration Supabase
1. Créez un projet gratuit sur [supabase.com](https://supabase.com).
2. Dans le menu **SQL Editor**, exécutez successivement les fichiers SQL du dossier `supabase/` :
   - `supabase/migrations/20261108000000_schema.sql` (Tables et types)
   - `supabase/migrations/20261108000001_rls.sql` (Politiques de sécurité RLS)
   - `supabase/migrations/20261108000002_triggers.sql` (Triggers d'audit et dernier admin)
   - `supabase/seed.sql` (Les 6 unités ENF, les catégories et la première période)
3. Créez un bucket de stockage nommé `receipts` dans **Storage** et réglez-le en **Private**.

### 2. Déploiement Vercel
1. Poussez le dépôt sur votre compte GitHub d'association.
2. Liez le dépôt sur [vercel.com](https://vercel.com).
3. Ajoutez les variables d'environnement dans les paramètres Vercel :
   - `VITE_SUPABASE_URL` = `https://votre-projet.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `votre-cle-anon`
   - `VITE_ENABLE_SANDBOX` = `false`

### 3. Suppression de la page de test avant passage en production
Conformément au cahier des charges, la page de test secrète `/admin/test-sandbox-secrete` peut être physiquement supprimée en une seule commande avant la livraison finale :
```bash
bun run clean:sandbox
```

---

## ⚖️ 5. Légal, RGPD et Règle des 10 ans

- **Durée de conservation** : 10 ans pour les pièces comptables (Article L123-22 du Code de commerce).
- **Protection des données** : Accès cloisonné par unité via RLS. Les justificatifs ne sont jamais publics et sont consultés via des URLs signées éphémères.
- **Protection des mineurs** : Consigne explicite de ne renseigner aucune donnée nominative ou de santé relative aux enfants dans les commentaires libres.


---

## 🔑 6. Comptes de Test & Identifiants

> [!NOTE]
> **Mot de passe universel** pour tous les comptes : `Password123!`

| Utilisateur | Email | Rôle & Rattachement | Statut |
| :--- | :--- | :--- | :--- |
| **Benoît Dupont** | `benoit.dupont@groupe-enf.fr` | Administrateur (Chef de groupe) | Actif |
| **Marie Vasseur** | `marie.vasseur@groupe-enf.fr` | Administratrice (Trésorière) | Actif |
| **Guillaume Martin** | `guillaume.martin@groupe-enf.fr` | Chef d'unité (Meute 1 & Meute 3) | Actif |
| **Claire Lemoine** | `claire.lemoine@groupe-enf.fr` | Chef d'unité (Compagnie 2) | En attente de validation |
| **Test Direct** | `chef.martin@gmail.com` | Chef d'unité (Meute 1) | Actif (mot de passe : `SuperSecretPassword123!`) |

