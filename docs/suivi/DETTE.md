# Dette technique

Registre des points mis de côté pendant l'exécution des plans. Un point y entre
quand il est identifié puis délibérément différé — pas quand il est corrigé.

Ce fichier n'est pas un historique : une entrée résolue en sort.

## Format

Une entrée par point, la plus récente en haut.

```markdown
### <titre court>

- **Bloc** : identifiant du bloc (`BLO-<n>`), ou `mission`.
- **Origine** : plan ou tâche d'où le point sort.
- **Ce qui est différé** : l'état courant, décrit tel quel.
- **Pourquoi** : la raison du report.
- **Ce qu'il faudrait faire** : la piste de correction, assez précise pour être reprise sans rouvrir l'analyse.
```

---

### Aide aux paramètres, mise en forme, symboles et occurrences

- **Bloc** : `mission`.
- **Origine** : Tâche 4 du plan de la phase 5 (services TypeScript intégrés de Monaco coupés), relecture finale.
- **Ce qui est différé** : seuls complétion, définition, références, survol, renommage, jetons sémantiques, erreurs et « Organiser les imports » passent par le serveur ; l'aide aux paramètres, ⇧⌥F, ⇧⌘O et le surlignage des occurrences, que Monaco donnait avant, ont disparu pour TypeScript et JavaScript.
- **Pourquoi** : la spec ne les demande pas ; les brancher dépasse le plan.
- **Ce qu'il faudrait faire** : dans `brancherLangage` de `src/renderer/src/langage.ts`, ajouter `registerSignatureHelpProvider` (`textDocument/signatureHelp`), `registerDocumentFormattingEditProvider` (`textDocument/formatting`), `registerDocumentSymbolProvider` (`textDocument/documentSymbol`) et `registerDocumentHighlightProvider` (`textDocument/documentHighlight`), et déclarer ces capacités client dans `src/main/services/langage.ts`.

### Recherche dans le projet et différences git

- **Bloc** : `mission`.
- **Origine** : plan `docs/superpowers/plans/2026-11-12-phase5-editeur.md`, décision d'Antoine du 12 novembre 2026.
- **Ce qui est différé** : ni panneau « Rechercher » (`⇧⌘F`, `⇧⌘H`, « Tout remplacer »), ni différences git dans la marge, ni vue côte à côte ; le bouton loupe de la barre des workspaces est retiré.
- **Pourquoi** : remis à une phase à venir pour finir l'éditeur d'abord.
- **Ce qu'il faudrait faire** : reprendre les paragraphes « Recherche dans le projet » et « Différences git » de la spec de la phase 5 et les maquettes `recherche-projet.html` et `differences.html` ; ripgrep lancé par la partie Node, un point d'entrée unique comme `src/main/services/langage.ts` ; remettre la loupe dans `dessiner` de `src/renderer/src/workspaces.ts`.

### Fichiers ouverts hors des racines surveillées

- **Bloc** : `mission`.
- **Origine** : Tâche 5 du plan de la phase 5 (rechargement des fichiers changés par un agent).
- **Ce qui est différé** : le rechargement suit `berger:disque`, qui ne vient que des racines de l'explorateur ; un fichier ouvert hors de ces racines (⌘P d'un autre dossier, Finder, `node_modules` d'une définition) ne se recharge pas quand un agent l'écrit, et ses erreurs ne sont pas recalculées.
- **Pourquoi** : la surveillance par fichier n'existe pas encore ; rare dans l'usage d'Antoine.
- **Ce qu'il faudrait faire** : dans `src/main/fichiers.ts`, surveiller aussi le dossier de chaque fichier ouvert hors racine (canal envoyé par `editeur.ts` à l'ouverture et à la fermeture d'un onglet), et envoyer ses changements par `berger:disque`.

### Empaquetage des serveurs de langage et de la coloration

- **Bloc** : `mission`.
- **Origine** : Tâches 2 et 3 du plan de la phase 5.
- **Ce qui est différé** : `typescript-language-server`, `yaml-language-server` et `typescript` sont lancés depuis `node_modules` avec `ELECTRON_RUN_AS_NODE` ; `onig.wasm` et `public/vscode/` sont lus par XHR depuis la page. Rien n'est vérifié dans une application empaquetée.
- **Pourquoi** : l'application installée est la phase 7.
- **Ce qu'il faudrait faire** : en phase 7, garder ces trois paquets et `onig.wasm` hors de l'archive `asar` (`asarUnpack` d'electron-builder), vérifier que `createRequire(...).resolve` les trouve, et que `./vscode/` se lit en `file://`.

## Phase 3

- **Deux Berger lancés en même temps.** Rien n'empêche deux fenêtres Berger
  (deux processus) : chacune garde ses workspaces en mémoire et réécrit
  `workspaces.json`, la dernière qui écrit gagne. Vu une fois pendant les
  essais (un lancement précédent pas encore fermé). À trancher avec la phase 7
  (application installée) : un verrou d'instance unique
  (`app.requestSingleInstanceLock`) ou relire le fichier avant d'écrire.
- **Relecture de fin de phase, points laissés.** Dans le dialogue de
  suppression, le focus est sur « Supprimer » (la barre d'espace confirme) ;
  `workspaces.json` est écrit en place (un arrêt brutal pendant l'écriture le
  rendrait illisible, et Berger reprendrait alors depuis Herdr). À reprendre
  si l'un des deux gêne.
