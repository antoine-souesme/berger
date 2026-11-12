# Maquettes de la phase 1

Maquettes validées par Antoine le 12 novembre 2026. Ouvrir chaque fichier dans
un navigateur (fenêtre de 1440 × 900).

- `vue-principale.html` : barre des workspaces, explorateur, spaces et agents,
  un onglet de terminal découpé en trois (Claude Code, lazygit, zsh), barre
  d'état en bas, menu du clic droit sur un panneau.
- `vue-fichier.html` : un onglet de fichier, l'éditeur sur toute la largeur ;
  menu du clic droit sur un onglet de terminal (Renommer, Nouvel onglet, Fermer).
- `recherche-fichiers.html` : la recherche de fichiers (`cmd-p`).
- `logos.html` : les variantes du logo ; la variante C est retenue
  (`docs/logo-berger.svg`), en petit sans pattes et laine pleine.
- `workspaces.html` : menu du clic droit sur un workspace, dialogues « Nouveau
  workspace » et de suppression, workspace vide sélectionné (phase 3).
- `explorateur.html` : menu du clic droit sur un fichier, glisser-déposer,
  mise à la corbeille, onglets de fichiers (épinglé, même nom, non enregistré),
  visionneuse d'images (phase 4).
- `recherche-projet.html` : la recherche dans le projet (`shift-cmd-f`) à la
  place de l'explorateur, résultats groupés par fichier (phase 5).
- `differences.html` : les différences git dans la marge de l'éditeur et la
  vue côte à côte (phase 5).
- `reglages.html` : la fenêtre des réglages (`cmd-,`), sections Apparence et
  Raccourcis (phase 7).

Ce qu'il faut garder en tête en codant :

- Disposition reprise de Herdr (corrigée le 12 novembre 2026) : un onglet de
  terminal contient un ou plusieurs terminaux découpés ; un onglet de fichier
  montre l'éditeur seul, sur toute la largeur. Un fichier et un terminal ne
  sont jamais côte à côte. Les onglets de terminaux se renomment (F2). Rien à
  droite de la barre d'onglets.

- Couleurs : celles du thème Herdr `antoine-monokai`
  (`~/.config/herdr-app/themes/antoine-monokai.json`). États d'agent : jaune
  au travail, rose t'attend, vert fini. Pas d'orange.
- Les onglets d'agent sont de simples terminaux, pas des interfaces de discussion.
- Bandeau des panneaux fin (28 px), comme dans Herdr ; 6 px entre les panneaux.
- Explorateur : mêmes réglages que celui du mod `antoine` (lignes de 22 px,
  police système 13 px, retrait de 8 px, couleurs git de VS Code, ce que git
  ignore en gris) ; noms sans gras.
- Icônes de l'interface : Lucide (`lucide-react`) ; icônes de fichiers :
  Material Icon Theme, comme dans le mod.
- Spaces : pastille avec l'initiale, état git à droite (branche ou commits à pousser).
