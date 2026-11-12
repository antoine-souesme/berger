# Maquettes de la phase 1

Maquettes validées par Antoine le 12 novembre 2026. Ouvrir chaque fichier dans
un navigateur (fenêtre de 1440 × 900).

- `vue-principale.html` : barre des workspaces, explorateur, spaces et agents,
  un terminal d'agent et l'éditeur côte à côte, menu du clic droit sur un panneau.
- `recherche-fichiers.html` : la recherche de fichiers (`cmd-p`).
- `logos.html` : les variantes du logo ; la variante C est retenue
  (`docs/logo-berger.svg`), en petit sans pattes et laine pleine.

Ce qu'il faut garder en tête en codant :

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

Source modifiable (canevas Claude Design, privé) :
https://claude.ai/artifact/PsAQGDeFWqgenKfWEG4p3R
