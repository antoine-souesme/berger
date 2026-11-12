# Berger — phase 4, fichiers

Date : 2026-11-12. Contexte : `docs/VISION.md`, `docs/suivi/ROADMAP.md`,
`CLAUDE.md`. Phases précédentes : `2026-11-12-phase2-cadre-design.md`,
`2026-11-12-phase3-workspaces-design.md`.

## Intention

Le gros souci d'Antoine avec Herdr, c'est la gestion des fichiers. Cette phase
donne à Berger un explorateur et une ouverture de fichiers aussi commodes que
dans VS Code, en reprenant tout ce que son mod `antoine` fait déjà : trouver un
fichier vite, l'ouvrir d'où qu'il vienne, garder ses onglets de fichiers en
ordre.

## Maquettes

- `docs/maquettes/vue-principale.html` et `vue-fichier.html` : l'explorateur
  (racines par space et dossiers ajoutés, couleurs git, ignorés en gris),
  les onglets de fichiers à droite du séparateur, le bouton qui affiche ou
  masque l'explorateur en haut de la barre des workspaces.
- `docs/maquettes/explorateur.html` : le menu du clic droit de l'explorateur,
  le glisser-déposer, la confirmation de mise à la corbeille, les onglets de
  fichiers (épinglé, même nom, non enregistré) et leur menu du clic droit, la
  visionneuse d'images.
- `docs/maquettes/recherche-fichiers.html` : la recherche de fichiers (`⌘P`).
- `docs/maquettes/README.md` : règles visuelles (lignes de 22 px, police
  système 13 px, retrait de 8 px, couleurs git de VS Code, icônes Material
  Icon Theme, noms sans gras).

## Ce qu'Antoine doit pouvoir faire (objectifs)

1. **Parcourir les fichiers du workspace** dans l'explorateur et le masquer
   ou l'afficher d'un clic (`⇧⌘E`).
2. **Ranger ses fichiers** sans quitter Berger : créer, renommer, copier,
   coller, déplacer par glisser-déposer, mettre à la corbeille.
3. **Trouver un fichier en quelques touches** avec `⌘P`, et rouvrir un fichier
   récent.
4. **Ouvrir un fichier de partout** : explorateur, `⌘P`, glisser-déposer
   depuis le Finder, menu « Ouvrir un fichier… ». Les images s'ouvrent dans
   leur visionneuse.
5. **Tenir ses onglets de fichiers** : épingler ceux qu'il garde, fermer d'un
   clic molette, distinguer deux fichiers de même nom, retrouver ses onglets
   au relancement.

## Le comportement attendu

**Afficher ou masquer l'explorateur.** Le premier bouton de la barre des
workspaces (icône de fichiers) montre ou cache la colonne de l'explorateur,
comme dans VS Code ; `⇧⌘E` fait de même. L'état est retenu.

**Racines.** Une racine par space du workspace ouvert (le dossier de son
premier terminal, nom en couleur, chemin en gris), puis les dossiers ajoutés à
la main par « Ajouter un dossier » (bouton en tête de l'explorateur, et en bas
de la liste), retenus par workspace. Les racines se réordonnent en les
glissant. Bouton « Tout replier ». Dossiers dépliés retenus par workspace.
Workspace sans space : « Aucun space dans ce workspace » et « Ajouter un
dossier ».

**Affichage.** Fichiers masqués comme dans VS Code (`.git`, `.DS_Store`,
`Thumbs.db`, `CVS`…, liste du mod `explorer.js`), ce que git ignore en gris,
couleurs git de VS Code (modifié, ajouté, non suivi `U`, supprimé, en
conflit), avec le point de couleur remonté sur les dossiers parents, icônes du
thème Material Icon. L'explorateur suit les changements du disque (un agent
crée un fichier : il apparaît) sans qu'Antoine rafraîchisse.

**Menu du clic droit** (sur un fichier ou un dossier) : « Nouveau fichier »,
« Nouveau dossier », séparateur, « Renommer » (F2), « Copier » (`⌘C`),
« Coller » (`⌘V`), « Copier le chemin » (`⌥⌘C`), séparateur, « Afficher dans
le Finder », « Ouvrir dans VS Code », séparateur, « Mettre à la corbeille »
(`⌘⌫`). Sur une racine ajoutée à la main : « Retirer de l'explorateur » en
plus. Nouveau fichier, nouveau dossier et renommer se font sur place dans
l'arbre (champ dans la ligne, `↵` valide, `Échap` annule). Copier / coller
passent par le presse-papiers de macOS (un fichier copié dans le Finder se
colle dans Berger, et l'inverse).

**Glisser-déposer dans l'explorateur**, comme dans VS Code : glisser un ou
plusieurs fichiers ou dossiers sur un dossier les y déplace (le dossier cible
est surligné) ; `⌥` pendant le dépôt copie au lieu de déplacer. Un nom déjà
pris demande quoi faire (remplacer, garder les deux, annuler). Les onglets
ouverts des fichiers déplacés suivent leur nouveau chemin. Glisser depuis le
Finder vers un dossier de l'explorateur y copie les fichiers.

**Mise à la corbeille.** Toujours la corbeille de macOS, jamais une
suppression définitive. Dialogue : « Supprimer « nom » ? », « Il sera placé
dans la corbeille. », « Annuler » / « Mettre à la corbeille ».

**Recherche de fichiers (`⌘P`)**, maquette `recherche-fichiers.html` : une
fenêtre en haut au centre, un champ, la liste des fichiers du workspace
(toutes ses racines) qui correspondent, les lettres trouvées surlignées, le
dossier en gris. Champ vide : les fichiers récents. Flèches et `↵` pour
ouvrir, `Échap` pour fermer. Les fichiers ignorés par git et les dossiers
masqués sont exclus. Les règles de tri du mod (`quickopen.js`) sont reprises.

**Ouvrir un fichier.** Depuis l'explorateur (clic), `⌘P`, un dépôt du Finder
sur la fenêtre (hors explorateur : chaque fichier s'ouvre, le dernier est
affiché), le menu « Fichier › Ouvrir un fichier… » (`⌘O`, sélecteur de
macOS). Un fichier ouvert devient un onglet de fichier du workspace et
s'affiche. Les images (`png`, `jpg`, `gif`, `webp`, `bmp`, `ico`, `tiff`,
`svg`) s'ouvrent dans la visionneuse : image centrée sur un damier discret,
chemin en bandeau, dimensions et poids en bas.

**Onglets de fichiers.** Retenus par workspace (pas par space), comme dans le
mod (`files.js` : `pinned`, `open`, `shown`). Les épinglés passent en premier
et portent une punaise à la place de la croix. Deux onglets de même nom
affichent aussi leur dossier en gris (`fileLabels`). Un fichier non enregistré
montre un point à la place de la croix. Clic molette : fermer. Clic droit :
menu « Épingler » (ou « Désépingler »), « Enregistrer » (`⌘S`), séparateur,
« Fermer » (`⌘W`). Les modifications restent en attente tant qu'Antoine
n'enregistre pas (pas d'enregistrement automatique en changeant d'onglet,
contrairement au mod) ; fermer un onglet ou quitter Berger avec un fichier non
enregistré ouvre la question de VS Code : « Enregistrer », « Ne pas
enregistrer », « Annuler » (règle posée en phase 2).

Au relancement, Berger rouvre tous les onglets de fichiers de chaque workspace
(épinglés et ouverts) et le fichier affiché, contrairement au mod qui ne
gardait que les épinglés (`boot` de `files.js` : ne pas reprendre). Un fichier
qui n'existe plus est retiré sans bruit.

**Reprise depuis Herdr, une seule fois**, comme les workspaces en phase 3 : au
premier lancement de cette phase, Berger lit dans
`~/.config/herdr-app/shared.json` (lecture seule) les dossiers ajoutés
(`antoine.folders`), les fichiers récents (`antoine.recent`) et les onglets
de fichiers (`antoine.files`) de chaque workspace, puis ne relit plus ce
fichier.

## Hors périmètre

Recherche dans le contenu des fichiers et remplacement (phase 5),
différences git (phase 5), fichiers d'autres machines (phase 6),
aperçu Markdown.

## À ne surtout pas faire (anti-objectifs)

- Supprimer un fichier définitivement : toujours la corbeille, toujours après
  confirmation.
- Écraser un fichier existant sans le demander (déplacement, copie, collage,
  renommage).
- Figer l'interface sur un gros dossier (`node_modules`, dépôt de milliers de
  fichiers) : l'arbre se charge dossier par dossier, `⌘P` répond tout de suite.
- Modifier `~/.config/herdr-app/` ou `~/dev/playground/herdr-app-mod/`.

## Code à reprendre

Règles pures du mod `antoine` et leurs tests : `files.js` (onglets de
fichiers, dossiers ajoutés, images), `quickopen.js` (recherche et récents),
les règles d'affichage de `explorer.js` (fichiers masqués, couleurs git,
tri), `icons.js` + `material.js` + `icons/material/` (Material Icon Theme,
licence MIT). Les noter dans `docs/COPIES.md`.

## Laissé au développeur

Comment lister et surveiller les fichiers (par herdr-core, déjà utilisé en
phase 0 pour lire et écrire, ou directement par Node pour la machine locale :
au choix, tant que la phase 6 reste possible), la bibliothèque d'arbre, la
mise à la corbeille (`shell.trashItem` d'Electron), la façon de lire l'état git.

## Fini quand

Antoine, dans l'application lancée : masque et réaffiche l'explorateur ; crée,
renomme, copie, colle, déplace par glisser-déposer et met à la corbeille des
fichiers dans un dossier de test ; ouvre un fichier par chacun des quatre
chemins ; ouvre une image ; épingle un onglet, en ferme un au clic molette,
voit deux `index.ts` distingués par leur dossier ; relance et retrouve ses
onglets ; `npm test` passe.
