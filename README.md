# Compta Groupe Saint-Martin - Remontée de Dépenses Scoutes

Application mobile-first Progressive Web App (PWA) de remontée et de suivi de dépenses pour les chefs d'unité du **Groupe Saint-Martin**.

Développée selon une architecture **Zero-Backend (sans serveur Node.js)**, déployable sur **Vercel** et s'appuyant sur l'infrastructure **Supabase** (PostgreSQL avec Row Level Security, Authentification et Storage privé).

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
- **Consultation collaborative d'unité** : Le chef voit et peut modifier les dépenses de son unité, avec historique d'audit complet (*qui, quand, ancienne valeur*). **Suppression strictement interdite** pour les chefs, et l'unité de la dépense reste verrouillée.

### Parcours Administrateur (Chefs de groupe & Trésoriers)
- **Bannière plein écran obligatoire** : S'impose automatiquement tant qu'il reste des comptes chefs en attente. Clic sur "Plus tard" repousse le rappel avec un minuteur persistant de **3 minutes**.
- **Tableau de bord dense et réactif** :
  - Colonnes Date, Unité, Chef, Montant, Motif, Mode de paiement, Statut remboursement, Vignette du justificatif.
  - Filtres dynamiques combinables par unité, chef et statut de remboursement.
  - Ligne de totalisation en bas de tableau recalculée instantanément.
- **Modification d'unité par les admins** : Lors de l'édition d'une dépense, un administrateur a le droit exclusif de modifier l'unité de rattachement (`unit_id`).
- **Gestion des comptes & affectation d'unité flexible** : Validation, refus, désactivation de chef parti, affectation d'une 2e unité (débloquant le sélecteur d'unité), promotion admin avec **garde-fou interdisant le retrait du dernier admin**. Les administrateurs peuvent n'avoir **aucune unité principale** (*Non rattaché - Groupe*).
- **Remboursements** : Passage en un clic en "Remboursée" pour les dépenses engagées sur fonds personnels (avec notification email au chef).
- **Périodes, Clôture & Règle des 10 ans** :
  - Période unique active (Année ou Camp).
  - Clôture verrouillant la période en lecture seule pour les admins et la masquant pour les chefs.
  - **Export automatique de sauvegarde obligatoire** avant toute clôture.
  - Purge protégée par confirmation forte ("PURGER") et téléchargement d'archive obligatoire.
- **Exports modulaires** :
  - Export CSV compatible Excel FR (séparateur point-virgule et encodage UTF-8 BOM).
  - Export ZIP de l'ensemble des justificatifs renommés selon la nomenclature : `AAAA-MM-JJ_[Unite]_[Montant]EUR.[extension]`.

### Mascotte : Marty le bison
Personnage kawaii original (corps tout rond, yeux brillants, foulard scout vert et carnet de comptes sous le bras) décliné en images WebP légères pour les 6 états émotionnels (accueil, attente, encouragements, joie, hors-ligne, erreur). Marty n'apparaît côté admin que sur l'écran de login pour préserver le sérieux de l'espace comptable.

---

## 📱 2. PWA (Progressive Web App) Mobile & Hors-Ligne

- **Installation sur écran d'accueil** : Compatible Android (prompt natif automatique) et iOS Safari (guidage « Partager ➔ Sur l'écran d'accueil »).
- **Icônes adaptatives** : Icônes PNG générées en 192x192, 512x512, maskable et apple-touch-icon 180x180 dans `public/icons/`.
- **Mise en cache App Shell** : Service worker (`public/sw.js`) assurant un chargement instantané même sans connexion internet.

---

## 🔑 3. Comptes de Test Réels (Supabase en Ligne)

L'application est déployée en ligne sur : **[https://comptagroupe.vercel.app](https://comptagroupe.vercel.app)**

Tous ces comptes sont créés et vérifiés sur le projet Supabase en production :

| Rôle | Nom & Prénom | Identifiant (Email) | Mot de passe | Unité de rattachement | Statut |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrateur** | Benoît Dupont | `ben.dupont@groupe-enf.fr` | `Password123!` | *Aucune (Non rattaché - Groupe)* | **Actif** |
| **Administrateur** | Benoît Dupont | `admin.dupont@groupe-enf.fr` | `Password123!` | Troupe 1 | **Actif** |
| **Administratrice** | Marie Vasseur | `marie.admin@groupe-enf.fr` | `Password123!` | Meute 3 | **Actif** |
| **Chef d'Unité** | Alexandre Martin | `chef.martin@gmail.com` | `SuperSecretPassword123!` | Meute 1 | **Actif** |
| **Chef d'Unité** | Guillaume Martin | `chef.guillaume@groupe-enf.fr` | `Password123!` | Meute 1 & Meute 3 (2 unités) | **Actif** |
| **Chef en Attente** | Claire Lemoine | `chef.claire@groupe-enf.fr` | `Password123!` | Compagnie 2 | **En attente** |
| **Chef Désactivé** | Julien Faure | `chef.julien@groupe-enf.fr` | `Password123!` | Clairière 2 | **Désactivé** |

> [!TIP]
> Sur l'écran de connexion, une icône œil (`Eye` / `EyeOff`) permet de révéler ou masquer le mot de passe en cours de saisie.

---

## 🛠️ 4. Stack Technique & Méthodologie TDD

- **Frontend & PWA** : React 18, Vite, TypeScript, Tailwind CSS, composants accessibles (Radix UI / Lucide Icons).
- **TDD (Test-Driven Development)** : Développement conduit par les tests avec **Bun** (`bun test`).
  - 24 tests unitaires couvrant la validation des formulaires, le calcul des permissions d'édition, les règles d'affectation d'unité, la temporisation de la bannière 3 minutes, la protection du dernier administrateur et les exports CSV/ZIP.
- **Base de données & Auth** : Supabase (PostgreSQL 15, Row Level Security, GoTrue Auth, Storage bucket privé).
- **Hébergement** : Vercel (Edge static delivery).

---

## 🚀 5. Commandes Utiles

```bash
# Installation des dépendances
bun install

# Lancer la suite de tests TDD (24 tests)
bun test

# Lancer le serveur de développement local
bun dev

# Compiler pour la production
bun run build

# Générer les captures d'écran des parcours utilisateurs avec Chromium Headless
bun run scripts/capture-all-screenshots.ts
```

---

## ⚖️ 6. Légal, RGPD & Règle des 10 ans

- **Durée de conservation** : 10 ans pour les pièces comptables (Article L123-22 du Code de commerce).
- **Protection des données** : Accès cloisonné par unité via RLS. Les justificatifs ne sont jamais publics et sont consultés via des URLs signées éphémères.
- **Protection des mineurs** : Consigne explicite de ne renseigner aucune donnée nominative ou de santé relative aux enfants dans les commentaires libres.
