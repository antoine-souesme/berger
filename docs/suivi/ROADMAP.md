# Feuille de route de Berger

Le détail de chaque phase est dans sa spec (`docs/superpowers/specs/`), son
apparence dans les maquettes (`docs/maquettes/`). Une phase ne
commence que quand la précédente marche, vue dans l'application lancée.

| Phase | Nom | État |
|---|---|---|
| 0 | Preuve de concept | Faite (bilan : `docs/notes/bilan-phase0-poc.md`) |
| 1 | Maquette et conception globale | Faite (maquettes : `docs/maquettes/`) |
| 2 | Le cadre de la fenêtre | Faite, à vérifier par Antoine (bilan : `docs/notes/bilan-phase2-cadre.md`) |
| 3 | Workspaces, spaces et agents | Faite, à vérifier par Antoine (bilan : `docs/notes/bilan-phase3-workspaces.md`) |
| 4 | Fichiers | À faire |
| 5 | L'éditeur complet | À faire |
| 6 | Les autres machines | Remise à plus tard |
| 7 | L'application installée et ses réglages | À faire |

## Phase 0 : preuve de concept

Faite. Berger se branche sur herdr-core, montre les spaces, les terminaux et
l'état des agents en direct, ouvre un terminal du core et un fichier dans Monaco
(`cmd-f`, `cmd-s`).

Vérifié par Antoine le 12 novembre 2026 : un vrai terminal ouvert dans Berger
avec Herdr à côté, et le renommage d'un space dans Herdr suivi par Berger.

## Phase 1 : maquette et conception globale

Décider à quoi ressemble Berger avant de construire la suite.

- Trancher ce que Berger garde de la disposition de Herdr (blocs, panneaux) et
  ce qu'il fait à sa façon (tranché : celle de Herdr).
- Maquettes des écrans principaux : la fenêtre entière, la barre des
  workspaces, les listes de spaces et d'agents, la barre d'onglets,
  l'explorateur, `cmd-p`. Sources d'inspiration :
  `docs/inspiration-ui/`.
- Le libellé des terminaux (au lieu de `utilisateur@machine:chemin`).
- Le découpage du code : quels modules purs, repris ou non du mod `antoine`,
  comment l'état de la fenêtre est gardé et rangé.
- La liste des raccourcis clavier.

Fini quand : les maquettes et un document de conception sont validés par
Antoine.

## Phase 2 : le cadre de la fenêtre

Spec : `docs/superpowers/specs/2026-11-12-phase2-cadre-design.md`.

Monter la disposition décidée en phase 1, sans encore toutes les fonctions.

- Les colonnes et panneaux, leurs largeurs gardées d'une session à l'autre.
- Plusieurs terminaux ouverts en même temps, en onglets et en découpages.
- La barre d'onglets : terminaux à gauche, fichiers à droite, clic molette
  pour fermer, défilement vers l'onglet actif.
- Les raccourcis de base (`cmd-s`, `cmd-w`).
- Les petits défauts laissés par la phase 0 (voir le bilan).

## Phase 3 : workspaces, spaces et agents

Spec : `docs/superpowers/specs/2026-11-12-phase3-workspaces-design.md`.

Reprendre l'organisation du mod `antoine`.

- La barre d'emojis des workspaces, son menu au clic droit et ses dialogues.
- La liste des spaces filtrée sur le workspace, « Nouveau space » quand il est
  vide.
- La liste des agents : filtrée, nom du space sur chaque ligne, tri « Ordre des
  spaces », sous-agents lancés par `hc run`, clic qui ramène au
  terminal.

## Phase 4 : fichiers

Spec : `docs/superpowers/specs/2026-11-12-phase4-fichiers-design.md`.

- L'explorateur : fichiers masqués comme VS Code, ignorés par git en grisé,
  couleurs git, corbeille avec confirmation, icônes Material Icon.
- `cmd-p` : recherche rapide et fichiers récents.
- Ouverture depuis l'explorateur, `cmd-p`, le Finder (glisser-déposer) et le
  menu « Ouvrir un fichier… ».
- Les onglets de fichiers épinglables, le dossier affiché quand deux fichiers
  ont le même nom, la visionneuse d'images.

## Phase 5 : l'éditeur complet

Spec : `docs/superpowers/specs/2026-11-12-phase5-editeur-design.md`.

La raison d'être de Berger.

- Recherche et remplacement dans tout le projet.
- Les serveurs de langage : complétion, aller à la définition, erreurs
  soulignées.
- Les différences git dans la marge et la vue côte à côte.
- Retour à la ligne, réglage de la couleur de sélection, coloration de tous les
  langages.

## Phase 6 : les autres machines

- Se brancher sur le core d'une autre machine (ssh, VPS) et voir ses spaces,
  terminaux et agents à côté de ceux de la machine locale.
- Ouvrir et enregistrer les fichiers de ces machines dans l'éditeur.

## Phase 7 : l'application installée et ses réglages

Spec : `docs/superpowers/specs/2026-11-12-phase7-application-design.md`.

Pouvoir se passer de l'app Herdr.

- Une application installée (empaquetée, avec son icône), lancée sans
  `npm run dev`.
- Les réglages : thème de l'application et thème de l'éditeur séparés, polices,
  raccourcis.
- Ce qui manque à l'usage, Antoine le corrige au fil de l'eau, hors phase.
