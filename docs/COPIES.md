# Code repris d'ailleurs

Chaque morceau de code repris dans Berger, avec sa source et sa licence.

| Quoi | Source | Licence |
|---|---|---|
| Couleurs du thème Monaco `antoine-monokai` (`src/renderer/src/editeur.ts`) | `~/.config/herdr-app/themes/antoine-monokai.json` (thème personnel d'Antoine, lui-même dérivé de Monokai) | thème personnel ; Monokai sous licence libre de son auteur |
| Squelette du projet (configuration electron-vite, tsconfig) | modèle `vanilla-ts` de `@quick-start/create-electron` | MIT |
| Icônes de fichiers des maquettes (`docs/maquettes/`) | Material Icon Theme, copiées depuis `~/.config/herdr-app/mods/antoine/icons/material/` | MIT |
| Icônes d'interface des maquettes (`docs/maquettes/`) | Lucide | ISC |
| Chevrons et icône « tout replier » des maquettes | mod `antoine` (`~/.config/herdr-app/mods/antoine/`) | code personnel d'Antoine |
| Icônes d'interface de l'application (`src/renderer/src/icones.ts`) | paquet `lucide` (Lucide) | ISC |
| Règles des onglets de fichiers (`src/shared/onglets.ts` : ajouter à la fin, fermer, onglet voisin) | inspirées de `files.js` du mod `antoine` (`~/.config/herdr-app/mods/antoine/`), réécrites | code personnel d'Antoine |
| Règles de l'arbre des découpages et des commandes de structure (`src/shared/arbre.ts`, `src/shared/document.ts`) | comportement de Herdr imité d'après `~/.config/herdr-app/AGENTS.md`, aucun code repris | — |
| Table des raccourcis (`src/shared/raccourcis.ts`) | `~/.config/herdr-app/keys.json` (raccourcis de Herdr), aucun code repris | — |
| Format des trames de herdr-core (`src/shared/trames.ts`) | observé sur `hc` 0.1.20, aucun code repris | herdr-core : Apache 2.0 |
| Règles des workspaces (`src/shared/workspaces.ts`) et leurs tests (`tests/workspaces.test.ts`) | `~/.config/herdr-app/mods/antoine/workspaces.js` et `~/dev/playground/herdr-app-mod/tests/workspaces.test.mjs`, réécrits en TypeScript sans le suivi du space affiché par Herdr | code personnel d'Antoine |
| Arbre et tri de la liste des agents (`src/shared/agents.ts`) | arbre, tri et durée inspirés de `~/.config/herdr-app/mods/antoine-agents/main.js` | code personnel d'Antoine |
| Règles de l'explorateur (`src/shared/explorateur.ts` : fichiers masqués, tri, couleurs git, nom de copie, dossier de collage, dépôt possible, dossiers à relire) et leurs tests (`tests/explorateur.test.ts`) | `git.js`, `clip.js`, `staleDirs` de `files.js` et règles d'affichage de `explorer.js` du mod `antoine` (`~/.config/herdr-app/mods/antoine/`), tests de `~/dev/playground/herdr-app-mod/tests/git.test.mjs` et `clip.test.mjs`, réécrits en TypeScript | code personnel d'Antoine |
| Choix de l'icône d'un fichier (`src/shared/icones-fichiers.ts`) | `icons.js` du mod `antoine`, réécrit en TypeScript | code personnel d'Antoine |
| Table des icônes Material (`src/shared/material.ts`) | `material.js` du mod `antoine`, copié tel quel (généré depuis material-icon-theme 5.40.0) | MIT |
| Icônes de fichiers de l'application (`src/renderer/public/material/`, avec son `LICENSE`) | Material Icon Theme, copiées depuis `~/.config/herdr-app/mods/antoine/icons/material/` | MIT |
| État des fichiers par workspace (`src/shared/etat-fichiers.ts` : onglets épinglés et ouverts, récents, dossiers ajoutés, libellés d'onglets, images) et ses tests (`tests/etat-fichiers.test.ts`) | `files.js` et `remember` de `quickopen.js` du mod `antoine`, tests de `~/dev/playground/herdr-app-mod/tests/files.test.mjs`, réécrits en TypeScript (onglets ouverts retenus au relancement, contrairement à `boot`) | code personnel d'Antoine |

Dépendances utilisées sans modification : Monaco (`monaco-editor`, MIT), xterm.js
(`@xterm/xterm`, `@xterm/addon-fit`, MIT), Electron (MIT), Lucide (`lucide`, icônes
d’interface, ISC).
