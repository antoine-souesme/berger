# Code repris d'ailleurs

Chaque morceau de code repris dans Berger, avec sa source et sa licence.

| Quoi | Source | Licence |
|---|---|---|
| Couleurs du thème Monaco `antoine-monokai` (`src/renderer/src/editeur.ts`) | `~/.config/herdr-app/themes/antoine-monokai.json` (thème personnel d'Antoine, lui-même dérivé de Monokai) | thème personnel ; Monokai sous licence libre de son auteur |
| Squelette du projet (configuration electron-vite, tsconfig) | modèle `vanilla-ts` de `@quick-start/create-electron` | MIT |
| Format des trames de herdr-core (`src/shared/trames.ts`) | observé sur `hc` 0.1.20, aucun code repris | herdr-core : Apache 2.0 |

Dépendances utilisées sans modification : Monaco (`monaco-editor`, MIT), xterm.js
(`@xterm/xterm`, `@xterm/addon-fit`, MIT), Electron (MIT).
