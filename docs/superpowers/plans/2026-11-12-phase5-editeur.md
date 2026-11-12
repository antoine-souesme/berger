# Berger phase 5 — l'éditeur complet : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** faire de l'éditeur Monaco de Berger un éditeur de travail : aide du langage (TypeScript, JavaScript, JSON, YAML), coloration et thème identiques à VS Code (thème « Monokai »), retour à la ligne `⌥Z`, couleur de sélection réglable, rechargement des fichiers changés par un agent.

**Architecture :** les règles (conversions entre le protocole des serveurs de langage et Monaco, choix du serveur et de la racine, schémas JSON, réglages, résolution du thème, rechargement, raccourcis) sont des modules purs dans `src/shared/`, testés dans `tests/`. La partie Node d'Electron lance `typescript-language-server` (avec le `tsserver` du dépôt ouvert, sinon celui de Berger) et `yaml-language-server`, et les relie à la fenêtre par IPC, dans un seul module (`src/main/services/langage.ts`), point d'entrée unique que la phase 6 pourra faire passer par herdr-core. La fenêtre branche ces services sur Monaco avec ses propres fournisseurs (pas de `monaco-languageclient`), garde le service JSON intégré de Monaco (avec les schémas de SchemaStore, téléchargés par la partie Node et gardés en cache) et remplace la coloration de Monaco par celle de VS Code : grammaires TextMate copiées de VS Code, lues par `vscode-textmate` + `vscode-oniguruma`, thème `monokai-color-theme.json` de VS Code, coloration sémantique fournie par le service TypeScript.

**Tech Stack :** Electron 44, electron-vite, TypeScript, vitest, `monaco-editor` 0.57. Dépendances nouvelles : `typescript-language-server` (^6.0.3), `yaml-language-server` (^2.0.0), `vscode-jsonrpc` (^10.0.0) et `vscode-languageserver-protocol` (types), `vscode-textmate` (^9.3.2), `vscode-oniguruma` (^2.0.1). `typescript` passe des `devDependencies` aux `dependencies` (c'est le `tsserver` de secours).

**Spec :** `docs/superpowers/specs/2026-11-12-phase5-editeur-design.md` (à lire en entier, **décisions en tête de spec comprises**). Maquette : `docs/maquettes/vue-fichier.html` (l'éditeur sur toute la largeur), règles visuelles `docs/maquettes/README.md`. Pas de lien de design externe. Les maquettes `recherche-projet.html` et `differences.html` ne servent pas dans cette phase.

## Global Constraints

- Branche de travail : `phase5-editeur`, déjà créée depuis `develop` avec ce plan. PR vers `develop` à la fin, jamais vers `main`.
- **Hors de cette phase (décision d'Antoine du 12 novembre 2026)** : recherche et remplacement dans le projet (`⇧⌘F`, `⇧⌘H`, panneau « Rechercher »), différences git (marge, vue côte à côte). Le bouton loupe de la barre des workspaces est retiré (ajout d'Antoine pendant l'exécution) : il reviendra avec la recherche. Ne rien en construire.
- Hors périmètre de la spec : aide du langage pour d'autres langages que TypeScript, JavaScript, JSON, YAML ; aperçu Markdown ; débogueur ; extensions VS Code ; fichiers d'autres machines.
- **Thème identique à VS Code** : les couleurs de l'éditeur sont celles de `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/theme-monokai/themes/monokai-color-theme.json` (copié tel quel, sans retouche). Le reste de la fenêtre garde ses couleurs `antoine-monokai`. Antoine n'a aucune personnalisation de couleurs dans ses réglages VS Code (vérifié : pas de `editor.tokenColorCustomizations` ni `workbench.colorCustomizations`).
- Couleur de sélection par défaut : celle du thème, `#878b9180`. Réglable dans `~/Library/Application Support/berger/reglages.json`, clé `editeur.couleurSelection` ; fichier absent ou valeur invalide → défaut ; Berger ne crée pas ce fichier.
- Ne jamais ralentir la frappe : les serveurs de langage tournent dans des processus à part ; une requête sans réponse rend « rien » après son délai (complétion 5 s, le reste 10 s) ; un serveur qui plante est relancé, au plus 3 fois en 5 minutes, puis la barre d'état affiche « Le service TypeScript s'est arrêté. » (ou « Le service YAML s'est arrêté. »).
- Ne jamais écraser les modifications d'un agent : un fichier ouvert et non modifié qui change sur le disque se recharge ; modifié des deux côtés, il est gardé tel quel et `⌘S` pose la question de la phase 0 (déjà en place dans `berger:ecrire`).
- Raccourcis : `F12`, `⌘` clic, `⇧F12`, `F2`, `⌘D`, `⌥⌘↑↓`, `⌥` clic restent à Monaco quand l'éditeur a le clavier ; `⌥Z` (retour à la ligne, retenu dans `etat-fenetre.json`) est pris par Berger quand l'éditeur ou l'explorateur a le clavier, laissé au terminal sinon. « Organiser les imports » : `⇧⌥O` et le menu du clic droit de l'éditeur.
- Textes de l'interface en français, avec les accents. Code et noms en français comme dans les phases précédentes.
- Code repris : une ligne par morceau dans `docs/COPIES.md` (grammaires et `package.json` des extensions de VS Code, `monokai-color-theme.json`, table des portées sémantiques de VS Code ; licence MIT de VS Code, son fichier `LICENSE.txt` copié à côté des grammaires).
- Ne jamais toucher les terminaux ni les spaces d'Antoine. Les essais ne touchent que des dossiers dont le chemin contient `berger-essai` (dans le scratchpad) et les spaces `spbergertest…`. Avant le premier essai, garder une copie de `workspaces.json`, `fichiers.json`, `etat-fenetre.json` (dans `~/Library/Application Support/berger/`) et les remettre à la fin.
- Vérifier sans cliquer : `BERGER_CAPTURE`, `BERGER_SCENARIO` (voir `src/main/scenario.ts` et `CLAUDE.md`). Une chose « marche » seulement après l'avoir vue dans l'application lancée.
- Vérification visuelle : application Electron locale, aucun compte ni identifiant de connexion (rien à mettre dans `.env.local`). Les captures de Berger (lues avec l'outil Read) sont comparées avec claude-in-chrome à la maquette `file:///Users/antoinesouesme/dev/playground/berger/docs/maquettes/vue-fichier.html` (disposition) et, pour les couleurs, à une capture de VS Code ouvrant le même fichier (`code <fichier>` puis `screencapture -l` de sa fenêtre, ou demander la capture à Antoine si VS Code ne s'ouvre pas).

## Review Focus

- **Le service TypeScript plante ou ne répond plus** (projet énorme, `tsserver` qui meurt). Attendu : la frappe continue sans attente, la complétion est vide, le service est relancé ; après 3 arrêts en 5 minutes, le message de la barre d'état, sans boucle de relance. Tests avec de faux serveurs (Tâche 2).
- **Un fichier ouvert est renommé ou déplacé** (explorateur, phase 4), avec ou sans modification en attente. Le modèle Monaco porte maintenant l'adresse `file://` du fichier, qui ne change pas : il est recréé sous la nouvelle adresse avec le même texte, le point de modification et l'historique d'annulation perdu seulement si c'est inévitable ; le serveur reçoit `didClose` puis `didOpen`. Étape du scénario (Tâche 5).
- **Un agent modifie un fichier ouvert.** Non modifié dans Berger : rechargé, position du curseur gardée, erreurs recalculées. Modifié dans Berger : gardé, rien n'est perdu. Test `quoiFaire` (Tâche 1), étape du scénario (Tâche 5).
- **Lettres accentuées et émojis avant un symbole** (`const café = 1; // 🐑`). Les positions du protocole et de Monaco comptent toutes deux en unités UTF-16 : aucune conversion d'octets, et `appliquerEditions` place le texte au bon endroit. Tests (Tâche 1).
- **Définition dans un fichier non ouvert ou dans `node_modules` (`.d.ts`), et `⇧F12` qui montre des références d'autres fichiers.** Attendu : `F12` ouvre l'onglet à la bonne ligne ; l'aperçu des références montre le texte des autres fichiers (leurs modèles sont créés à la demande, puis repris par l'onglet si on l'ouvre). Test d'intégration de la définition (Tâche 2), étape du scénario (Tâche 5).

---

## Le découpage des fichiers

Nouveaux modules purs (`src/shared/`) :

| Fichier | Rôle |
|---|---|
| `langage.ts` | serveur d'un fichier, identifiant du langage pour le protocole, racine du projet, `tsserver` à utiliser, conversions de positions, éditions de texte, texte de survol |
| `schemas.ts` | schéma JSON d'un fichier (`$schema` déclaré, sinon table des fichiers connus) |
| `reglages.ts` | lecture de `reglages.json` |
| `theme.ts` | règles Monaco tirées du thème VS Code : couleurs des jetons TextMate, couleurs de la coloration sémantique |

Modifiés : `src/shared/fichiers.ts` (`langageDe` d'après le registre des langages de VS Code, `quoiFaire` du rechargement), `src/shared/etat-fenetre.ts` (`retourLigne`), `src/shared/raccourcis.ts` (`⌥Z`).

Processus principal : `src/main/services/langage.ts` (nouveau : serveurs de langage), `src/main/services/schemas.ts` (nouveau : téléchargement et cache des schémas), `src/main/reglages.ts` (nouveau), `src/main/index.ts`, `src/main/scenario.ts`.

Fenêtre (`src/renderer/src/`) : `langage.ts` (nouveau : fournisseurs Monaco branchés sur les serveurs), `json.ts` (nouveau : schémas du service JSON de Monaco), `coloration.ts` (nouveau : grammaires TextMate et thème), `editeur.ts`, `etat.ts`, `clavier.ts`, `main.ts`, `barre-etat.ts` ou `#fichier-message` pour le message d'arrêt d'un service.

Ressources : `scripts/copier-grammaires.mjs` (nouveau) produit `src/renderer/public/vscode/` (grammaires, `langages.json`, `monokai-color-theme.json`, `LICENSE.txt`).

---

### Task 1 : les règles pures

**Files :**
- Create : `src/shared/langage.ts`, `src/shared/schemas.ts`, `src/shared/reglages.ts`
- Modify : `src/shared/fichiers.ts`, `src/shared/etat-fenetre.ts`, `src/shared/raccourcis.ts`
- Test : `tests/langage.test.ts`, `tests/schemas.test.ts`, `tests/reglages.test.ts`, `tests/fichiers.test.ts`, `tests/etat-fenetre.test.ts`, `tests/raccourcis.test.ts`

**Interfaces :**
- Produces :
  ```ts
  // langage.ts (types du protocole importés en `import type` de vscode-languageserver-protocol)
  export type Serveur = 'typescript' | 'yaml'
  export function serveurDe(chemin: string): Serveur | null
    // .ts .tsx .mts .cts .js .jsx .mjs .cjs → 'typescript' ; .yaml .yml → 'yaml' ; sinon null (casse ignorée)
  export function idLsp(chemin: string): string
    // typescript | typescriptreact (.tsx) | javascript | javascriptreact (.jsx) | yaml
  export function racineProjet(chemin: string, existe: (p: string) => boolean): string
    // la partie avant `/node_modules/` s'il y en a un ; sinon le dossier parent le plus proche
    // qui contient tsconfig.json, jsconfig.json ou package.json ; sinon le dossier du fichier
  export function tsserverDe(racine: string, existe: (p: string) => boolean, deBerger: string): string
    // `${racine}/node_modules/typescript/lib/tsserver.js` s'il existe, sinon deBerger
  export const versLsp: (p: { lineNumber: number; column: number }) => Position   // -1 sur les deux
  export const plageDeLsp: (r: Range) => { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }
  export const plageVersLsp: (r: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }) => Range
  export function graviteMonaco(s: DiagnosticSeverity | undefined): 8 | 4 | 2 | 1  // erreur 8, avertissement 4, info 2, indice 1 (défaut 8)
  export function appliquerEditions(texte: string, editions: TextEdit[]): string
  export function texteSurvol(c: Hover['contents']): string                       // en Markdown
  export function editionsParFichier(e: WorkspaceEdit): Map<string, TextEdit[]>   // `changes` et `documentChanges`, clé = chemin (pas l'URI)

  // schemas.ts
  export const SCHEMAS_JSON: [motif: string, url: string][]
  export function schemaJson(chemin: string, texte: string): string | null

  // reglages.ts
  export type Reglages = { editeur: { couleurSelection: string } }
  export const REGLAGES_PAR_DEFAUT: Reglages        // couleurSelection '#878b9180'
  export function lireReglages(brut: unknown): Reglages

  // fichiers.ts
  export type LangageVsCode = { id: string; extensions?: string[]; filenames?: string[] }
  export function langageDe(chemin: string, langages?: LangageVsCode[]): string
  export function quoiFaire(modifie: boolean, texteCharge: string, texteDisque: string | null): 'rien' | 'recharger' | 'garder'

  // etat-fenetre.ts : EtatFenetre gagne `retourLigne: boolean` (défaut false)
  // raccourcis.ts : ActionClavier gagne { type: 'editeur.retourLigne' }
  ```

- [ ] **Step 1 : écrire les tests qui échouent.** Cas, avec ces valeurs :
  - `serveurDe('/a/b.TSX')` → `'typescript'`, `serveurDe('/a/ci.yml')` → `'yaml'`, `serveurDe('/a/package.json')` → `null` ; `idLsp('/a/b.tsx')` → `'typescriptreact'`, `idLsp('/a/b.mjs')` → `'javascript'`.
  - `racineProjet('/p/node_modules/x/index.d.ts', existe)` → `'/p'` ; avec `existe` vrai pour `/p/package.json` seulement : `racineProjet('/p/src/a/b.ts', existe)` → `'/p'` ; rien trouvé : `racineProjet('/q/c.ts', () => false)` → `'/q'`.
  - `tsserverDe('/p', p => p === '/p/node_modules/typescript/lib/tsserver.js', '/berger/ts.js')` → le chemin du dépôt ; `() => false` → `'/berger/ts.js'`.
  - `appliquerEditions('const café = 1 // 🐑\nx', [{ range: { start: { line: 0, character: 6 }, end: { line: 0, character: 10 } }, newText: 'thé' }, { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } }, newText: 'y' }])` → `'const thé = 1 // 🐑\ny'` ; deux éditions données dans le désordre donnent le même résultat ; une édition après l'émoji (`character` compté en UTF-16, l'émoji vaut 2) tombe au bon endroit.
  - `versLsp({ lineNumber: 1, column: 1 })` → `{ line: 0, character: 0 }` ; `plageDeLsp` est l'inverse de `plageVersLsp`.
  - `graviteMonaco(1)` → 8, `(2)` → 4, `(3)` → 2, `(4)` → 1, `(undefined)` → 8.
  - `texteSurvol({ kind: 'markdown', value: 'x' })` → `'x'` ; `texteSurvol([{ language: 'ts', value: 'let a' }, 'doc'])` → ```` '```ts\nlet a\n```\n\ndoc' ````.
  - `editionsParFichier({ changes: { 'file:///p/a%20b.ts': [e] } })` → clé `'/p/a b.ts'` ; `documentChanges` lu de la même façon.
  - `schemaJson('/p/package.json', '{}')` → `'https://json.schemastore.org/package.json'` ; `'/p/tsconfig.node.json'` → `'https://json.schemastore.org/tsconfig.json'` ; `'/p/x.json'` avec `'{ "$schema": "https://exemple.fr/s.json" }'` → `'https://exemple.fr/s.json'` (le `$schema` déclaré passe avant la table) ; `'/p/x.json'` sans `$schema` → `null`. Table : `package.json`, `tsconfig.json` et `tsconfig.*.json` (→ tsconfig), `jsconfig.json`, `.prettierrc` et `.prettierrc.json` (→ prettierrc), `.eslintrc` et `.eslintrc.json` (→ eslintrc), `.babelrc` et `babel.config.json` (→ babelrc), `composer.json` ; adresses `https://json.schemastore.org/<nom>.json`.
  - `lireReglages(null)` → défaut ; `lireReglages({ editeur: { couleurSelection: '#264f78' } })` → cette couleur ; `'#fff'`, `'#264f78aa'` acceptés ; `'rouge'` → défaut.
  - `langageDe('/p/Dockerfile', L)` → `'dockerfile'`, `langageDe('/p/.prettierrc', L)` → `'json'`, `langageDe('/p/tsconfig.json', L)` → `'json'` (le `jsonc` de VS Code devient `json`, seul langage du service JSON de Monaco), `langageDe('/p/a.go', L)` → `'go'`, `langageDe('/p/a.inconnu', L)` → `'plaintext'`, avec `L` un extrait du `langages.json` de la Tâche 3 écrit dans le test ; sans `langages`, l'ancienne table reste utilisée (les tests existants passent).
  - `quoiFaire(false, 'a', 'b')` → `'recharger'` ; `quoiFaire(false, 'a', 'a')` → `'rien'` ; `quoiFaire(true, 'a', 'b')` → `'garder'` ; `quoiFaire(false, 'a', null)` → `'rien'` (fichier supprimé : comportement de la phase 4).
  - `lireEtatFenetre({ retourLigne: true }).retourLigne` → `true`, absent → `false`.
  - `actionDe(⌥Z, 'editeur')` et `(⌥Z, 'explorateur')` → `{ type: 'editeur.retourLigne' }` ; `(⌥Z, 'terminal')` et `(⌥Z, 'autre')` → `null` ; avec la cible `'editeur'`, `F12`, `⇧F12`, `F2`, `⌘D`, `⌥⌘↑`, `⌥⌘↓`, `⇧⌥O` → `null` (Monaco les garde).

- [ ] **Step 2 : lancer `npm test`.** Expected : les nouveaux tests échouent (fonctions absentes).
- [ ] **Step 3 : écrire les fonctions** aux signatures ci-dessus. `⌥Z` : modificateurs `'a'`, code `KeyZ`, pris seulement pour les cibles `editeur` et `explorateur` (ajouté à `PRIS_A_L_EDITEUR`). `retourLigne` est aussi envoyé dans `berger:retenir` (`src/renderer/src/etat.ts`).
- [ ] **Step 4 : lancer `npm test` et `npm run typecheck`.** Expected : tout passe.
- [ ] **Step 5 : commit** `feat(phase5): règles pures du langage, des schémas, des réglages et de ⌥Z`.

---

### Task 2 : les serveurs de langage dans la partie Node

**Files :**
- Create : `src/main/services/langage.ts`, `tests/langage-serveurs.test.ts`, `tests/faux/lsp-meurt.mjs` (sort aussitôt lancé), `tests/faux/lsp-muet.mjs` (lit l'entrée et ne répond jamais)
- Modify : `package.json` (dépendances), `src/main/index.ts` (brancher, arrêter les serveurs à la fermeture)

**Interfaces :**
- Consumes : `serveurDe`, `idLsp`, `racineProjet`, `tsserverDe` (Tâche 1).
- Produces :
  ```ts
  export type Lancement = { commande: string; args: string[]; env?: NodeJS.ProcessEnv }
  export class ServeursLangage {
    constructor(o: {
      notifier: (cle: string, methode: string, params: unknown) => void   // notifications du serveur
      redemarre: (cle: string) => void                                   // le serveur `cle` a été relancé
      arrete: (serveur: Serveur) => void                                 // abandon après 3 arrêts en 5 min
      lancer?: (serveur: Serveur, racine: string) => Lancement           // pour les tests
    })
    cleDe(fichier: string): string | null                              // `${serveur}:${racine}` ou null
    requete(fichier: string, methode: string, params: unknown, delai?: number): Promise<{ resultat?: unknown; erreur?: string }>
    notifier(fichier: string, methode: string, params: unknown): void
    capacites(fichier: string): Promise<ServerCapabilities | null>
    arreter(): void
  }
  export function brancherLangage(fenetre: () => BrowserWindow | null): ServeursLangage
  // IPC : 'berger:lsp-requete' {fichier, methode, params} → {resultat?|erreur?}
  //       'berger:lsp-notifier' {fichier, methode, params} (envoyer, sans réponse)
  //       'berger:lsp-capacites' {fichier} → ServerCapabilities | null
  // vers la fenêtre : 'berger:lsp-notif' {cle, methode, params}, 'berger:lsp-redemarre' {cle},
  //                   'berger:lsp-arrete' {serveur}
  ```

- [ ] **Step 1 : écrire les tests qui échouent** (`tests/langage-serveurs.test.ts`, projet de test créé avec `mkdtemp` dans `os.tmpdir()`, nom contenant `berger-essai` : `tsconfig.json` strict, `src/b.ts` qui exporte `somme(a: number, b: number)`, `src/a.ts` qui l'importe et l'appelle) :
  - `definition dans un autre fichier` : `didOpen` de `a.ts`, puis `textDocument/definition` sur `somme` → un emplacement dont l'URI finit par `/src/b.ts`.
  - `erreur de type signalée` : `didOpen` d'un texte contenant `const n: number = 'x'` → une notification `textDocument/publishDiagnostics` avec un diagnostic de code `2322`.
  - `serveur qui meurt` (avec `lancer` vers `tests/faux/lsp-meurt.mjs`) : trois requêtes successives rendent `{ erreur }`, `arrete('typescript')` est appelé une fois, et une quatrième requête rend `{ erreur: "Le service TypeScript s'est arrêté." }` sans relancer de processus.
  - `serveur muet` (`tests/faux/lsp-muet.mjs`, `delai` de 200 ms) : la requête rend `{ erreur: 'Délai dépassé.' }` en moins d'une seconde.
- [ ] **Step 2 : lancer `npx vitest run tests/langage-serveurs.test.ts`.** Expected : FAIL (module absent).
- [ ] **Step 3 : installer les dépendances** (`npm install typescript-language-server@^6.0.3 yaml-language-server@^2.0.0 vscode-jsonrpc@^10.0.0 vscode-languageserver-protocol`, `typescript` déplacé dans `dependencies`) **et écrire `src/main/services/langage.ts`.**
  - Lancement par défaut : `spawn(process.execPath, [cli, '--stdio'], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } })` ; `cli` trouvé par `createRequire(import.meta.url).resolve` (`typescript-language-server/lib/cli.mjs`, `yaml-language-server/bin/yaml-language-server`) ; le `tsserver` de secours est `require.resolve('typescript/lib/tsserver.js')`. Connexion par `vscode-jsonrpc/node` (`StreamMessageReader`/`StreamMessageWriter`).
  - Un processus par clé `${serveur}:${racine}`, lancé à la première demande. `initialize` avec `rootUri` de la racine, les capacités client de la synchronisation incrémentale, complétion (snippets), survol (markdown), définition, références, renommage, actions de code (`codeActionLiteralSupport`), jetons sémantiques (`requests.full`), diagnostics ; `initializationOptions: { tsserver: { path: tsserverDe(...) } }` pour TypeScript. Puis `initialized` ; pour YAML, `workspace/didChangeConfiguration` avec `{ yaml: { validate: true, completion: true, hover: true, schemaStore: { enable: true, url: 'https://www.schemastore.org/api/json/catalog.json' } } }`. Les requêtes attendent la fin de l'initialisation.
  - Réponses aux demandes du serveur : `workspace/configuration` → les réglages YAML ci-dessus (ou `null` par élément pour TypeScript), `client/registerCapability`, `window/workDoneProgress/create` → `null`, `workspace/applyEdit` → `{ applied: false }`.
  - Arrêt d'un processus : relancé à la demande suivante et `redemarre(cle)` ; au troisième arrêt en 5 minutes pour un même serveur, plus de relance, `arrete(serveur)`, et les demandes rendent le message de la contrainte globale.
  - `BERGER_TRACE=1` journalise lancement, arrêt et relance.
- [ ] **Step 4 : lancer `npx vitest run tests/langage-serveurs.test.ts` puis `npm test`.** Expected : PASS.
- [ ] **Step 5 : commit** `feat(phase5): serveurs de langage TypeScript et YAML dans la partie Node`.

---

### Task 3 : la coloration et le thème de VS Code

**Files :**
- Create : `scripts/copier-grammaires.mjs`, `src/renderer/public/vscode/` (produit par le script et commité), `src/shared/theme.ts`, `tests/theme.test.ts`, `src/renderer/src/coloration.ts`
- Modify : `package.json` (`vscode-textmate`, `vscode-oniguruma`), `src/renderer/src/editeur.ts` (retrait du thème `antoine-monokai` et de la table `LANGAGES` au profit du registre), `docs/COPIES.md`

**Interfaces :**
- Produces :
  ```ts
  // theme.ts
  export type ThemeVsCode = { colors: Record<string, string>; tokenColors: { scope?: string | string[]; settings: { foreground?: string; fontStyle?: string } }[] }
  export const PORTEES_SEMANTIQUES: Record<string, string[]>
    // type sémantique (avec modificateurs) → portées TextMate de repli de VS Code, voir Step 3
  export function styleDePortees(theme: ThemeVsCode, portees: string[]): { foreground?: string; fontStyle?: string }
    // la règle la plus précise du thème, comme VS Code (préfixe de portée le plus long, puis ordre du fichier)
  export function reglesSemantiques(theme: ThemeVsCode): { token: string; foreground?: string; fontStyle?: string }[]
  // coloration.ts
  export async function initColoration(): Promise<LangageVsCode[]>   // enregistre les langages et leurs grammaires, définit le thème
  export function definirTheme(couleurSelection: string): void        // thème Monaco 'vscode-monokai'
  ```

- [ ] **Step 1 : écrire `scripts/copier-grammaires.mjs`** (Node, sans dépendance) : pour chaque dossier de `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/` dont le `package.json` déclare `contributes.languages` ou `contributes.grammars`, copier les grammaires dans `src/renderer/public/vscode/grammaires/` et écrire `src/renderer/public/vscode/langages.json` : `{ langages: [{ id, extensions, filenames, aliases }], grammaires: [{ language?, scopeName, fichier, embeddedLanguages?, injectTo? }] }`. Copier aussi `theme-monokai/themes/monokai-color-theme.json` et `LICENSE.txt` de VS Code. Noter la version de VS Code copiée dans `langages.json` (`version`). Le lancer, vérifier que `grammaires/` contient `TypeScript.tmLanguage.json`, `JSON with Comments.tmLanguage.json`, `yaml.tmLanguage.json`, `markdown.tmLanguage.json`.
- [ ] **Step 2 : écrire les tests qui échouent** (`tests/theme.test.ts`, avec le vrai `monokai-color-theme.json` copié) : `styleDePortees(t, ['source.ts', 'meta.var.expr.ts', 'storage.type.ts'])` → `{ foreground: '#66D9EF', fontStyle: 'italic' }` ; `styleDePortees(t, ['source.ts', 'entity.name.function.ts'])` → `#A6E22E` ; `styleDePortees(t, ['source.ts', 'comment.line.double-slash.ts'])` → `#88846f` ; `styleDePortees(t, ['source.json', 'meta.structure.dictionary.json', 'string.quoted.double.json'])` → `#CFCFC2` (règle à deux portées) ; `reglesSemantiques(t)` contient `{ token: 'parameter', foreground: '#FD971F', fontStyle: 'italic' }` et `{ token: 'function', foreground: '#A6E22E' }`.
- [ ] **Step 3 : écrire `theme.ts`.** `PORTEES_SEMANTIQUES` reprend la table de repli de VS Code (`src/vs/platform/theme/common/tokenClassificationRegistry.ts`, MIT) : `namespace` → `entity.name.namespace` ; `type` → `entity.name.type`, `support.type` ; `class` → `entity.name.type.class`, `support.class` ; `interface` → `entity.name.type.interface` ; `enum` → `entity.name.type.enum` ; `typeParameter` → `entity.name.type.parameter` ; `function` → `entity.name.function`, `support.function` ; `method` → `entity.name.function.member`, `support.function` ; `variable` → `variable.other.readwrite`, `entity.name.variable` ; `parameter` → `variable.parameter` ; `property` → `variable.other.property` ; `enumMember` → `variable.other.enummember` ; `variable.readonly` → `variable.other.constant` ; `property.readonly` → `variable.other.constant.property` ; `class.defaultLibrary` → `support.class` ; `type.defaultLibrary` → `support.type` ; `function.defaultLibrary` → `support.function` ; `variable.defaultLibrary` → `support.variable` ; `variable.readonly.defaultLibrary` → `support.constant`. Vérifier la table contre la source de VS Code (GitHub, même version que l'app) et corriger si elle diffère.
- [ ] **Step 4 : écrire `coloration.ts`.** Charger `onig.wasm` (`vscode-oniguruma/release/onig.wasm?url`), créer un `Registry` de `vscode-textmate` dont `loadGrammar` lit `./vscode/grammaires/<fichier>` et dont le thème est `{ settings: tokenColors }` du thème copié. Pour chaque langage de `langages.json` : `monaco.languages.register` s'il est inconnu de Monaco (`jsonc` est rangé sous `json`, colorié avec la grammaire « JSON with Comments » pour que les commentaires de `tsconfig.json` soient bien colorés), et `monaco.languages.setTokensProvider(id, …)` chargé à la première utilisation : `tokenizeLine2` donne pour chaque jeton l'indice de couleur et le style (`EncodedTokenAttributes`) ; le jeton Monaco s'appelle `c<indice>` + `-i`/`-b`/`-u` selon le style, et `definirTheme` déclare une règle Monaco par entrée de `registry.getColorMap()`. `definirTheme` : `base: 'vs-dark'`, `inherit: false`, `colors` = `colors` du thème VS Code (avec `editor.selectionBackground` = `couleurSelection`), règles = jetons TextMate + `reglesSemantiques`, puis `monaco.editor.setTheme('vscode-monokai')`. Le langage d'un fichier vient de `langageDe(chemin, langages)` (Tâche 1).
- [ ] **Step 5 : options de l'éditeur** (dans `initEditeur`) : thème `vscode-monokai`, `'semanticHighlighting.enabled': true`, `bracketPairColorization: { enabled: true }` et `guides: { bracketPairs: true }` (réglages par défaut de VS Code et réglage d'Antoine). La police reste celle de Berger.
- [ ] **Step 6 : lancer `npm test`, `npm run typecheck`, puis `BERGER_CAPTURE=<scratchpad>/theme.png npm run dev` sur un onglet ouvrant `src/renderer/src/editeur.ts` d'une copie dans `berger-essai`.** Expected : tests verts ; la capture montre `import` en rose `#F92672`, les chaînes en jaune `#E6DB74`, les commentaires `#88846f`, les noms de fonctions en vert, fond `#272822`. Comparer à la capture de VS Code du même fichier (voir contraintes globales) : mêmes couleurs jeton par jeton, hors coloration sémantique (Tâche 4).
- [ ] **Step 7 : `docs/COPIES.md`** (grammaires, `langages.json` tiré des `package.json`, thème, table sémantique, licence MIT) **et commit** `feat(phase5): coloration et thème Monokai de VS Code`.

---

### Task 4 : l'aide du langage dans l'éditeur

**Files :**
- Create : `src/renderer/src/langage.ts`, `src/renderer/src/json.ts`, `src/main/services/schemas.ts`
- Modify : `src/renderer/src/editeur.ts`, `src/renderer/src/main.ts`, `src/main/index.ts`

**Interfaces :**
- Consumes : canaux `berger:lsp-*` (Tâche 2) ; `plageDeLsp`, `versLsp`, `graviteMonaco`, `texteSurvol`, `editionsParFichier`, `appliquerEditions`, `serveurDe`, `idLsp`, `schemaJson` (Tâche 1) ; `reglesSemantiques` (Tâche 3) pour la légende.
- Produces :
  ```ts
  // langage.ts
  export function initLangage(o: { ouvrirA: (chemin: string, plage?: monaco.IRange) => Promise<void>; modeleOuvert: (chemin: string) => monaco.editor.ITextModel | null }): void
  export function suivreModele(chemin: string, modele: monaco.editor.ITextModel): void   // didOpen, didChange incrémental, didClose à la disparition
  export async function modelePour(chemin: string): Promise<monaco.editor.ITextModel | null>  // modèle existant, sinon lu par berger:lire et créé (aperçus)
  // json.ts
  export function suivreJson(chemin: string, modele: monaco.editor.ITextModel): void
  // editeur.ts
  export function revelerPlage(chemin: string, plage: monaco.IRange): void
  // main : 'berger:schema' {url} → string | null (net.fetch, délai 10 s, cache userData/schemas/<sha1 de l'url>.json)
  ```

- [ ] **Step 1 : les modèles portent l'adresse du fichier.** Dans `afficherFichier`, `monaco.editor.createModel(texte, langage, monaco.Uri.file(chemin))` ; si `monaco.editor.getModel(uri)` existe déjà (créé par `modelePour`), le reprendre, lui donner le texte lu s'il diffère, et le ranger dans `ouverts`. Après création : `suivreModele` si `serveurDe(chemin)`, `suivreJson` si le langage est `json`. Dans `suivreDeplacementEditeur`, un modèle déplacé est recréé sous la nouvelle adresse avec son texte ; s'il était modifié, `versionEnregistree` est mis à une valeur qui le garde modifié (`-1`) ; l'ancien est jeté (ce qui envoie `didClose`).
- [ ] **Step 2 : couper les services TypeScript intégrés de Monaco** pour `typescript` et `javascript` (réglages `typescriptDefaults`/`javascriptDefaults` : diagnostics et tous les fournisseurs désactivés par `setModeConfiguration` ; chercher où la 0.57 range ces objets dans `node_modules/monaco-editor/esm/vs/language/typescript/monaco.contribution.js`). Retirer le `TsWorker` s'il ne sert plus.
- [ ] **Step 3 : écrire `langage.ts`.** Fournisseurs Monaco pour `typescript`, `javascript`, `yaml` (le serveur est choisi par `serveurDe` du chemin du modèle) : complétion (`textDocument/completion`, puis `completionItem/resolve` pour la doc), définition (`F12`, `⌘` clic), références (`⇧F12` ; avant de rendre les emplacements, `await modelePour` de chaque fichier cité pour que l'aperçu ait son texte), survol, renommage (`F2`), jetons sémantiques (légende de `berger:lsp-capacites`). Diagnostics : `berger:lsp-notif` `textDocument/publishDiagnostics` → `monaco.editor.setModelMarkers(modele, 'berger-lsp', …)` (message, code, source) ; ignoré si aucun modèle n'a cette adresse. `berger:lsp-redemarre` → `didOpen` de nouveau pour chaque modèle suivi de ce serveur. `berger:lsp-arrete` → le message de la contrainte globale dans `#fichier-message`, gardé. Une requête en erreur rend un résultat vide, jamais une exception dans l'éditeur.
  - Renommage : les éditions des fichiers qui ont un onglet ouvert (`modeleOuvert`) sont rendues à Monaco (non enregistrées, avec leur point) ; les autres fichiers sont lus (`berger:lire`), modifiés par `appliquerEditions` et écrits (`berger:ecrire` avec `texteCharge` = texte lu) ; un modèle d'aperçu de ces fichiers est mis à jour ou jeté.
  - Aller à un autre fichier : `monaco.editor.registerEditorOpener` → `ouvrirA(uri.fsPath, plage)` ; `ouvrirA` (dans `main.ts`) ouvre l'onglet comme `⌘P` (`ouvrirChemins` puis afficher l'onglet), attend `afficherFichier`, puis `revelerPlage` (sélection + `revealRangeInCenter`).
  - « Organiser les imports » : `editeur.addAction({ id: 'berger.organiserImports', label: 'Organiser les imports', keybindings: [Shift | Alt | KeyO], contextMenuGroupId: '1_modification' })`, seulement pour le serveur `typescript` : `textDocument/codeAction` avec `context.only: ['source.organizeImports']`, la première action rendue appliquée au modèle (`pushEditOperations`, annulable).
- [ ] **Step 4 : écrire `json.ts` et `src/main/services/schemas.ts`.** Réglages du service JSON de Monaco : `validate: true`, `allowComments: true`, `trailingCommas: 'warning'`, `enableSchemaRequest: false`, `schemaRequest: 'ignore'`, et `schemas` = un élément par modèle JSON ouvert dont `schemaJson` rend une adresse et dont `berger:schema` rend un texte (`{ uri: url, fileMatch: [modele.uri.toString()], schema: JSON.parse(texte) }`). Relu 1 s après une modification du modèle (le `$schema` déclaré peut changer) ; retiré quand le modèle disparaît. Sans réseau : pas de schéma, la syntaxe reste vérifiée.
- [ ] **Step 5 : lancer `npm run typecheck` et `npm test`.** Expected : verts.
- [ ] **Step 6 : vérifier dans l'application** (dossier `berger-essai` de la Tâche 5, ou à la main avec `BERGER_CAPTURE`) : `F12` sur un symbole importé ouvre l'autre fichier ; une erreur de type tapée est soulignée en moins de 3 s ; le survol montre le type ; un `package.json` sans virgule est souligné. Expected : vu sur les captures.
- [ ] **Step 7 : commit** `feat(phase5): aide du langage TypeScript, JavaScript, JSON et YAML dans l'éditeur`.

---

### Task 5 : confort, rechargement, scénario et bilan

**Files :**
- Create : `src/main/reglages.ts`, `docs/notes/bilan-phase5-editeur.md`
- Modify : `src/renderer/src/editeur.ts`, `src/renderer/src/clavier.ts`, `src/renderer/src/main.ts`, `src/main/index.ts`, `src/main/scenario.ts`, `CLAUDE.md`, `docs/suivi/ROADMAP.md`, `docs/suivi/DETTE.md`, `docs/COPIES.md`

**Interfaces :**
- Consumes : `lireReglages` (Tâche 1) ; `definirTheme` (Tâche 3) ; `quoiFaire`, `retourLigne`, `editeur.retourLigne` (Tâche 1) ; `suivreModele` (Tâche 4).
- Produces : `'berger:reglages'` → `Reglages` (relu à chaque demande, jamais écrit) ; `basculerRetourLigne(): void` dans `editeur.ts` ; scénario `BERGER_SCENARIO=langage`.

- [ ] **Step 1 : réglages et retour à la ligne.** Au démarrage, la fenêtre demande `berger:reglages` et appelle `definirTheme(couleurSelection)`. `wordWrap: etat().retourLigne ? 'on' : 'off'` à la création ; `basculerRetourLigne` change l'option et `retourLigne` (retenu). `clavier.ts` : `editeur.retourLigne` → `basculerRetourLigne()`. Options déjà là ou à poser : `multiCursorModifier: 'alt'`, `folding: true`, `minimap: { enabled: true }`. Vérifier avec `long.txt` (lignes de 400 caractères) qu'en retour à la ligne aucun caractère ne passe sous la minicarte ; sinon corriger (par exemple `wordWrap: 'bounded'` avec une colonne calculée sur la largeur utile).
- [ ] **Step 2 : rechargement.** `editeur.ts` écoute `berger:disque` : pour chaque chemin ouvert concerné, lire (`berger:lire`), puis selon `quoiFaire` : `recharger` → `pushEditOperations` sur tout le texte (curseur et défilement gardés), `texteCharge` et `versionEnregistree` mis à jour (pas de point) ; `garder` et `rien` → rien. Le serveur reçoit le `didChange` par `suivreModele`, les erreurs sont recalculées.
- [ ] **Step 3 : scénario `langage`** dans `src/main/scenario.ts` (accès à Monaco par `window.bergerEssai = { monaco, editeur }`, posé seulement si `import.meta.env.DEV`). `BERGER_SCENARIO=langage BERGER_SCENARIO_DOSSIER=<dossier berger-essai…> BERGER_SCENARIO_SORTIE=<préfixe>`. Le dossier contient : `tsconfig.json` (strict), `package.json` valide, `node_modules/typescript` (lien vers celui de Berger), `node_modules/petit-paquet/{package.json,index.d.ts}` (exporte `bonjour(nom: string): string`), `src/b.ts` (`export function somme(a: number, b: number)`), `src/a.ts` (importe `somme` et `bonjour`, ligne `const café = somme(1, 2) // 🐑`), `mauvais/package.json` (virgule manquante), `.github/workflows/ci.yml` (`jobs: 3`), `long.txt`. Étapes, une capture et une ligne de journal chacune : ajouter la racine ; ouvrir `src/a.ts` ; `F12` sur `somme` (journal : onglet affiché = `src/b.ts`) ; retour, `F12` sur `bonjour` (onglet = `index.d.ts`) ; taper `const n: number = 'x'` en fin de `a.ts`, attendre 3 s (journal : marqueurs avec `2322`) ; survol de `café` ; complétion après `som` ; réécrire `src/b.ts` sur le disque avec un troisième paramètre (journal : nouvelle erreur dans `a.ts`, `a.ts` toujours modifié et intact) ; ouvrir `mauvais/package.json` (journal : marqueurs) ; ouvrir `ci.yml` (journal : marqueurs du schéma GitHub Actions) ; renommer `src/b.ts` en `src/c.ts` par l'explorateur alors que `a.ts` est modifié (journal : le modèle de `c.ts` a l'adresse `file://…/src/c.ts`, `a.ts` toujours modifié) ; ouvrir `long.txt`, `⌥Z` deux fois. Documenter le scénario dans l'en-tête de `scenario.ts` et dans `CLAUDE.md`.
- [ ] **Step 4 : jouer le scénario** (copies des fichiers d'état faites avant, remises après). Expected : chaque ligne du journal comme décrit ; lire chaque capture avec Read.
- [ ] **Step 5 : vérification visuelle.** Ouvrir avec claude-in-chrome `file:///Users/antoinesouesme/dev/playground/berger/docs/maquettes/vue-fichier.html` et comparer la disposition de l'onglet de fichier (bandeau du chemin, barre d'état du fichier) aux captures. Comparer les couleurs d'un même fichier TypeScript entre Berger et VS Code (coloration sémantique comprise : paramètres orange italique, fonctions vertes). Comparer le menu du clic droit de l'éditeur (« Organiser les imports » présent). Expected : mêmes couleurs ; écarts notés et corrigés, ou listés dans le bilan s'ils viennent de Monaco.
- [ ] **Step 6 : `npm test`, `npm run typecheck`, `npm run lint`.** Expected : tout passe.
- [ ] **Step 7 : bilan et suivi.** `docs/notes/bilan-phase5-editeur.md` (ce qui marche, vu comment ; écarts avec VS Code ; ce qui reste). `docs/suivi/ROADMAP.md` : phase 5 « Faite, à vérifier par Antoine (bilan : …) ». `docs/suivi/DETTE.md` (au format en tête du fichier) : l'empaquetage de la phase 7 devra garder hors de l'archive `asar` les serveurs de langage et `onig.wasm` ; les fichiers ouverts hors des racines surveillées ne se rechargent pas ; recherche dans le projet et différences git remises à plus tard.
- [ ] **Step 8 : commit, push et PR vers `develop`** (titre « Phase 5 : l'éditeur complet »), corps : ce qui est fait, comment le vérifier (`BERGER_SCENARIO=langage`), ce qui est remis à plus tard.
