# Feuille de route de Berger

Le but et le détail de chaque fonction sont dans `VISION.md`. Une phase ne
commence que quand la précédente marche, vue dans l'application lancée.

| Phase | Nom | État |
|---|---|---|
| 0 | Preuve de concept | Faite (bilan : `docs/notes/bilan-phase0-poc.md`) |
| 1 | Maquette et conception globale | À faire |
| 2 | Le cadre de la fenêtre | À faire |
| 3 | Workspaces, spaces et agents | À faire |
| 4 | Fichiers | À faire |
| 5 | L'éditeur complet | À faire |
| 6 | Panneau Outils et Git | À faire |
| 7 | Les autres machines | À faire |
| 8 | Berger au quotidien | À faire |

## Phase 0 : preuve de concept

Faite. Berger se branche sur herdr-core, montre les spaces, les terminaux et
l'état des agents en direct, ouvre un terminal du core et un fichier dans Monaco
(`cmd-f`, `cmd-s`).

Reste à vérifier par Antoine : un vrai terminal ouvert dans Berger avec Herdr à
côté, et le renommage d'un space dans Herdr suivi par Berger.

## Phase 1 : maquette et conception globale

Décider à quoi ressemble Berger avant de construire la suite.

- Trancher ce que Berger garde de la disposition de Herdr (blocs, panneaux) et
  ce qu'il fait à sa façon (la question ouverte de `VISION.md`).
- Maquettes des écrans principaux : la fenêtre entière, la barre des
  workspaces, les listes de spaces et d'agents, la barre d'onglets,
  l'explorateur, le panneau Outils, `cmd-p`. Sources d'inspiration :
  `docs/inspiration-ui/`.
- Le libellé des terminaux (au lieu de `utilisateur@machine:chemin`).
- Le découpage du code : quels modules purs, repris ou non du mod `antoine`,
  comment l'état de la fenêtre est gardé et rangé.
- La liste des raccourcis clavier.

Fini quand : les maquettes et un document de conception sont validés par
Antoine.

## Phase 2 : le cadre de la fenêtre

Monter la disposition décidée en phase 1, sans encore toutes les fonctions.

- Les colonnes et panneaux, leurs largeurs gardées d'une session à l'autre.
- Plusieurs terminaux ouverts en même temps, en onglets et en découpages.
- La barre d'onglets : terminaux à gauche, fichiers à droite, clic molette
  pour fermer, défilement vers l'onglet actif.
- Les raccourcis de base (`cmd-s`, `cmd-w`).
- Les petits défauts laissés par la phase 0 (voir le bilan).

## Phase 3 : workspaces, spaces et agents

Reprendre l'organisation du mod `antoine`.

- La barre d'emojis des workspaces, son menu au clic droit et ses dialogues.
- La liste des spaces filtrée sur le workspace, « Nouveau space » quand il est
  vide.
- La liste des agents : filtrée, nom du space sur chaque ligne, tri « Ordre des
  spaces », sous-agents de Claude Code (par les hooks), clic qui ramène au
  terminal.

## Phase 4 : fichiers

- L'explorateur : fichiers masqués comme VS Code, ignorés par git en grisé,
  couleurs git, corbeille avec confirmation, icônes Material Icon.
- `cmd-p` : recherche rapide et fichiers récents.
- Ouverture depuis l'explorateur, `cmd-p`, le Finder (glisser-déposer) et le
  menu « Ouvrir un fichier… ».
- Les onglets de fichiers épinglables, le dossier affiché quand deux fichiers
  ont le même nom, la visionneuse d'images.

## Phase 5 : l'éditeur complet

La raison d'être de Berger.

- Recherche et remplacement dans tout le projet.
- Les serveurs de langage : complétion, aller à la définition, erreurs
  soulignées.
- Les différences git dans la marge et la vue côte à côte.
- Retour à la ligne, réglage de la couleur de sélection, coloration de tous les
  langages.

## Phase 6 : panneau Outils et Git

- Le panneau à droite avec sa propre largeur, un terminal par space.
- La partie Git façon lazygit : changements, branches, graphe des commits,
  fetch (`f`), mise à jour d'une branche sans la changer, suppression de
  branche locale, distante ou les deux.

## Phase 7 : les autres machines

- Se brancher sur le core d'une autre machine (ssh, VPS) et voir ses spaces,
  terminaux et agents à côté de ceux de la machine locale.
- Ouvrir et enregistrer les fichiers de ces machines dans l'éditeur.

## Phase 8 : Berger au quotidien

Pouvoir se passer de l'app Herdr.

- Une application installée (empaquetée, avec son icône), lancée sans
  `npm run dev`.
- Les réglages (thème, police, raccourcis).
- Une semaine d'usage réel, et la liste de ce qui manque encore.
