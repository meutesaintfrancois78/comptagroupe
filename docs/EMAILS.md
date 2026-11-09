# Emails automatiques

Quand un admin coche **« Remboursée »** sur une dépense payée avec l'argent perso d'un chef, le chef reçoit un email :

- **Objet** : `[Comptabilité groupe] Remboursement de ta dépense du 09/11/2026`
- **Contenu** : montant, date, motif et unité. Pas de lien : le chef retrouve la dépense dans l'appli. Il peut répondre à l'email, la réponse arrive dans la boîte qui envoie.
- **Expéditeur** : « Compta Groupe Saint-Martin », depuis l'adresse réglée dans `SMTP_USER`.

Le message affiché à l'admin dit si l'email est parti (« Email envoyé à … ») ou pourquoi il n'est pas parti. Décocher puis recocher « Remboursée » renvoie l'email.

## Comment ça marche

Gratuit, sans nom de domaine :

1. L'appli appelle la fonction serveur Vercel `api/notifier-remboursement.ts` avec le jeton de l'admin connecté.
2. La fonction vérifie qu'il est admin actif, relit la dépense et l'email du chef dans Supabase (avec les droits de l'admin, sans clé `service_role`).
3. Elle envoie l'email en SMTP avec le compte Gmail réglé dans Vercel. Limite Gmail : environ 500 emails par jour.

En mode démo (sans Supabase), aucun email n'est envoyé.

## Réglage (une fois)

### Étape 1 : mot de passe d'application Gmail

Avec le compte Google qui enverra les emails (aujourd'hui celui de la meute) :

1. Activer la **validation en deux étapes** si ce n'est pas fait : [myaccount.google.com/signinoptions/two-step-verification](https://myaccount.google.com/signinoptions/two-step-verification).
2. Ouvrir [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), nommer l'application `Compta Groupe`, cliquer **Créer**.
3. Copier le code de 16 lettres affiché. Il ne s'affiche qu'une fois et ne se committe jamais.

### Étape 2 : variables dans Vercel

**Vercel → projet comptagroupe → Settings → Environment Variables**, environnement **Production** (et Preview si besoin) :

| Nom | Valeur |
| :--- | :--- |
| `SMTP_USER` | l'adresse Gmail qui envoie |
| `SMTP_PASSWORD` | le code de 16 lettres de l'étape 1 (sans espaces) |

Facultatives : `SMTP_HOST` (défaut `smtp.gmail.com`), `SMTP_PORT` (défaut `465`), `MAIL_FROM_NAME` (défaut `Compta Groupe Saint-Martin`).

`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` existent déjà : la fonction les réutilise.

### Étape 3 : redéployer

**Deployments → ⋯ sur le dernier → Redeploy**. Les variables ne sont prises en compte qu'au déploiement suivant.

## Vérifier

| Faire | Résultat attendu |
| :--- | :--- |
| En admin, cocher « Remboursée » sur une dépense en argent perso | « Dépense de … marquée comme remboursée. Email envoyé à … » |
| Boîte du chef | Email « [Comptabilité groupe] Remboursement de ta dépense du … » |
| Boîte d'envoi du compte Gmail | L'email apparaît dans « Envoyés » |

## Messages d'erreur

| Message | Cause | Que faire |
| :--- | :--- | :--- |
| « l'envoi d'emails n'est pas encore configuré » | `SMTP_USER` ou `SMTP_PASSWORD` absent | Étape 2 puis étape 3 |
| « le serveur d'envoi a refusé l'email » | Mot de passe d'application faux ou révoqué | Refaire l'étape 1, mettre à jour `SMTP_PASSWORD`, redéployer. Le détail est dans Vercel → Logs |
| « le chef n'a pas d'adresse email » | Profil sans email (compte très ancien) | Vérifier le profil dans Supabase |

## Email classé en spam

Constaté le 09/11/2026 : le premier email vers une adresse Gmail est arrivé dans les spams, un autre vers yopmail non. L'envoi lui-même est propre (serveur Gmail, signature DKIM `gmail.com`). Ce qui pèse :

| Cause | Ce qui a été fait |
| :--- | :--- |
| Premier email entre cette adresse et ce destinataire | Rien à faire côté appli : un clic sur **« Non spam »** (ou ajouter l'adresse de la meute aux contacts) règle le cas pour ce chef |
| Schéma proche du hameçonnage : « remboursement » + montant + lien vers un sous-domaine `vercel.app` | Lien retiré, montant retiré de l'objet |
| « Email automatique, merci de ne pas y répondre » | Remplacé par « Réponds simplement à cet email » |

Le conseil le plus utile : prévenir les chefs à l'arrivée de la fonction (« ajoute l'adresse de la meute à tes contacts »). Un domaine à soi (avec SPF, DKIM, DMARC) améliorerait encore la délivrabilité, mais ce n'est pas gratuit.

## Avant la mise en production

Envoyer depuis l'adresse du **trésorier** : créer son mot de passe d'application (étape 1 avec son compte), remplacer `SMTP_USER` et `SMTP_PASSWORD` dans Vercel, redéployer. Aucun changement de code.
