# Migrations de la base Supabase

Ce guide explique quelles migrations SQL existent, dans quel ordre les lancer et comment vérifier qu'elles sont bien passées. Chaque bloc de code se copie avec le bouton en haut à droite du bloc sur GitHub.

> [!NOTE]
> **Base de test à jour au 09/11/2026** : les migrations jusqu'à `20261109000002` sont appliquées (`20261109000003` : à lancer) et les justificatifs rangés (voir le [journal](#journal-des-migrations-appliquées)). Ce qui suit sert pour une autre base, ou pour comprendre ce qui a été fait.

> [!IMPORTANT]
> **Sur une base qui n'est pas encore à jour :** lancer `20261109000000`, puis `20261109000001`, puis ranger les anciens justificatifs (étapes 1 à 6). Tant que ce n'est pas fait :
> - la demande de changement d'unité côté chef renvoie une erreur ;
> - l'onglet Comptes affiche « Email non renseigné » ;
> - les chefs ne peuvent pas envoyer de justificatif (le stockage refuse l'envoi) ;
> - un chef peut encore se marquer « Remboursée » en appelant l'API directement.

## Sommaire

1. [Les fichiers](#les-fichiers)
2. [Étape 0 : sauvegarder](#étape-0--sauvegarder)
3. [Étape 1 : voir ce qui est déjà appliqué](#étape-1--voir-ce-qui-est-déjà-appliqué)
4. [Étape 2 : lancer la migration d'audit](#étape-2--lancer-la-migration-daudit-20261109000000)
5. [Étape 3 : lancer la migration de sécurité](#étape-3--lancer-la-migration-de-sécurité-20261109000001)
6. [Étape 4 : contrôler](#étape-4--contrôler)
7. [Étape 5 : ranger les anciens justificatifs](#étape-5--ranger-les-anciens-justificatifs)
8. [Étape 6 : tester dans l'appli](#étape-6--tester-dans-lappli)
9. [Installer une base neuve](#installer-une-base-neuve)
10. [Problèmes fréquents](#problèmes-fréquents)
11. [Revenir en arrière](#revenir-en-arrière)
12. [Journal des migrations appliquées](#journal-des-migrations-appliquées)

## Les fichiers

Les migrations sont dans [`supabase/migrations/`](../supabase/migrations). Elles se lancent **à la main, dans l'ordre**, depuis l'éditeur SQL de Supabase. Toutes peuvent être relancées sans effet de bord. Seule précaution : `20261109000001` et `20261109000002` redéfinissent la même fonction `protect_profile_updates` ; si l'on relance `20261109000001`, relancer `20261109000002` juste après.

| Ordre | Fichier | Ce qu'il fait |
| :---: | :--- | :--- |
| 1 | [`20261108000000_schema.sql`](../supabase/migrations/20261108000000_schema.sql) | Tables, types et index |
| 2 | [`20261108000001_rls.sql`](../supabase/migrations/20261108000001_rls.sql) | Règles d'accès (RLS) et fonctions `is_admin`, `get_my_status` |
| 3 | [`20261108000002_triggers.sql`](../supabase/migrations/20261108000002_triggers.sql) | Historique des modifications, garde-fou du dernier admin |
| 4 | [`20261109000000_audit_fixes_complete.sql`](../supabase/migrations/20261109000000_audit_fixes_complete.sql) | Colonnes `email` et `requested_unit_id`, protection des profils et des dépenses, inscription en attente, bucket des justificatifs |
| 5 | [`20261109000001_securite_complements.sql`](../supabase/migrations/20261109000001_securite_complements.sql) | Création de dépense protégée, création de profil limitée, stockage cloisonné par unité, maintenance SQL possible |
| 6 | [`20261109000002_connexion_google.sql`](../supabase/migrations/20261109000002_connexion_google.sql) | Prénom et nom depuis Google à l'inscription, choix de l'unité en fin d'inscription. Voir [CONNEXION-GOOGLE.md](CONNEXION-GOOGLE.md) |
| 7 | [`20261109000003_remboursement_definitif.sql`](../supabase/migrations/20261109000003_remboursement_definitif.sql) | Remboursement définitif : une dépense « Remboursée » ne peut plus revenir « À rembourser », même par un admin. Redéfinit `protect_expense_updates` : à relancer après `20261109000001` si celle-ci est relancée |

Autres fichiers de `supabase/` :

| Fichier | Statut |
| :--- | :--- |
| `seed.sql` | Données de base : unités, catégories, première période. À lancer une fois sur une base neuve. |
| `seed_test_data.sql`, `SET_ADMIN_BEN_DUPONT.sql` | **Phase de test seulement.** Créent des comptes avec le mot de passe `Password123!`. À supprimer avant la mise en production. |
| `00_SETUP_COMPLET.sql` | **Obsolète, ne plus lancer.** Il décrit l'ancien état de la base, et ses `CREATE POLICY` échouent sur une base déjà installée. |

## Étape 0 : sauvegarder

Une migration ne s'annule pas d'un clic. Avant de lancer quoi que ce soit, garder une copie des données.

**Option simple, sans outil :** dans Supabase, **Table Editor**, pour chacune des tables `profiles`, `expenses`, `expense_history`, `periods`, `units` et `expense_categories` : bouton **Export** puis **Export to CSV**.

**Option complète, avec `pg_dump` :** le mot de passe de la base est dans **Project Settings → Database** (ne jamais le committer).

```bash
pg_dump "postgresql://postgres:MOT_DE_PASSE@db.jthbkzcicmhrdewvgauw.supabase.co:5432/postgres" \
  --schema=public --data-only --file="sauvegarde-$(date +%F).sql"
```

Les fichiers des justificatifs ne sont pas touchés par les étapes 2 à 4. L'étape 5 les copie avant de supprimer les originaux.

## Étape 1 : voir ce qui est déjà appliqué

Ouvrir **SQL Editor → New query**, coller ce bloc et cliquer **Run** :

```sql
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) as audit_20261109000000_appliquee,
  exists (
    select 1 from pg_trigger where tgname = 'trg_protect_expense_inserts'
  ) as securite_20261109000001_appliquee,
  (select count(*) from public.expenses where proof_path not like '%/%') as justificatifs_a_ranger;
```

| Résultat | À faire |
| :--- | :--- |
| `audit… = false` | Étapes 2 à 6 |
| `audit… = true`, `securite… = false` | Étapes 3 à 6 |
| les deux à `true`, `justificatifs_a_ranger > 0` | Étapes 5 et 6 |
| les deux à `true`, `justificatifs_a_ranger = 0` | Rien à faire, passer à l'étape 4 pour contrôler |

## Étape 2 : lancer la migration d'audit (`20261109000000`)

1. Ouvrir le fichier en version brute : [`20261109000000_audit_fixes_complete.sql`](https://raw.githubusercontent.com/meutesaintfrancois78/comptagroupe/main/supabase/migrations/20261109000000_audit_fixes_complete.sql).
2. Tout sélectionner (`Ctrl+A`) et copier.
3. Dans Supabase : **SQL Editor → New query**, coller, puis **Run**.
4. Résultat attendu : `Success. No rows returned`.

Ce que la migration change :

- ajoute à `profiles` les colonnes `email` (recopiée depuis les comptes) et `requested_unit_id` (demande de changement d'unité) ;
- permet à un chef actif de lire les noms des autres membres, pour afficher l'auteur d'une dépense ;
- interdit à un chef de changer son rôle, son statut ou ses unités ;
- interdit à un chef de modifier une dépense remboursée, de changer son unité, son auteur ou sa période, ou de la marquer « Remboursée » ;
- l'inscription crée toujours un chef **en attente**, sauf pour `ben.dupont@groupe-enf.fr` et `admin.dupont@groupe-enf.fr`, qui deviennent admin (**phase de test**, à retirer avant la mise en production) ;
- **supprime des données** : la dépense de test de l'audit (commentaire « =1+1 TEST audit Claude ») et les profils sans compte associé.

> [!NOTE]
> La ligne `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY` est mise en commentaire dans le fichier. Sur Supabase, elle échoue avec « must be owner of table objects » et bloque tout le script, alors que la RLS est déjà active sur cette table.

## Étape 3 : lancer la migration de sécurité (`20261109000001`)

Même méthode, avec ce fichier : [`20261109000001_securite_complements.sql`](https://raw.githubusercontent.com/meutesaintfrancois78/comptagroupe/main/supabase/migrations/20261109000001_securite_complements.sql).

Ce que la migration change :

| Changement | Pourquoi |
| :--- | :--- |
| Les triggers de protection ne s'appliquent qu'aux appels venant de l'appli | Sinon toute maintenance lancée depuis l'éditeur SQL (changer un rôle, une unité) est refusée |
| Une dépense créée par un chef a toujours son auteur et un statut de remboursement imposés | Un chef ne peut plus créer une dépense déjà « Remboursée » |
| Un profil créé depuis l'appli est toujours un chef en attente | Personne ne peut se créer un profil admin |
| Un chef ne peut plus modifier l'email de son profil | L'email affiché aux admins reste celui du compte |
| Justificatifs cloisonnés par unité : dossier `<id de l'unité>/` | Un chef ne lit et n'envoie que les justificatifs de ses unités ; l'admin voit tout ; seul l'admin supprime |

Après cette étape, les anciens justificatifs posés à la racine du bucket ne sont plus visibles que des admins : c'est l'objet de l'étape 5.

## Étape 4 : contrôler

Coller ce bloc dans une nouvelle requête :

```sql
-- 1. Triggers attendus sur expenses et profiles
select tgrelid::regclass as table_name, tgname
from pg_trigger
where tgrelid in ('public.expenses'::regclass, 'public.profiles'::regclass)
  and not tgisinternal
order by 1, 2;

-- 2. Règles du stockage des justificatifs
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'receipts_%'
order by 1;

-- 3. Règle de création de profil
select policyname, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_policy';
```

Ce qu'on doit voir :

| Requête | Résultat attendu |
| :--- | :--- |
| 1 | Sur `expenses` : `tr_expense_changes`, `trg_protect_expense_inserts`, `trg_protect_expense_updates`. Sur `profiles` : `tr_profiles_last_admin_check`, `tr_profiles_last_admin_delete`, `trg_protect_profile_updates`. |
| 2 | `receipts_delete_policy` (DELETE), `receipts_insert_policy` (INSERT), `receipts_select_policy` (SELECT) |
| 3 | Une condition qui contient `role = 'chef'` et `status = 'pending'` |

## Étape 5 : ranger les anciens justificatifs

Le script [`scripts/move-root-receipts.ts`](../scripts/move-root-receipts.ts) copie chaque justificatif de la racine du bucket dans le dossier de son unité, met à jour la dépense, puis supprime l'original quand plus rien ne pointe dessus.

Il a besoin de la clé **service_role** : **Project Settings → API → service_role**. Cette clé contourne toutes les règles d'accès : ne jamais la committer, ni la mettre dans une variable `VITE_` (elle partirait dans le site).

**1. Simulation** (n'écrit rien, affiche ce qui serait fait) :

```bash
SUPABASE_URL=https://jthbkzcicmhrdewvgauw.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=COLLER_LA_CLE_ICI \
npx --yes bun@1 run scripts/move-root-receipts.ts
```

**2. Exécution**, si la simulation est correcte :

```bash
SUPABASE_URL=https://jthbkzcicmhrdewvgauw.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=COLLER_LA_CLE_ICI \
npx --yes bun@1 run scripts/move-root-receipts.ts --apply
```

Le script peut être relancé : il ne traite que les justificatifs encore à la racine. Pour vérifier, relancer la requête de l'étape 1 : `justificatifs_a_ranger` doit valoir `0`.

## Étape 6 : tester dans l'appli

Sur [comptagroupe.vercel.app](https://comptagroupe.vercel.app), avec les comptes de test du README :

| En tant que | Faire | Résultat attendu |
| :--- | :--- | :--- |
| Chef (Guillaume) | Déclarer une dépense avec une photo | « Super, c'est validé ! » et la vignette visible dans la liste |
| Chef (Guillaume) | Ouvrir une dépense remboursée | Fenêtre en lecture seule, aucun bouton Enregistrer |
| Chef (Guillaume) | En-tête → Changer d'unité → choisir une unité → Envoyer | « Demande en attente » |
| Admin (Benoît) | Ouvrir l'appli | La fenêtre « Comptes chefs en attente » affiche la demande de Guillaume |
| Admin (Benoît) | Onglet Comptes | L'email apparaît sous chaque nom |
| Admin (Benoît) | Onglet Dépenses | Les vignettes des justificatifs s'affichent |
| Chef d'une autre unité | Ouvrir sa liste de dépenses | Il ne voit pas les dépenses ni les justificatifs de Meute 1 |

## Installer une base neuve

Pour un nouveau projet Supabase : lancer dans l'ordre, chacun dans une nouvelle requête de l'éditeur SQL.

1. Les six fichiers de [`supabase/migrations/`](../supabase/migrations), dans l'ordre du tableau [Les fichiers](#les-fichiers).
2. [`supabase/seed.sql`](../supabase/seed.sql) : unités, catégories, première période.
3. Pendant la phase de test seulement : [`supabase/seed_test_data.sql`](../supabase/seed_test_data.sql).

Puis, dans Vercel, renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` avec les valeurs de **Project Settings → API**.

## Problèmes fréquents

| Message | Cause | Que faire |
| :--- | :--- | :--- |
| `must be owner of table objects` | Une ligne `ALTER TABLE storage.objects …` est encore active | Vérifier qu'on a bien la dernière version du fichier (la ligne y est en commentaire) |
| `Interdit : Seul un administrateur peut …` dans l'éditeur SQL | La migration `20261109000001` n'est pas encore passée | Lancer l'étape 3 : les triggers laissent ensuite passer l'éditeur SQL |
| `Interdit : …` dans l'appli | Un chef tente une action réservée à l'admin | Comportement voulu |
| `new row violates row-level security policy` à l'envoi d'un justificatif | Le chef n'est pas actif, ou l'unité de la dépense n'est pas la sienne | Vérifier `status` et `primary_unit_id` / `secondary_unit_id` du chef dans `profiles` |
| `column "email" does not exist` | La migration `20261109000000` n'est pas passée | Lancer l'étape 2 |
| Vignettes vides côté chef seulement | Justificatifs encore à la racine du bucket | Étape 5 |

## Revenir en arrière

À n'utiliser qu'en cas de blocage. Ce bloc annule **`20261109000001`** et rouvre le stockage comme après `20261109000000` :

```sql
drop trigger if exists trg_protect_expense_inserts on public.expenses;
drop function if exists public.protect_expense_inserts();

drop policy if exists "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "receipts_insert_policy" on storage.objects;
create policy "receipts_insert_policy" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts');

drop policy if exists "receipts_select_policy" on storage.objects;
create policy "receipts_select_policy" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts');

drop function if exists public.my_unit_ids_text();
```

Les fonctions `protect_profile_updates` et `protect_expense_updates` gardent leur nouvelle version, plus souple pour l'éditeur SQL. Pour revenir à l'ancienne, relancer `20261109000000`.

`20261109000000` ne s'annule pas proprement : elle a supprimé des données (voir l'étape 2). Pour revenir avant elle, restaurer la sauvegarde de l'étape 0.

## Journal des migrations appliquées

Supabase ne garde pas la trace des scripts lancés à la main. Noter ici chaque passage, pour savoir où en est la base.

| Date | Base | Migration | Par | Remarque |
| :--- | :--- | :--- | :--- | :--- |
| | test (`jthbkzcicmhrdewvgauw`) | `20261108000000` à `20261108000002` + `seed.sql` | | installation initiale, date à compléter |
| 09/11/2026 | test | `20261109000000` | Joseph (avec Claude) | sauvegarde préalable dans les tables `public.sauvegarde_20261109_*` |
| 09/11/2026 | test | `20261109000001` | Joseph (avec Claude) | contrôles de l'étape 4 au vert |
| 09/11/2026 | test | justificatifs rangés (étape 5) | Joseph (avec Claude) | 5 fichiers déplacés depuis l'onglet Storage, `proof_path` mis à jour en SQL |
| 09/11/2026 | test | `20261109000002` (connexion Google) | Joseph (avec Claude) | |
