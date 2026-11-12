# Code repris d'ailleurs

Chaque morceau de code repris dans Berger, avec sa source et sa licence.

| Quoi | Source | Licence |
|---|---|---|
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
| Recherche de fichiers (`src/shared/recherche.ts` : score, tri, récents, emplacement, fusion des racines) et ses tests (`tests/recherche.test.ts`) | `quickopen.js` du mod `antoine`, tests de `~/dev/playground/herdr-app-mod/tests/quickopen.test.mjs`, réécrits en TypeScript (les lettres trouvées sont gardées) | code personnel d'Antoine |
| Scripts du presse-papiers de macOS (`CLIP_WRITE`, `CLIP_READ` dans `src/main/fichiers.ts`) | `explorer.js` du mod `antoine`, copiés tels quels | code personnel d'Antoine |
| Grammaires TextMate et configurations des langages (`src/renderer/public/vscode/grammaires/`, `configurations/`), registre des langages (`langages.json`, tiré des `package.json` des extensions) | extensions livrées avec VS Code 1.146.0 (`/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/`), copiées par `scripts/copier-grammaires.mjs` ; licence MIT de microsoft/vscode dans `LICENSE.txt`, grammaires d'origine tierce décrites dans `ThirdPartyNotices.txt` (copié à côté) | MIT (et licences des grammaires d'origine, voir `ThirdPartyNotices.txt`) |
| Thème de l'éditeur (`src/renderer/public/vscode/monokai-color-theme.json`) | `extensions/theme-monokai/themes/monokai-color-theme.json` de VS Code 1.146.0, copié tel quel | MIT |
| Thèmes Dark Modern et Light Modern de l'éditeur (`src/renderer/public/vscode/themes/dark-modern.json`, `light-modern.json`) | `extensions/theme-defaults/themes/dark_modern.json` et `light_modern.json` de VS Code 1.146.0 (avec leurs `include` : `dark_plus.json`, `dark_vs.json`, `light_plus.json`, `light_vs.json`), fusionnés par `scripts/copier-grammaires.mjs` | MIT |
| Thèmes `antoine-monokai` et `atom-one-dark` (`src/shared/themes/`) | `~/.config/herdr-app/themes/antoine-monokai.json` et `atom-one-dark.json` (Herdr), recopiés ; Berger ajoute le champ `editeur` (couleurs d'Atom One Dark, commentaire éclairci en `#7f848e` pour la lisibilité). `monokai.json` : le même que `antoine-monokai`, texte `#f8f8f2` | Apache 2.0 (`/Applications/Herdr.app/Contents/Resources/LICENSE`) |
| Thèmes Graphite, Ink, Moss, Paper (`src/shared/themes/`) | inspirés des thèmes intégrés de Herdr du même nom ; aucune couleur reprise telle quelle (teintes dessinées pour Berger d'après les pastilles de `docs/maquettes/reglages.html`) | — |
| Icône de l'application (`build/icone.svg`, `build/icone-petite.svg`, `build/icon.icns`, `build/icon.png`, `resources/icon.png`) | dessinée pour Berger d'après son logo (`docs/logo-berger.svg`, variante C de `docs/maquettes/logos.html`) ; aucun code repris | — |
| Résolution des couleurs sémantiques (`src/shared/theme.ts` : table de repli des jetons, `nameMatcher`, `resolveScopes`, `getTokenStyle`) | `src/vs/platform/theme/common/tokenClassificationRegistry.ts` et `src/vs/workbench/services/themes/common/colorThemeData.ts` de microsoft/vscode 1.146.0, réécrits | MIT |

Dépendances utilisées sans modification : Monaco (`monaco-editor`, MIT), xterm.js
(`@xterm/xterm`, `@xterm/addon-webgl`, MIT), Electron (MIT), Lucide (`lucide`, icônes
d’interface, ISC), vscode-textmate et vscode-oniguruma (MIT), typescript-language-server
(Apache 2.0), yaml-language-server (MIT), vscode-jsonrpc et vscode-languageserver-protocol
(MIT), TypeScript (Apache 2.0).
