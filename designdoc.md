# Cahier des charges - Appli de remontée de dépenses (groupe ENF)

## 1. Contexte et objectif

La comptabilité d'un groupe scout (Éclaireurs Neutres de France, ENF) est pénible et les solutions comptables classiques sont trop compliquées. Cette appli ne remplace pas une comptabilité : c'est un outil de **remontée de dépenses côté chefs d'unité**. Un chef déclare une dépense avec son justificatif, et les admins (chefs de groupe, trésoriers) voient tout sans courir après les tickets. La gestion comptable côté association reste hors périmètre.

## 2. Contraintes générales

- Web app, **mobile first**, **progressive web app (PWA)** installable sur l'écran d'accueil du téléphone.
- **Pas de mode hors connexion** : si le réseau manque, un écran explique "Pas de connexion, reviens quand tu captes". Seul le formulaire en cours est gardé en mémoire locale pour ne pas être perdu.
- **Complètement gratuit** : hébergement GitHub + Vercel (ou Cloudflare Pages / GitHub Pages si l'offre Vercel pose problème pour un usage associatif), base de données, stockage et authentification via **Supabase** (offre gratuite).
- Pas de nom de domaine : adresse gratuite fournie par l'hébergeur.
- Pas de données existantes à migrer.
- Comptes GitHub et Supabase au nom de l'association, pas d'une seule personne.

## 3. Rôles et comptes

Deux rôles uniquement :

- **Chef** : saisit et consulte les dépenses de son unité.
- **Admin** : tous les admins ont exactement les mêmes droits. Un admin peut promouvoir un chef en admin ou retirer ce rôle. Garde-fou : impossible de retirer le dernier admin.

**Inscription d'un chef** : compte personnel (mail + mot de passe), prénom et nom réels obligatoires (consigne visible : "pas ton nom scout"), choix de **son unité** dans une liste, acceptation des conditions d'utilisation, confirmation du mail. Le compte reste **en attente** (aucun accès aux données) tant qu'un admin ne l'a pas validé.

- Un chef = une seule unité à l'inscription. Si un chef doit être dans deux unités, il le demande de vive voix ou par mail à un admin, qui l'ajoute à la main depuis sa fiche. Dans ce cas, un sélecteur d'unité apparaît en haut de son accueil.
- Un admin peut modifier l'unité d'un chef, désactiver un compte (chef parti) ou le refuser.
- **Mot de passe oublié** : réinitialisation par mail via Supabase Auth (gratuit), pour chefs et admins.
- Le tout premier admin et les unités de départ sont créés à la main dans la base.

**Notifications par mail** (gratuit via Supabase) :

- Au chef quand son compte est accepté.
- Au chef quand son compte est refusé.
- Au chef quand une de ses dépenses "à rembourser" passe en "remboursée".

## 4. Parcours chef

### Accueil

Deux gros boutons :

1. **Nouvelle dépense** (le plus gros et le plus visible).
2. **Dépenses totales** : même tableau que la vue admin, mais verrouillé sur son unité.

Un chef tout neuf sans dépense voit un écran vide explicatif. Un compte en attente voit un écran "en attente de validation".

### Saisie d'une dépense (formulaire en plusieurs étapes)

1. **Nom** : rempli automatiquement depuis le compte (pas de saisie).
2. **Montant** : obligatoire, supérieur à zéro, virgule ou point acceptés et convertis automatiquement, deux décimales maximum.
3. **Motif** : menu déroulant de catégories obligatoire (nourriture, transport, matériel, hébergement, etc., liste à définir). L'option **"Autre"** ouvre un champ texte libre obligatoire. Un petit bouton discret **"Dernier motif"** pré-remplit le dernier motif utilisé.
4. **Mode de paiement** : obligatoire, **argent de l'unité (par défaut)** ou **argent perso**.
5. **Justificatif** : obligatoire, photo prise directement avec l'appareil ou fichier choisi dans la galerie / les fichiers. Formats image et PDF uniquement, taille maximale. **Compression dans le navigateur** avant envoi (environ 1 Mo).
6. **Récapitulatif et validation** : la **date** est par défaut celle du jour, modifiable. Un **commentaire facultatif** n'apparaît qu'à cette étape. Le bouton de validation se désactive après un clic (anti-doublon). Message de confirmation après envoi.

Sans réseau, l'envoi est bloqué avec un message clair, le formulaire reste en mémoire locale.

### Consultation et correction

- Le chef voit **toutes les dépenses de son unité** et peut **toutes les modifier**, pas seulement les siennes.
- Il **ne peut pas supprimer** : seuls les admins suppriment.
- Chaque ligne a des boutons modifier et historique (au survol sur ordinateur, toujours visibles ou menu à trois points sur mobile).
- **Historique des modifications** : qui, quand, ancienne valeur.

## 5. Parcours admin

- **Bannière de validation** : tant qu'il y a des comptes chefs en attente, un grand écran plein s'impose à l'admin. Il peut le fermer (bouton "plus tard"), mais il **revient automatiquement toutes les 3 minutes**.
- **Tableau global des dépenses** : colonnes date, unité, nom du chef, montant, motif, mode de paiement, statut de remboursement, justificatif (vignette cliquable, affichable et téléchargeable).
- **Filtres** : par unité, par période, par chef, par statut de remboursement. Total en bas selon le filtre actif.
- **Sélecteur de période** en haut (année, camp, etc.).
- **Remboursements** : une dépense en argent perso est "à rembourser". L'admin la passe en "remboursée" (tout ou rien, pas de remboursement partiel), ce qui envoie un mail au chef.
- Gestion des comptes : valider, refuser, désactiver, changer l'unité, ajouter une 2e unité, promouvoir en admin.
- Gestion des unités et des listes (catégories de motifs).
- Suppression d'une dépense (admins uniquement).
- Design de l'écran admin à travailler (tableau dense, lisible sur mobile aussi).

## 6. Périodes : année, camp, clôture, purge

- Les dépenses sont rattachées à une **période** : l'année, puis le camp.
- Un admin peut **clôturer l'année pour tout le monde** et **ouvrir le camp pour tout le monde**.
- Après clôture : les chefs **n'ont plus accès** à la période clôturée, qui devient en **lecture seule** et visible uniquement des admins.
- Une période clôturée **reste conservée en entier** (dépenses et justificatifs) et reste **exportable**.
- Un **export automatique** est fait juste avant une clôture.
- Un admin peut **rouvrir** une période clôturée en cas d'erreur.
- Un admin peut **purger** une période, avec confirmation forte et export obligatoire juste avant (irréversible). Conservation par défaut jusqu'à décision de l'association (par exemple dix ans pour des pièces comptables, à valider).

## 7. Exports

- **Export du tableau en CSV** (ouvrable dans Excel), avec **choix des colonnes et du tri**, le plus modulaire possible.
- **Export de tous les justificatifs** dans un fichier zip, chaque fichier nommé avec la date, l'unité et le montant.
- Export possible pour une période clôturée.

## 8. Technique

- **Base de données Supabase** : table des dépenses avec un champ **type** (valeur par défaut "dépense") pour permettre d'ajouter plus tard des entrées d'argent (cotisations, subventions) sans tout refaire. Tables pour unités, profils, périodes, historique des modifications.
- **Authentification Supabase Auth** avec confirmation de mail et réinitialisation de mot de passe. Limitation des tentatives de connexion native.
- **Sécurité** : politiques de sécurité au niveau des lignes (RLS) : un chef ne lit et ne modifie que les dépenses de son unité, un admin accède à tout, un compte en attente ne voit rien. Aucune vérification d'accès uniquement côté navigateur.
- **Stockage des justificatifs en privé**, accessible par **liens temporaires** générés à la demande et valables quelques minutes.
- **Éviter la mise en pause** de Supabase gratuit (après environ une semaine d'inactivité) par un **ping planifié via GitHub Actions** toutes les quelques jours, avec alerte mail native en cas d'échec. Une base en pause se réveille en un clic sans perte de données.
- Limite de stockage gratuit d'environ 1 Go : la compression des photos et les exports réguliers servent de garde-fou et de sauvegarde.

## 9. Tests

- Test réel sur le terrain avec de vrais chefs.
- **Page de test cachée**, accessible uniquement aux admins connectés et seulement en connaissant l'URL : remplir avec de fausses données, tout réinitialiser, envoyer un mail de test, etc. **Cette page est supprimée (pas juste désactivée) au passage en production.**

## 10. Légal et données personnelles

- L'agent de développement cherchera sur internet les règles spécifiques à une association rattachée aux **Éclaireurs Neutres de France (ENF)** (documents types éventuels sur les données personnelles).
- Il rédigera de bonne foi des **conditions d'utilisation** et une **page de confidentialité** (données stockées, finalité, durée de conservation, accès), avec case d'acceptation à l'inscription. Il n'y a pas de juriste : le texte sera relu en rendez-vous avec les chefs de groupe et l'association.
- Attention aux justificatifs pouvant contenir des informations sensibles, et à la présence éventuelle de mineurs.

## 11. Points restant à faire ou à vérifier

- Liste précise des catégories de motifs.
- Vérifier que l'offre gratuite de l'hébergeur choisi convient à un usage associatif.
- Rédaction de la documentation de maintenance au fil du développement (reprise du projet par un autre bénévole, sauvegarde et restauration).
- Design de l'écran admin.
- Relecture des conditions d'utilisation avec l'association.

## 12. Design system

- Couleurs principales : **vert et blanc**.
- Couleurs fonctionnelles à définir : erreur (rouge), avertissement (orange), succès, gris pour textes secondaires et bordures.
- **Mode clair par défaut**, **mode sombre automatique** selon le réglage du navigateur, **non réglable** dans l'appli.
- Composants : **shadcn/ui** avec Tailwind, tous les réglages de thème (couleurs, rayons, typographie) centralisés en un seul endroit.
- Mobile first : boutons larges, formulaire à étapes lisible au pouce, tableau admin utilisable sur petit écran.

### Mascotte : Marty le bison

Marty est un petit bison **kawaii** original : corps tout rond, grands yeux brillants, joues roses, petit foulard scout vert, et un carnet de comptes sous le bras. Il existe en plusieurs expressions (content, endormi, perdu, penaud, qui saute de joie). Il n'est pas inspiré d'un personnage protégé : design entièrement original.

Où il apparaît :

- Écrans de connexion et d'inscription : Marty fait coucou.
- Écran "compte en attente de validation" : Marty patiente, assis, avec une petite horloge.
- Accueil d'un chef tout neuf sans dépense : Marty tend les mains, "à toi de jouer".
- Confirmation après une dépense : Marty saute de joie.
- Écran sans connexion : Marty dort ou cherche du réseau avec une antenne.
- Page d'erreur : Marty est tout penaud.

Côté admin, Marty n'apparaît que sur l'écran de connexion, jamais ailleurs (ni tableaux, ni bannière de validation, ni écrans de travail), pour garder le sérieux là où l'on travaille.

**Production des visuels de Marty** (aucune compétence graphique requise) :

- Générer d'abord une **image de référence** de Marty avec un outil d'image IA (Midjourney, Ideogram qui a une offre gratuite, ou ChatGPT).
- Générer ensuite les autres expressions **en partant de cette image de référence**, pour garder un personnage cohérent.
- **Animations** : plutôt que de la vidéo, utiliser du **Lottie** (créable gratuitement avec LottieFiles) ou de simples images qui changent avec un léger effet de rebond en CSS.
- Formats légers pour le mobile : SVG ou WebP.

## 13. Méthode de développement

- **Objectif** : réaliser une **POC en one shot, avec toutes les fonctionnalités d'un coup**, par un **agent IA**.
- **TDD (test driven development)** obligatoire : les tests sont écrits avant le code.
- Le cahier des charges est **découpé en lots** (par exemple : authentification et rôles, saisie de dépense, tableau et filtres, remboursements, périodes et clôture, exports, page de test), même si tout est livré d'un coup.
- L'agent fait des **commits réguliers en local**. Le dépôt est fourni à l'agent, mais **rien n'est poussé automatiquement** : l'humain pousse après relecture.

## 14. Stack technique : point ouvert

La stack n'est **pas validée** et reste à rediscuter. Préférence exprimée : **ne pas utiliser Node.js**. Les choix à confirmer sont donc ouverts (framework front, outils de test, envoi des mails). Les briques déjà décidées, indépendantes de ce point, sont Supabase (base, stockage, authentification), shadcn/ui, PWA et hébergement gratuit.
