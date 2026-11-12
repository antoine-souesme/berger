# Berger — phase 5, l'éditeur complet

Date : 2026-11-12. Contexte : `docs/suivi/ROADMAP.md`,
`CLAUDE.md`. Phases précédentes : phases 2 à 4 dans ce dossier.

## Intention

L'éditeur est la raison d'être de Berger : celui de Herdr n'a ni recherche
sérieuse, ni aide du langage, ni vraie navigation. Cette phase fait de
l'éditeur Monaco de Berger un éditeur sur lequel Antoine peut travailler
toute la journée, au niveau de VS Code, pour les langages qu'il touche le plus.

## Maquettes

- `docs/maquettes/vue-fichier.html` : l'éditeur sur toute la largeur.
- `docs/maquettes/recherche-projet.html` : le panneau de recherche dans le
  projet, à la place de l'explorateur, ouvert par la loupe.
- `docs/maquettes/differences.html` : les différences git dans la marge, et
  la vue des différences côte à côte.
- `docs/maquettes/README.md` : règles visuelles.

## Ce qu'Antoine doit pouvoir faire (objectifs)

1. **Écrire du TypeScript avec l'aide du langage** : complétion, aller à la
   définition (y compris dans un autre fichier ou dans `node_modules`),
   survol avec le type et la doc, erreurs soulignées, renommer un symbole.
   Même chose pour JavaScript, JSON et YAML, dans un premier temps.
2. **Chercher et remplacer dans tout le projet**, et sauter aux résultats.
3. **Voir ce qui a changé** depuis le dernier commit : dans la marge, et côte à
   côte.
4. **Régler son confort** : retour à la ligne, couleur de sélection,
   plusieurs curseurs, repli du code, minicarte, thème `antoine-monokai`.

## Le comportement attendu

**Aide du langage.**
- TypeScript et JavaScript : Berger fait tourner le vrai service TypeScript
  du projet (celui de `node_modules/typescript` du dépôt s'il existe, sinon
  celui de Berger), avec son `tsconfig.json`, pour connaître tous les types du
  projet et de ses dépendances. Fonctions attendues : complétion, aller à la
  définition (`F12` et `⌘` clic), voir les références (`⇧F12`), survol, erreurs
  et avertissements soulignés (mis à jour en tapant et quand un agent modifie
  un fichier), renommer un symbole (F2 dans l'éditeur), organiser les imports.
  Aller à une définition dans un autre fichier l'ouvre en onglet de fichier.
- JSON : validation et complétion par schéma pour les fichiers connus
  (`package.json`, `tsconfig.json`, `.prettierrc`, `eslint`…) et les
  `$schema` déclarés.
- YAML : coloration, validation et complétion par schéma pour les fichiers
  connus (GitHub Actions, `docker-compose`, `.gitlab-ci.yml`…).
- Markdown : coloration (déjà là). Pas d'aperçu mis en forme.
- Les autres langages ont au moins leur coloration (tous ceux de Monaco).

**Recherche dans le projet.** La loupe sous le bouton de l'explorateur, dans la
barre des workspaces, ouvre le panneau « Rechercher » à la place de
l'explorateur (même largeur) ; `⇧⌘F` aussi, avec la sélection de l'éditeur
comme texte de départ. Champ de recherche avec trois bascules (respecter la
casse, mot entier, expression régulière), champ « Remplacer » avec
« Tout remplacer » et remplacement fichier par fichier, champs repliables
« Fichiers à inclure » / « Fichiers à exclure ». Le panneau cherche dans
toutes les racines du workspace ouvert, sans ce que git ignore. Résultats
groupés par fichier (icône, nom, dossier, nombre), chaque ligne avec le mot
surligné ; un clic ouvre le fichier à la bonne ligne, le mot surligné. Le
panneau garde sa recherche quand on revient à l'explorateur. Les résultats
arrivent au fil de l'eau, la recherche s'annule quand on retape.

**Différences git.**
- Dans la marge de l'éditeur : barre verte pour une ligne ajoutée, bleue pour
  une ligne modifiée, petit triangle rose là où des lignes ont été
  supprimées, par rapport au dernier commit (`HEAD`). Mis à jour en tapant et
  après un commit. Un clic sur une marque montre l'ancien texte en ligne et
  propose de l'annuler.
- Vue côte à côte : ouverte depuis le menu du clic droit de l'onglet de
  fichier (« Voir les différences ») ou depuis la marque de la marge. Elle
  s'ouvre dans un onglet de fichier « nom (différences) » : à gauche `HEAD` en
  lecture seule, à droite la copie de travail, modifiable. Flèches
  « différence précédente / suivante », bouton « Ouvrir le fichier ».

**Confort.**
- Retour à la ligne : `⌥Z` bascule, retenu. Plus aucune ligne cachée sous la
  minicarte.
- Couleur de sélection réglable (le réglage arrive dans la fenêtre des
  réglages en phase 7 ; dans cette phase, une valeur dans le fichier de
  réglages suffit).
- Plusieurs curseurs (`⌥` clic, `⌘D` dans l'éditeur pour la prochaine
  occurrence, `⌥⌘↑↓`), repli du code, minicarte : ceux de Monaco, actifs.
- Thème `antoine-monokai` complet pour tous les langages (pas seulement
  commentaires, chaînes et mots-clés).

**Raccourcis de cette phase** : `⇧⌘F` rechercher dans le projet, `⇧⌘H`
remplacer dans le projet, `⇧⌘E` revenir à l'explorateur, `F12` / `⇧F12`,
`⌥Z`. Quand l'éditeur a le clavier, le partage des touches suit la règle de
la phase 2 : l'éditeur garde ses raccourcis (`⌘D`, F2, `⌥⌘↑↓`…), sauf la
liste des raccourcis de Berger qui changent d'onglet, de space ou d'agent.

**« Tout remplacer »** montre d'abord combien d'occurrences et de fichiers
seront touchés et demande confirmation. Les fichiers ouverts reçoivent le
remplacement dans l'éditeur, non enregistrés (avec leur point, comme une
modification à la main). Les autres sont écrits sur le disque tout de suite,
mais seulement si leur contenu n'a pas changé depuis la recherche ; un fichier
changé entre-temps (par un agent) est sauté et signalé.

**Où tournent les services.** Aide du langage, recherche et lecture git
tournent sur la machine locale, lancés par la partie Node d'Electron. La
phase 6 (autres machines) est remise à plus tard ; ces services passent par un
point d'entrée unique par fonction, pour qu'elle puisse les faire passer par
herdr-core plus tard sans tout réécrire.

## Hors périmètre

Langages autres que TypeScript, JavaScript, JSON, YAML et Markdown pour l'aide
du langage (PHP, Python… plus tard, un par un), aperçu Markdown, débogueur,
extensions VS Code, git au-delà des différences (commit, branches : lazygit
dans un terminal), fichiers d'autres machines (phase 6).

## À ne surtout pas faire (anti-objectifs)

- Ralentir la frappe : l'aide du langage tourne hors de la fenêtre, et un
  service qui plante ou met du temps ne bloque jamais l'éditeur.
- Écraser les modifications d'un agent : un fichier changé sur le disque
  pendant qu'il est ouvert et non modifié se recharge ; modifié des deux
  côtés, Berger demande (règle de la phase 0, à garder).
- « Tout remplacer » sans montrer combien de fichiers et d'occurrences seront
  touchés.

## Laissé au développeur

La façon de brancher les services de langage sur Monaco (par exemple
`monaco-languageclient` avec `typescript-language-server` et
`yaml-language-server` lancés par la partie Node d'Electron, ou les services
intégrés de Monaco quand ils suffisent), l'outil de recherche (`ripgrep` est
le choix de VS Code), la lecture des différences git, le catalogue de schémas
JSON et YAML (SchemaStore).

## Fini quand

Antoine, dans l'application lancée, sur le dépôt de Berger : `F12` sur un
symbole importé ouvre sa définition dans un autre fichier ; une erreur de type
s'affiche soulignée en tapant ; un `package.json` mal formé est signalé ;
`⇧⌘F` trouve un mot dans tout le dépôt et le remplace dans deux fichiers ; la
marge montre ses changements et la vue côte à côte s'ouvre ; `⌥Z` replie les
lignes longues ; `npm test` passe.
