# Connexion avec Google

Les chefs peuvent se connecter avec leur compte Google au lieu d'un mot de passe. Tout reste gratuit : Supabase gère Google dans son offre gratuite, et l'identifiant OAuth de Google Cloud ne coûte rien.

**État au 09/11/2026 : configuré et en service.** Projet Google Cloud « Compta Saint-Martin » (`plenary-shard-514210-v6`, compte meute.saintfrancois78@gmail.com), application publiée « En production », fournisseur Google activé dans Supabase, migration `20261109000002` appliquée. Les étapes ci-dessous servent à refaire la configuration sur un autre projet.

## Ce que voit un chef

1. Sur la page de connexion, il touche **« Continuer avec Google »** et choisit son compte Google.
2. À sa première connexion, l'écran **« Complète ton inscription »** lui demande de confirmer son vrai prénom et son vrai nom (Google peut donner un pseudo), de choisir son unité et d'accepter les conditions.
3. Il arrive sur l'écran d'attente habituel : un admin valide son compte comme pour une inscription par mot de passe.

Un chef qui avait déjà un compte avec mot de passe sur la même adresse retrouve son compte : Supabase relie les deux connexions.

## Étape 1 : la migration

Lancer [`20261109000002_connexion_google.sql`](https://raw.githubusercontent.com/meutesaintfrancois78/comptagroupe/main/supabase/migrations/20261109000002_connexion_google.sql) dans **SQL Editor** de Supabase, **après** `20261109000000` et `20261109000001` (voir [MIGRATIONS.md](MIGRATIONS.md)).

Elle fait deux choses :
- à l'inscription, le prénom et le nom viennent aussi de Google, et aucune unité n'est attribuée par défaut ;
- un chef en attente sans unité peut choisir la sienne une seule fois (fin d'inscription). Toute autre modification d'unité reste réservée à l'admin.

## Étape 2 : créer l'identifiant chez Google

Sur [console.cloud.google.com](https://console.cloud.google.com), avec le compte Google du groupe :

1. **Créer un projet** (menu en haut) : par exemple « Compta Saint-Martin ».
2. **APIs et services → Écran de consentement OAuth** (ou **Google Auth Platform → Branding**) :
   - type d'utilisateur : **Externe** ;
   - nom de l'application : `Compta Groupe Saint-Martin` ;
   - adresse d'assistance et adresse de contact : celle du groupe ;
   - domaines autorisés : `vercel.app` et `supabase.co` ;
   - accès (scopes) : laisser ceux par défaut, `email`, `profile` et `openid`. Ils ne demandent aucune vérification de Google.
3. **Audience** : cliquer **Publier l'application** (passer « En production »). Sinon, seuls 100 testeurs déclarés à la main peuvent se connecter.
4. **Identifiants → Créer des identifiants → ID client OAuth** :
   - type : **Application Web** ;
   - origines JavaScript autorisées :

     ```text
     https://comptagroupe.vercel.app
     ```

   - URI de redirection autorisés (une seule, celle de Supabase) :

     ```text
     https://jthbkzcicmhrdewvgauw.supabase.co/auth/v1/callback
     ```

5. Copier l'**ID client** et le **Code secret du client**. Le code secret ne se committe jamais.

## Étape 3 : brancher Google dans Supabase

Dans le tableau de bord Supabase du projet :

1. **Authentication → Sign In / Providers → Google** : activer, coller l'ID client et le code secret, enregistrer.
2. **Authentication → URL Configuration** :
   - **Site URL** :

     ```text
     https://comptagroupe.vercel.app
     ```

   - **Redirect URLs** : ajouter ces deux lignes (la seconde sert aux tests en local) :

     ```text
     https://comptagroupe.vercel.app
     http://localhost:3300
     ```

## Étape 4 : le bouton

Le bouton « Continuer avec Google » est affiché par défaut. Pour le masquer (par exemple sur un projet où Google n'est pas configuré), ajouter dans **Vercel → Settings → Environment Variables** :

```text
VITE_ENABLE_GOOGLE_AUTH=false
```

puis redéployer.

## Vérifier

| Faire | Résultat attendu |
| :--- | :--- |
| Ouvrir la page de connexion | Le bouton « Continuer avec Google » est sous « ou » |
| Se connecter avec un compte Google jamais utilisé dans l'appli | Écran « Complète ton inscription », prénom et nom préremplis |
| Remplir et envoyer | Écran « Validation en attente » avec la bonne unité |
| En admin (Benoît) | Le compte apparaît dans « Comptes chefs en attente », avec son email |
| Valider le compte, puis se reconnecter avec Google | Accès direct à l'accueil chef |

## Problèmes fréquents

| Message | Cause | Que faire |
| :--- | :--- | :--- |
| `Unsupported provider: provider is not enabled` | Google n'est pas activé dans Supabase | Étape 3 |
| `redirect_uri_mismatch` chez Google | L'URI de redirection ne correspond pas | Recopier exactement l'adresse `…supabase.co/auth/v1/callback` de l'étape 2 |
| Retour sur la page de connexion sans être connecté | L'adresse du site n'est pas dans les Redirect URLs de Supabase | Étape 3, point 2 |
| « Accès bloqué : l'application n'a pas été validée » | Application Google encore en mode test | Étape 2, point 3 : publier l'application |
| `Interdit : Seul un administrateur peut modifier les unités` en fin d'inscription | La migration de l'étape 1 n'est pas passée | Étape 1 |
