# Garder la base Supabase réveillée

Un projet Supabase **gratuit** est **mis en pause après 7 jours sans activité**. En pause, l'appli ne fonctionne plus (connexion et dépenses impossibles) jusqu'à ce qu'on la restaure. Les vacances, l'été surtout, dépassent largement 7 jours sans usage.

Ce qui compte comme activité : une requête sur l'API de la base. Visiter le site Vercel ne suffit pas (pages statiques), et une tâche planifiée **à l'intérieur** de Supabase (`pg_cron`) non plus.

## Le dispositif

Deux réveils indépendants (ils ne dépendent ni l'un de l'autre, ni de Vercel) et une alerte pour chacun.

| | Principal | Filet de sécurité |
| :--- | :--- | :--- |
| Outil | [cron-job.org](https://cron-job.org) (gratuit) | Action GitHub [`keep-alive.yml`](../.github/workflows/keep-alive.yml) |
| Fréquence | tous les 2 jours, 06:00 | tous les 3 jours, 07:00 UTC |
| Requête | `GET https://jthbkzcicmhrdewvgauw.supabase.co/rest/v1/units?select=id&limit=1` | la même |
| Clé | clé **publique** de l'appli (`sb_publishable_…`) dans l'en-tête `apikey` | secrets `SUPABASE_URL` et `SUPABASE_ANON_KEY` du dépôt |
| Alerte | email de cron-job.org en cas d'échec | email de GitHub quand l'exécution échoue |

La requête lit une ligne de la table `units` (lisible sans connexion, comme sur l'écran d'inscription) : c'est une vraie requête SQL, la base doit répondre. **Jamais la clé `service_role`** dans ces outils.

Script de l'action testé le 09/11/2026 contre la vraie base : `HTTP 200`, « Base réveillée. ».

Pourquoi pas une fonction Edge : elle ferait la même requête, avec du code en plus à déployer et à maintenir.

## Mise en place

### cron-job.org (principal)

1. Créer un compte gratuit avec l'adresse de la meute (ou du trésorier).
2. **Create cronjob** :
   - titre : `Compta Saint-Martin – réveil base` ;
   - URL : celle du tableau ci-dessus ;
   - planification : tous les 2 jours, 06:00 ;
   - **Advanced → Headers** : un seul en-tête, `apikey` = la clé publique `sb_publishable_…` (Supabase → Settings → API Keys, ou Vercel → `VITE_SUPABASE_ANON_KEY`) ;
   - **Notifications** : cocher « en cas d'échec » et « quand l'exécution remarche » ; décocher la désactivation automatique après échecs.
3. **Test run** : attendu `200` et une réponse du type `[{"id":"…"}]`.

### Action GitHub (filet)

1. GitHub → dépôt → **Settings → Secrets and variables → Actions** : vérifier `SUPABASE_URL` (`https://jthbkzcicmhrdewvgauw.supabase.co`) et `SUPABASE_ANON_KEY` (la clé publique `sb_publishable_…`). Sans eux, l'action **échoue** (exprès, pour alerter).
2. Onglet **Actions → Supabase Keep-Alive → Run workflow** : attendu vert, « Base réveillée. » dans le journal.
3. GitHub → **Settings → Notifications → Actions** : garder les emails pour les exécutions en échec.

Limite connue : sur un dépôt public, GitHub **désactive les tâches planifiées après 60 jours sans commit**. Il prévient par email avant ; réactiver = **Actions → Supabase Keep-Alive → Enable workflow**. cron-job.org couvre pendant ce temps.

## Si la base est quand même en pause

1. [Tableau de bord Supabase](https://supabase.com/dashboard/project/jthbkzcicmhrdewvgauw) → **Restore project**. Compter quelques minutes ; les données sont conservées.
2. **Au-delà de 90 jours de pause**, la restauration en un clic n'est plus possible (seulement le téléchargement d'une sauvegarde) : ne pas laisser traîner une alerte.
3. Chercher pourquoi les deux réveils ont échoué (historique cron-job.org, onglet Actions).

## Sauvegardes

L'offre gratuite ne fournit pas de sauvegarde téléchargeable. Faire régulièrement (au moins à chaque clôture de période) un **export complet** depuis l'écran admin (CSV + justificatifs).

## Garantie totale

Le plan **Pro** de Supabase (environ 25 $ par mois) supprime la mise en pause et ajoute des sauvegardes quotidiennes. À envisager seulement si l'appli devient critique.
