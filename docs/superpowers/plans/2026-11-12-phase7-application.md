# Berger phase 7 — l'application installée et ses réglages : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** faire de Berger une application installée dans `/Applications` (icône, lancée du Dock ou de Spotlight), réglable dans une fenêtre de réglages (`⌘,`) et dans `reglages.json` suivi à chaud (thème de l'application et thème de l'éditeur séparés, polices, couleur de sélection, raccourcis), qui revient comme on l'a laissée.

**Architecture :** les règles sont des modules purs dans `src/shared/` testés dans `tests/` : thèmes (lecture du format Herdr, couleurs de la fenêtre, du terminal et de l'éditeur dérivées d'un thème, contraste), réglages (lecture, modification d'une clé dans le texte du fichier), raccourcis (table de commandes avec touches d'origine et touches personnelles, conflits), cadre de la fenêtre, `PATH` du shell. La partie Node (`src/main/reglages.ts`) lit, surveille et écrit `reglages.json` et le dossier `themes/`, et pousse à la fenêtre chaque changement ; la fenêtre applique tout sans relancer (variables CSS, xterm, Monaco). L'application est empaquetée par `electron-builder` (`--dir`, sans signature Apple) et installée par `npm run installer`.

**Tech Stack :** Electron 44, electron-vite 6, TypeScript, vitest, `monaco-editor` 0.57, `vscode-textmate`, xterm 6, `electron-builder` 26 (déjà en `devDependencies`). Outils du Mac pour l'icône : `rsvg-convert` (Homebrew, présent), `iconutil`. Aucune dépendance nouvelle.

**Spec :** `docs/superpowers/specs/2026-11-12-phase7-application-design.md` (à lire en entier, **décisions d'Antoine en tête comprises**). Maquette : `docs/maquettes/reglages.html` (sections Apparence et Raccourcis), règles visuelles `docs/maquettes/README.md`, logo `docs/logo-berger.svg` (variante C de `docs/maquettes/logos.html`). Pas de lien de design externe.

## Global Constraints

- Branche de travail : `phase7-application`, déjà créée depuis `develop` avec ce plan. PR vers `develop` à la fin, jamais vers `main`.
- Hors périmètre : autres machines (phase 6, donc pas de « Ajouter une machine »), signature et notarisation Apple, mise à jour automatique, Windows et Linux, synchronisation des réglages, éditeur de thèmes, recherche dans le projet (`⇧⌘F` reste réservé, sans commande).
- Dossiers de données : version installée `~/Library/Application Support/Berger/`, `npm run dev` (et `npm start`) `~/Library/Application Support/Berger-dev/`. Le dossier actuel `berger` (minuscule) est le même que `Berger` sur un disque APFS insensible à la casse : la version installée reprend donc l'état actuel d'Antoine. La version de développement n'écrit jamais dans `Berger/`.
- Thèmes fournis (pour les deux réglages), noms affichés exacts : `antoine-monokai` (défaut), `Monokai`, `Atom One Dark`, `Graphite`, `Ink`, `Moss`, `Paper (clair)` ; pour l'éditeur seulement : `Dark Modern (VS Code)`, `Light Modern (VS Code)`. Couleurs fixées par la spec : antoine-monokai = `~/.config/herdr-app/themes/antoine-monokai.json` (fond `#272822`, texte `#d0d0c8`, sélection `#49483e`), Monokai texte `#f8f8f2`, Atom One Dark = `~/.config/herdr-app/themes/atom-one-dark.json` (fond `#21252b`, texte `#abb2bf`). Graphite, Ink, Moss sombres, Paper clair : teintes au choix du développeur (inspirées de Herdr).
- Format d'un thème : celui de Herdr `{ background, foreground, selection, cursor?, ansi: [16], colors? }` (noms de `colors` : ceux de Herdr, `canvas`, `surface`, `border`, `muted`, `dim`, `selected`, `hover`, `raised`, `popover`, `accent`, `solid_foreground`, `working`, `blocked`, `done`…), plus le champ facultatif `editeur`. Un thème personnel est un fichier `<dossier de données>/themes/<id>.json` ; il remplace un thème fourni de même `id`.
- Couleur de sélection : réglage de l'éditeur seulement (décision d'Antoine) ; absente = celle du thème de l'éditeur. L'ancienne clé `editeur.couleurSelection` de `reglages.json` reste lue.
- Raccourcis : seuls ceux de Berger se modifient ; ceux de Monaco et ceux de l'explorateur (`F2`, `⌘C`, `⌘V`, `⌥⌘C`, `⌘⌫`) gardent leurs touches. Le menu de l'application ne prend toujours aucun raccourci de Berger (`⌘,` passe par la table ; l'entrée « Réglages… » affiche `⌘,` sans l'enregistrer : `registerAccelerator: false`).
- Un `reglages.json` mal formé ne casse rien : derniers réglages valides gardés, message dans la barre d'état, et la fenêtre des réglages refuse d'écrire (elle écraserait le texte d'Antoine) tant qu'il est mal formé. Une valeur invalide = sa valeur par défaut, les autres clés gardées. Les clés inconnues du fichier sont conservées à l'écriture.
- Textes de l'interface en français, avec les accents. Code et noms en français comme dans les phases précédentes.
- Code repris : une ligne par morceau dans `docs/COPIES.md` (thèmes de Herdr recopiés — Herdr est sous licence Apache 2.0, `/Applications/Herdr.app/Contents/Resources/LICENSE` ; thèmes Dark Modern et Light Modern de VS Code, MIT ; logo dessiné pour Berger).
- Ne jamais modifier `~/.config/herdr-app/` ni `~/dev/playground/herdr-app-mod/`. Ne jamais toucher les terminaux ni les spaces d'Antoine : essais dans des dossiers `berger-essai…` (scratchpad) et des spaces `spbergertest…`.
- Avant le premier lancement de la version installée (Tâche 8), garder une copie de `~/Library/Application Support/berger/` entier (dans le scratchpad) ; ne la remettre que si l'essai l'a abîmée.
- Vérifier sans cliquer : `BERGER_CAPTURE`, `BERGER_SCENARIO` (voir `src/main/scenario.ts` et `CLAUDE.md`). Une chose « marche » seulement après l'avoir vue dans l'application lancée.
- Vérification visuelle : application Electron locale, **aucun compte ni identifiant de connexion** (rien à mettre dans `.env.local`). Les captures de Berger (lues avec l'outil Read) sont comparées avec claude-in-chrome à la maquette `file:///Users/antoinesouesme/dev/playground/berger/docs/maquettes/reglages.html`.

## Review Focus

- **Thème clair (Paper ou Light Modern) : du texte illisible.** Des couleurs sont écrites en dur (`#a59f85`, `#cccccc` de l'explorateur, `#75715e` de la barre d'état, `#2a2b26`, le damier de la visionneuse, les ombres des dialogues). Attendu : avec Paper, chaque texte et chaque icône de la fenêtre se lit ; seuls les couleurs git de l'explorateur, les pastilles des workspaces et les couleurs d'état des agents restent fixes. Test de contraste sur chaque thème fourni (Tâche 2), captures de chaque thème (Tâche 6).
- **Changer de thème de l'éditeur avec des fichiers déjà colorés.** Les jetons de Monaco portent un numéro de couleur (`c12`) propre à la table du thème : sans recoloration, l'ancien code garde des couleurs fausses. Attendu : tous les modèles ouverts se recolorent tout de suite (réenregistrer les fournisseurs de jetons après `registre.setTheme`). Étape du scénario (Tâche 6).
- **`reglages.json` mal formé, puis corrigé, ou un thème choisi dont le fichier est supprimé.** Attendu : derniers réglages valides gardés et message ; corrigé, le message disparaît et le fichier s'applique ; thème inconnu = antoine-monokai, sans plantage. Tests (Tâche 3), étape du scénario (Tâche 6).
- **Un raccourci personnel déjà pris par un autre, ou touches sans effet (une seule touche de modification, `⌘Q`).** Attendu : le conflit est nommé (« Déjà pris par « Diviser à droite » ») et rien n'est enregistré tant qu'il dure ; une touche de modification seule n'est pas une touche ; `⌘Q`, `⌘H`, `⌘O` sont refusées (ce sont celles du menu). Tests (Tâche 4).
- **Relancer après avoir débranché l'écran où était la fenêtre, ou quitté en plein écran.** Attendu : un cadre hors de tous les écrans est ignoré (taille par défaut, centrée) ; le plein écran revient. Tests `lireCadre` (Tâche 7).

---

## Le découpage des fichiers

Nouveaux modules purs (`src/shared/`) :

| Fichier | Rôle |
|---|---|
| `themes.ts` | lecture d'un thème, couleurs de la fenêtre, du terminal et de l'éditeur, contraste, clair ou sombre |
| `themes/*.json` + `themes-fournis.ts` | les 7 thèmes fournis et leur liste |
| `reglages.ts` (réécrit) | type des réglages, lecture, modification d'une clé dans le texte du fichier |
| `raccourcis.ts` (réécrit autour d'une table) | commandes, touches, table personnelle, conflits, libellés `⇧⌘D` |
| `cadre-fenetre.ts` | taille, place et plein écran de la fenêtre retenus |
| `chemin.ts` | `PATH` du shell de connexion |

Processus principal : `src/main/index.ts` (dossier de données, `PATH`, cadre), `src/main/reglages.ts` (réécrit : lecture, surveillance, écriture, thèmes), `src/main/cadre.ts` (nouveau), `src/main/chemin.ts` (nouveau), `src/main/menu.ts`, `src/main/actions.ts` et `src/main/terminal.ts` (couleurs données au core), `src/main/scenario.ts`.

Fenêtre (`src/renderer/src/`) : `reglages.ts` (nouveau : la fenêtre des réglages), `apparence.ts` (nouveau : applique réglages et thèmes à la fenêtre, au terminal, à l'éditeur), `coloration.ts` (thème de l'éditeur changeable), `editeur.ts`, `terminal.ts`, `clavier.ts`, `colonne.ts` (bouton « Réglages »), `barre-etat.ts`, `main.ts`, `assets/main.css`, et chaque fichier qui écrit une couleur en dur.

Empaquetage : `electron-builder.yml`, `scripts/icone.mjs`, `scripts/installer.mjs`, `build/icone.svg`, `build/icone-petite.svg`, `build/icon.icns`, `resources/icon.png`, `package.json` (scripts `icone`, `installer`).

---

### Task 1 : dossiers de données et `PATH`

**Files :**
- Create : `src/shared/chemin.ts`, `src/main/chemin.ts`, `tests/chemin.test.ts`
- Modify : `src/main/index.ts`

**Interfaces :**
- Produces :
  ```ts
  // src/shared/chemin.ts
  export const MARQUE = '__BERGER_PATH__'
  export function extrairePath(sortie: string): string | null // texte entre deux MARQUE, null sinon
  export function fusionnerPath(actuel: string, duShell: string): string // ceux du shell d'abord, sans doublon, puis ceux d'avant
  // src/main/chemin.ts
  export function completerPath(): void // version installée seulement ; ne lève jamais
  ```

- [ ] **Step 1 : tests** — `extrairePath('bla\n__BERGER_PATH__/a:/b__BERGER_PATH__\n')` → `'/a:/b'` ; sans marque → `null` ; `fusionnerPath('/usr/bin:/bin', '/opt/homebrew/bin:/usr/bin')` → `'/opt/homebrew/bin:/usr/bin:/bin'` ; `fusionnerPath('/usr/bin', '')` → `'/usr/bin'`.
- [ ] **Step 2 :** `npx vitest run tests/chemin.test.ts` → FAIL (module absent).
- [ ] **Step 3 : implémenter.** `completerPath` : si `app.isPackaged`, `execFileSync(process.env.SHELL ?? '/bin/zsh', ['-ilc', \`printf '${MARQUE}%s${MARQUE}' "$PATH"\`], { timeout: 3000, encoding: 'utf8' })`, puis `process.env.PATH = fusionnerPath(...)` ; toute erreur est journalisée et ignorée (`cheminHc` garde son `~/.local/bin/hc`). Dans `src/main/index.ts`, **avant** `app.whenReady()` et avant tout `getPath('userData')` : `app.setPath('userData', join(app.getPath('appData'), app.isPackaged ? 'Berger' : 'Berger-dev'))`, puis `completerPath()`.
- [ ] **Step 4 :** `npx vitest run tests/chemin.test.ts` → PASS ; `npm run typecheck` → sans erreur.
- [ ] **Step 5 : vérifier la casse.** `ls -di ~/Library/Application\ Support/berger ~/Library/Application\ Support/Berger` → même numéro d'inode (même dossier). Si ce n'est pas le cas (disque sensible à la casse), arrêter et le noter au bilan : il faudra renommer le dossier, avec l'accord d'Antoine.
- [ ] **Step 6 :** `npm run dev`, puis `ls ~/Library/Application\ Support/Berger-dev/` → `etat-fenetre.json` (et les autres) y apparaissent ; rien de modifié dans `berger/` (`ls -lT` avant et après).
- [ ] **Step 7 : commit** `feat(phase7): dossier de données Berger-dev en développement, PATH du shell pour la version installée`.

### Task 2 : les thèmes (règles pures)

**Files :**
- Create : `src/shared/themes.ts`, `src/shared/themes/{antoine-monokai,monokai,atom-one-dark,graphite,ink,moss,paper}.json`, `src/shared/themes-fournis.ts`, `tests/themes.test.ts`
- Modify : `scripts/copier-grammaires.mjs` (copie de Dark Modern et Light Modern), `src/renderer/public/vscode/themes/` (produit), `docs/COPIES.md`

**Interfaces :**
- Consumes : `ThemeVsCode`, `ReglesTextMate` de `src/shared/theme.ts`.
- Produces :
  ```ts
  export type TypeMot = 'commentaire' | 'chaine' | 'motCle' | 'fonction' | 'type' | 'nombre'
    | 'constante' | 'variable' | 'balise' | 'attribut' | 'operateur'
  export type ChampEditeur = Partial<Record<TypeMot, string>> & { vscode?: string }
  export type ThemeHerdr = { background: string; foreground: string; selection: string; cursor?: string;
    ansi: string[]; colors?: Record<string, string>; editeur?: ChampEditeur }
  export type ThemeConnu = { id: string; nom: string; theme: ThemeHerdr; source: 'fourni' | 'perso' }
  export type CleFenetre = 'fond' | 'panneau' | 'bord' | 'texte' | 'vif' | 'gris' | 'grisClair' | 'actif'
    | 'survol' | 'popover' | 'clavier' | 'vert' | 'rouge' | 'jaune'
  export const PORTEES_MOTS: Record<TypeMot, string[]>
  export function lireTheme(brut: unknown): ThemeHerdr | null
  export function couleursFenetre(t: ThemeHerdr): Record<CleFenetre, string>
  export function couleursTerminal(t: ThemeHerdr): { background: string; foreground: string; cursor: string;
    selectionBackground: string; black: string; red: string; green: string; yellow: string; blue: string;
    magenta: string; cyan: string; white: string; brightBlack: string; brightRed: string; brightGreen: string;
    brightYellow: string; brightBlue: string; brightMagenta: string; brightCyan: string; brightWhite: string }
  export function affichageDe(t: ThemeHerdr): { bg: string; fg: string; cursor: string }
  export function estClair(couleur: string): boolean
  export function contraste(a: string, b: string): number // rapport WCAG, 1 à 21
  export function themeEditeur(t: ThemeHerdr, vscode: ThemeVsCode | null): ThemeVsCode & { type: 'dark' | 'light' }
  // themes-fournis.ts
  export const THEMES_FOURNIS: ThemeConnu[] // dans l'ordre de la maquette
  export const THEMES_EDITEUR_VSCODE: { id: 'vscode-dark-modern' | 'vscode-light-modern'; nom: string; fichier: string }[]
  export const THEME_PAR_DEFAUT = 'antoine-monokai'
  ```

- [ ] **Step 1 : tests** (`tests/themes.test.ts`) :
  - `lireTheme` : le contenu de `~/.config/herdr-app/themes/atom-one-dark.json` recopié dans le test → thème lu ; `ansi` de 15 couleurs, `background` absent, couleur `'rouge'` → `null`.
  - `couleursFenetre(antoine-monokai)` égale exactement les variables actuelles de `main.css` : `{ fond: '#1e1f1c', panneau: '#272822', bord: '#34352f', texte: '#d0d0c8', vif: '#f8f8f2', gris: '#75715e', grisClair: '#a59f85', actif: '#414339', clavier: '#66d9ef', survol: '#3e3d32', popover: '#1e1f1c', vert: '#a6e22e', rouge: '#f92672', jaune: '#e6db74' }`.
  - Un thème sans `colors` (Atom One Dark) donne des couleurs dérivées : `texte` = `foreground`, `panneau` = `background`, `fond` plus sombre que `panneau`, `bord` entre `panneau` et `texte` ; pour un thème clair (Paper), `fond` est plus éloigné du texte que `panneau` (dans le sens donné par `estClair`).
  - **Lisibilité, pour chaque thème de `THEMES_FOURNIS`** : `contraste(texte, fond)` et `contraste(texte, panneau)` ≥ 4,5 ; `contraste(grisClair, panneau)` ≥ 3 ; `contraste(gris, panneau)` ≥ 2 ; pour `themeEditeur(t, …)`, chaque couleur des règles `comment`, `string`, `keyword`, `entity.name.function`, `constant.numeric` contre `editor.background` ≥ 3.
  - `themeEditeur(t, null)` sans champ `editeur` : `tokenColors` déduites des 16 couleurs (commentaire = `ansi[8]`, chaîne = `ansi[11]`, mot-clé = `ansi[9]`, fonction = `ansi[10]`, type = `ansi[14]`, nombre = `ansi[13]`), `colors['editor.background']` = `background`, `type` = `'dark'`.
  - `themeEditeur(antoine-monokai, monokaiVsCode)` (fichier `src/renderer/public/vscode/monokai-color-theme.json` lu dans le test) : `tokenColors` de VS Code, `editor.foreground` = `'#d0d0c8'`, la règle sans portée a `foreground: '#d0d0c8'` ; `themeEditeur(monokai, monokaiVsCode)` garde `#f8f8f2`.
  - Paper : `estClair(background)` vrai, `themeEditeur(paper, null).type === 'light'`.
- [ ] **Step 2 :** `npx vitest run tests/themes.test.ts` → FAIL.
- [ ] **Step 3 : écrire les thèmes.** `antoine-monokai.json` : copie de celui de Herdr + `"editeur": { "vscode": "monokai-color-theme.json" }`. `monokai.json` : mêmes couleurs, `foreground` `#f8f8f2`, même champ `editeur`. `atom-one-dark.json` : copie de Herdr + `editeur` par type de mot (couleurs d'Atom One Dark : commentaire `#5c6370`, chaîne `#98c379`, mot-clé `#c678dd`, fonction `#61afef`, type `#e5c07b`, nombre `#d19a66`…). Graphite, Ink, Moss, Paper : teintes à choisir, chacune avec son champ `editeur`. `themes-fournis.ts` les charge par `import.meta.glob('./themes/*.json', { eager: true })` (l'`id` est le nom du fichier).
- [ ] **Step 4 : implémenter `themes.ts`.** `couleursFenetre` : chaque clé prend d'abord la couleur Herdr correspondante de `colors` (`fond`←`canvas`, `panneau`←`surface`, `bord`←`border`, `texte`←`foreground`, `vif`←`solid_foreground`, `gris`←`dim`, `grisClair`←`muted`, `actif`←`selected`, `survol`←`hover`, `popover`←`popover`, `clavier`←`accent`, `vert`←`done`, `rouge`←`blocked`, `jaune`←`working`), sinon un mélange de `background` et `foreground` (s'inspirer de la dérivation de Herdr ; `clavier` ← `ansi[14]`, `vert` ← `ansi[10]`, `rouge` ← `ansi[9]`, `jaune` ← `ansi[11]`). `themeEditeur` : `tokenColors` = celles du thème VS Code donné, sinon `PORTEES_MOTS` × champ `editeur`, sinon les 16 couleurs ; `colors` = celles du thème VS Code puis `editor.background`, `editor.foreground`, `editor.selectionBackground`, `editorCursor.foreground`, `editor.lineHighlightBackground`, `editorLineNumber.foreground`, `editorWidget.background`, `editorSuggestWidget.background`, `menu.background`, `menu.foreground` du thème Herdr. Les thèmes VS Code de l'éditeur seul passent sans `themeEditeur`.
- [ ] **Step 5 : Dark Modern et Light Modern.** Étendre `scripts/copier-grammaires.mjs` : lire `extensions/theme-defaults/themes/dark_modern.json` et `light_modern.json`, résoudre leurs `include` (parent d'abord : `colors` fusionnées, `tokenColors` concaténées), écrire `src/renderer/public/vscode/themes/dark-modern.json` et `light-modern.json` (`{ type, colors, tokenColors }`). Lancer `node scripts/copier-grammaires.mjs`.
- [ ] **Step 6 :** `npx vitest run tests/themes.test.ts` → PASS (ajuster les teintes jusqu'à ce que les contrastes passent, jamais les seuils).
- [ ] **Step 7 :** `docs/COPIES.md` : thèmes `antoine-monokai` et `atom-one-dark` recopiés de `~/.config/herdr-app/themes/` (Herdr, Apache 2.0) ; Graphite, Ink, Moss, Paper inspirés des thèmes intégrés de Herdr, aucune couleur reprise telle quelle sauf mention ; `dark-modern.json`, `light-modern.json` de VS Code (MIT).
- [ ] **Step 8 : commit** `feat(phase7): thèmes au format de Herdr, couleurs de la fenêtre, du terminal et de l'éditeur`.

### Task 3 : les réglages (règles pures et partie Node)

**Files :**
- Modify : `src/shared/reglages.ts`, `tests/reglages.test.ts`, `src/main/reglages.ts`, `src/main/index.ts`, `src/main/actions.ts`, `src/main/terminal.ts`, `src/shared/terminaux.ts` (retirer `AFFICHAGE`)
- Modify : `src/shared/etat-fenetre.ts`, `tests/etat-fenetre.test.ts` (`retourLigne: boolean | null`)

**Interfaces :**
- Consumes : `ThemeConnu`, `THEMES_FOURNIS`, `lireTheme`, `affichageDe`, `THEME_PAR_DEFAUT` (Tâche 2).
- Produces :
  ```ts
  // src/shared/reglages.ts
  export type Reglages = {
    apparence: { themeApplication: string; themeEditeur: string; policeInterface: string; taillePoliceInterface: number }
    editeur: { couleurSelection: string | null; police: string; taille: number; retourLigne: boolean; minicarte: boolean; tabulations: number }
    terminal: { police: string; taille: number }
    raccourcis: Record<string, string[]> // id de commande → touches ('cmd-shift-d'), [] = aucun
  }
  export const REGLAGES_PAR_DEFAUT: Reglages
  export function lireReglages(brut: unknown): Reglages
  export function modifierReglage(texte: string, chemin: string[], valeur: unknown): string | null
  // src/main/reglages.ts
  export type EtatReglages = { reglages: Reglages; themes: ThemeConnu[]; erreur: string | null; chemin: string; dossierThemes: string }
  export function brancherReglages(envoyer: (e: EtatReglages) => void): { actuel(): EtatReglages; affichage(): { bg: string; fg: string; cursor: string } }
  ```
  IPC : `berger:reglages` (handle → `EtatReglages`), `berger:modifier-reglage` (handle `{ chemin: string[]; valeur: unknown }` → `{ ok: true } | { ok: false; message: string }`), poussée `berger:reglages` (`EtatReglages`) à chaque changement de `reglages.json` ou du dossier `themes/`.

- [ ] **Step 1 : tests.** Défauts exacts : `apparence = { themeApplication: 'antoine-monokai', themeEditeur: 'antoine-monokai', policeInterface: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif", taillePoliceInterface: 13 }`, `editeur = { couleurSelection: null, police: 'Menlo, monospace', taille: 13, retourLigne: false, minicarte: true, tabulations: 2 }`, `terminal = { police: "'IBM Plex Mono', Menlo, monospace", taille: 12 }`, `raccourcis = {}`. `lireReglages(null)` = défauts ; l'ancien `{ editeur: { couleurSelection: '#264f78' } }` reste lu ; `'rouge'` → `null` ; taille `0`, `200`, `'13'` → défaut (bornes 8 à 32) ; tabulations bornées 1 à 8 ; `raccourcis: { 'panneau.diviserBas': 'cmd-alt-d' }` → `['cmd-alt-d']`, `{ x: 3 }` ignoré. `modifierReglage('', ['apparence','themeEditeur'], 'ink')` → JSON indenté de 2 espaces finissant par `\n` ; sur `'{ "inconnu": 1 }'` la clé `inconnu` reste ; valeur `undefined` retire la clé ; `'{ mal'` → `null`. Dans `tests/etat-fenetre.test.ts` : `retourLigne` absent → `null`, `true` → `true`.
- [ ] **Step 2 :** `npx vitest run tests/reglages.test.ts tests/etat-fenetre.test.ts` → FAIL.
- [ ] **Step 3 : implémenter les règles pures** (`retourLigne` de l'état : `null` = suivre le réglage `editeur.retourLigne` ; `⌥Z` y écrit un booléen ; changer le réglage dans la fenêtre remet l'état à `null`).
- [ ] **Step 4 : partie Node.** `src/main/reglages.ts` : fichier `<userData>/reglages.json` (jamais créé tant que la fenêtre n'écrit rien), dossier `<userData>/themes/` (créé au démarrage). Surveiller le dossier de données avec `fs.watch` (un éditeur peut remplacer le fichier au lieu de l'écrire), filtrer `reglages.json`, regrouper les événements (150 ms). JSON illisible → garder les derniers réglages, `erreur` = `reglages.json est mal formé : derniers réglages valides gardés.` ; lisible → `erreur = null`. Thèmes : fournis, puis ceux du dossier (`lireTheme`, fichiers illisibles ignorés et journalisés), un thème perso remplaçant le fourni de même `id` (`nom` = `id`). `berger:modifier-reglage` : relit le texte, `modifierReglage`, refuse si `null` (`message` = l'erreur ci-dessus), écrit sinon. `affichage()` = `affichageDe` du thème de l'application (inconnu → antoine-monokai) ; `actions.ts` et `terminal.ts` l'utilisent à la place de `AFFICHAGE`.
- [ ] **Step 5 :** `npm test` → PASS ; `npm run typecheck` → sans erreur.
- [ ] **Step 6 : commit** `feat(phase7): réglages lus, surveillés et écrits, thèmes personnels`.

### Task 4 : les raccourcis en table

**Files :**
- Modify : `src/shared/raccourcis.ts`, `tests/raccourcis.test.ts`, `src/renderer/src/clavier.ts`, `src/renderer/src/editeur.ts` (retirer l'`addCommand` de `⌘S`)

**Interfaces :**
- Produces :
  ```ts
  export type Commande = { id: string; libelle: string; action: ActionClavier; touches: string[] }
  export const COMMANDES: Commande[]
  export const TOUCHES_REFUSEES: string[] // ['cmd-q', 'cmd-h', 'cmd-alt-h', 'cmd-o']
  export function touchesDe(t: Touche): string | null
  export function libelleTouches(touches: string): string
  export type TableRaccourcis = Map<string, ActionClavier>
  export function touchesEffectives(perso: Record<string, string[]>): Record<string, string[]>
  export function tableRaccourcis(perso: Record<string, string[]>): TableRaccourcis
  export function conflitDe(perso: Record<string, string[]>, id: string, touches: string): Commande | null
  export function actionDe(touche: Touche, cible: Cible, table?: TableRaccourcis): ActionClavier | null
  ```
  Nouvelle action : `{ type: 'reglages.ouvrir' }`, prise à l'éditeur ; `fichier.enregistrer` est maintenant pris à l'éditeur (toujours laissé au terminal).

- [ ] **Step 1 : tests.** Les tests actuels de `raccourcis.test.ts` passent sans changement (table d'origine par défaut). Nouveaux : `touchesDe` (ordre `cmd`, `ctrl`, `alt`, `shift`, puis la touche, d'après `code`) : `⇧⌘D` → `'cmd-shift-d'`, `⌃Tab` → `'ctrl-tab'`, `⌥⌘]` → `'cmd-alt-]'`, `⇧F2` → `'shift-f2'`, `⌥Z` → `'alt-z'`, `⌘,` → `'cmd-,'`, `⌘` seul (`MetaLeft`) → `null`. `libelleTouches('cmd-shift-d')` → `'⇧⌘D'`, `'ctrl-tab'` → `'⌃Tab'`, `'cmd-alt-left'` → `'⌥⌘←'`. `COMMANDES` : ids et libellés exacts de la maquette pour `onglet.nouveau` « Nouvel onglet », `onglet.fermer` « Fermer », `panneau.diviserDroite` « Diviser à droite », `panneau.diviserBas` « Diviser en bas », `fichier.rechercher` « Rechercher un fichier », `explorateur.basculer` « Afficher l'explorateur », `onglet.renommer` « Renommer l'onglet », `fichier.enregistrer` « Enregistrer » ; aucun id en double ; `reglages.ouvrir` « Ouvrir les réglages » sur `cmd-,`. Avec `perso = { 'panneau.diviserBas': ['cmd-alt-d'] }` : `⌥⌘D` → divise en bas, `⇧⌘D` → `null`. `conflitDe({}, 'panneau.diviserBas', 'cmd-d')?.libelle` → `'Diviser à droite'` ; `conflitDe({}, 'panneau.diviserBas', 'cmd-shift-d')` → `null` (sa propre touche). `⌘,` dans l'éditeur → `{ type: 'reglages.ouvrir' }` ; `⌘S` dans l'éditeur → `fichier.enregistrer`, dans le terminal → `null`.
- [ ] **Step 2 :** `npx vitest run tests/raccourcis.test.ts` → FAIL.
- [ ] **Step 3 : implémenter.** `COMMANDES` reprend exactement la table actuelle (une commande par action et par sens : `onglet.suivant` `['ctrl-tab','cmd-shift-]']`, `onglet.precedent`, `onglet.1`…`onglet.9`, `space.1`…`space.9`, `space.suivant`, `space.precedent`, `agent.suivant`, `agent.precedent`, `space.nouveau`, `panneau.fermer`, `panneau.agrandir`, `panneau.aller.gauche|droite|haut|bas`, `panneau.echanger.*`, `space.renommer`, `colonne.basculer`, `zoom.plus`, `zoom.moins`, `zoom.normal`, `editeur.retourLigne`…). Restent hors de la table modifiable : les touches de l'explorateur, `cmd-f` (`fichier.chercher`) et les réservées `cmd-shift-p`, `cmd-shift-f` (`rien`). Une touche personnelle remplace toutes celles d'origine de sa commande. `PRIS_A_L_EDITEUR` et les exceptions par cible ne changent pas, sauf l'ajout de `reglages.ouvrir` et `fichier.enregistrer`.
- [ ] **Step 4 :** dans `clavier.ts`, garder une `TableRaccourcis` refaite à chaque `berger:reglages` et la passer à `actionDe` ; `reglages.ouvrir` appelle `ouvrirReglages()` (Tâche 6 ; d'ici là, rien). Retirer l'`addCommand(⌘S)` de Monaco dans `editeur.ts` (le `⌘S` passe par la table).
- [ ] **Step 5 :** `npm test` → PASS ; `npm run typecheck` → sans erreur ; `BERGER_SCENARIO=raccourcis npm run dev` joue comme avant (journal identique).
- [ ] **Step 6 : commit** `feat(phase7): raccourcis en table de commandes, touches personnelles`.

### Task 5 : appliquer thèmes et réglages à chaud

**Files :**
- Create : `src/renderer/src/apparence.ts`
- Modify : `src/renderer/assets/main.css`, `src/renderer/src/coloration.ts`, `src/renderer/src/editeur.ts`, `src/renderer/src/terminal.ts`, `src/renderer/src/main.ts`, `src/renderer/src/barre-etat.ts`, et chaque fichier de la fenêtre qui écrit une couleur en dur (`grep -n "#[0-9a-fA-F]\{6\}" src/renderer/src/*.ts src/renderer/assets/main.css`)

**Interfaces :**
- Consumes : `EtatReglages` et IPC de la Tâche 3 ; `couleursFenetre`, `couleursTerminal`, `themeEditeur`, `THEMES_EDITEUR_VSCODE` (Tâche 2).
- Produces :
  ```ts
  // apparence.ts
  export function initApparence(): Promise<void> // lit berger:reglages, applique, écoute les poussées
  export function reglagesActuels(): EtatReglages
  export function surReglages(f: (e: EtatReglages) => void): void
  // coloration.ts : remplace definirTheme(couleurSelection)
  export function appliquerThemeEditeur(theme: ThemeVsCode & { type: 'dark' | 'light' }, couleurSelection: string | null): void
  // terminal.ts
  export function appliquerTerminal(couleurs: ReturnType<typeof couleursTerminal>, police: string, taille: number): void
  ```

- [ ] **Step 1 : fenêtre.** `apparence.ts` pose chaque `couleursFenetre` en variable CSS sur `:root` (`--fond`, `--panneau`, `--bord`, `--texte`, `--vif`, `--gris`, `--gris-clair`, `--actif`, `--survol`, `--popover`, `--clavier`, `--vert`, `--rouge`, `--jaune`), et `--police-interface`, `--taille-interface` ; `body` les utilise. Les couleurs en dur de `main.css` et des fichiers `.ts` passent par ces variables (une icône Lucide reçoit `currentColor` et la couleur vient du CSS : un attribut SVG `stroke` ne lit pas `var()`), sauf couleurs git de l'explorateur, pastilles des workspaces et couleurs d'état des agents. `backgroundColor` de la `BrowserWindow` : le `fond` du thème lu au démarrage (Tâche 3, `actuel()`).
- [ ] **Step 2 : terminal.** `appliquerTerminal` change `options.theme`, `fontFamily`, `fontSize` de chaque xterm ouvert puis recalcule la taille (même chemin que le redimensionnement actuel) ; les xterm créés ensuite prennent les réglages courants. Les couleurs du terminal suivent le thème de l'**application**.
- [ ] **Step 3 : éditeur.** `appliquerThemeEditeur` : `registre.setTheme(theme)`, règles Monaco refaites depuis la nouvelle table de couleurs (code actuel de `definirTheme`), `defineTheme('berger-editeur', { base: type === 'light' ? 'vs' : 'vs-dark', … })`, `setTheme`, puis **recolorer** : réenregistrer les fournisseurs de jetons des langages déjà chargés. `editor.selectionBackground` = `couleurSelection ?? theme.colors['editor.selectionBackground']`. Thème de l'éditeur : un id de `THEMES_EDITEUR_VSCODE` → le fichier `./vscode/themes/…` tel quel ; sinon le thème connu (inconnu → antoine-monokai) passé à `themeEditeur`, avec le fichier VS Code de son champ `editeur.vscode` s'il en a un. Options Monaco depuis les réglages : `fontFamily`, `fontSize`, `minimap.enabled`, `tabSize`, `wordWrap` (état `retourLigne`, sinon réglage).
- [ ] **Step 4 : message.** `erreur` non nulle → affichée dans la barre d'état (texte `--rouge`), effacée quand elle redevient `null`.
- [ ] **Step 5 : vérifier.** Écrire à la main `~/Library/Application Support/Berger-dev/reglages.json` = `{ "apparence": { "themeApplication": "paper", "themeEditeur": "vscode-dark-modern" } }` pendant que `npm run dev` tourne avec un fichier `.ts` ouvert : la fenêtre passe en Paper et le code en Dark Modern sans relancer (capture `BERGER_CAPTURE` ou `screencapture -l`). Puis `{ mal` : message, rien ne change ; corriger : message parti. Lire chaque capture.
- [ ] **Step 6 :** `npm test`, `npm run typecheck` → verts. **Commit** `feat(phase7): thèmes, polices et options appliqués à chaud`.

### Task 6 : la fenêtre des réglages

**Files :**
- Create : `src/renderer/src/reglages.ts`
- Modify : `src/renderer/index.html`, `src/renderer/assets/main.css`, `src/renderer/src/clavier.ts`, `src/renderer/src/colonne.ts`, `src/main/menu.ts`, `src/main/scenario.ts`, `CLAUDE.md` (ligne du scénario)

**Interfaces :**
- Consumes : `reglagesActuels`, `surReglages` (Tâche 5) ; `COMMANDES`, `touchesEffectives`, `conflitDe`, `touchesDe`, `libelleTouches`, `TOUCHES_REFUSEES` (Tâche 4) ; `berger:modifier-reglage` (Tâche 3) ; `ouvrirChemins` (`src/renderer/src/etat.ts`) pour ouvrir le fichier.
- Produces : `export function ouvrirReglages(section?: 'apparence' | 'editeur' | 'terminal' | 'raccourcis'): void`, `export function reglagesOuverts(): boolean` ; poussée `berger:ouvrir-reglages` (menu → fenêtre).

- [ ] **Step 1 : la fenêtre**, d'après `reglages.html` (dialogue par-dessus la fenêtre, titre « Réglages », `⌘,` à droite, sections à gauche « Apparence », « Éditeur », « Terminal », « Raccourcis », pied « Ouvrir le fichier des réglages » + chemin réel en gris + « modifiable à la main »). Échap ou clic hors du dialogue ferme ; tant qu'il est ouvert, aucun raccourci de Berger ne part (`clavier.ts` l'ignore comme `dialogueOuvert`).
  - Apparence : « Thème de l'application » (thèmes connus) et « Thème de l'éditeur » (thèmes connus + Dark Modern et Light Modern), chacun en liste, chaque ligne avec son nom et ses pastilles (fond, texte, quatre couleurs du thème), la ligne choisie marquée ; « Police de l'interface » (nom + taille) ; « Couleur de sélection » (champ couleur + « Celle du thème », qui retire la clé) ; « Aperçu (thème de l'éditeur) » : le texte fixe de la maquette coloré par `monaco.editor.colorize(texte, 'typescript', {})`, refait à chaque changement de thème de l'éditeur.
  - Éditeur : police, taille, « Retour à la ligne par défaut » (remet aussi `retourLigne` de l'état à `null`), « Minicarte », « Taille des tabulations ».
  - Terminal : police, taille.
  - Raccourcis : champ « Filtrer les raccourcis » (sur le libellé et les touches), colonnes « Commande » et « Raccourci », chaque touche en `<kbd>` (`libelleTouches`). Clic sur un raccourci → « Appuie sur les touches… » ; touches appuyées affichées ; `↵` garde, `Échap` annule (texte d'aide de la maquette : « Esc annule la modification, ↵ la garde. ») ; conflit → `Déjà pris par « <libellé> ».` et `↵` ne garde pas ; touches de `TOUCHES_REFUSEES` → `Touches réservées à macOS.` ; « Rétablir » sur une ligne modifiée retire sa clé de `raccourcis`.
  - Chaque changement appelle `berger:modifier-reglage` ; un refus affiche son `message` en haut du dialogue. L'affichage suit les poussées `berger:reglages` (une modification à la main du fichier s'y voit).
- [ ] **Step 2 : les entrées.** `⌘,` (table) ; menu « Berger › Réglages… » (après « À propos de Berger », `accelerator: 'CmdOrCtrl+,'`, `registerAccelerator: false`) qui pousse `berger:ouvrir-reglages` ; bouton « Réglages » (icône Lucide `settings`) en bas de la colonne des spaces, comme la maquette, sans « Ajouter une machine ».
- [ ] **Step 3 : scénario `reglages`** (`BERGER_SCENARIO=reglages BERGER_SCENARIO_DOSSIER=<dossier berger-essai…> BERGER_SCENARIO_SORTIE=<préfixe>`, refuse un dossier de données qui n'est pas `Berger-dev`) : ouvre un `.ts` du dossier, ouvre les réglages (capture Apparence), choisit chaque thème de l'application (capture fenêtre entière, réglages fermés) puis chaque thème de l'éditeur (capture), ouvre Raccourcis, change « Diviser en bas » en `⌥⌘D` (capture pendant l'attente des touches), essaie `⌘D` (conflit, capture), vérifie dans le journal que `⌥⌘D` divise et que `reglages.json` contient `"panneau.diviserBas": ["cmd-alt-d"]`, « Rétablir », puis écrit à la main dans `reglages.json` un raccourci et vérifie qu'il s'applique, écrit `{ mal` (capture du message), et remet le fichier d'avant. Ajouter la ligne du scénario à la section « Lancer » de `CLAUDE.md`.
- [ ] **Step 4 : vérification visuelle.** Lancer le scénario, lire chaque capture avec Read. Ouvrir `file:///Users/antoinesouesme/dev/playground/berger/docs/maquettes/reglages.html` avec claude-in-chrome (ToolSearch des outils `mcp__claude-in-chrome__*` d'abord, `tabs_context_mcp`, nouvel onglet) et comparer les sections Apparence et Raccourcis : disposition, libellés, `<kbd>`, ligne en attente. Pour chacun des 7 thèmes de l'application et des 9 de l'éditeur : aucun texte illisible (listes, onglets, explorateur, menus du clic droit, dialogues, barre d'état, suggestions et menu de Monaco). Corriger puis recapturer jusqu'à ce que tout se lise.
- [ ] **Step 5 :** `npm test`, `npm run typecheck`, `npm run lint` → verts. **Commit** `feat(phase7): fenêtre des réglages, ⌘, et menu Berger › Réglages…`.

### Task 7 : reprise au relancement

**Files :**
- Create : `src/shared/cadre-fenetre.ts`, `tests/cadre-fenetre.test.ts`, `src/main/cadre.ts`
- Modify : `src/main/index.ts`

**Interfaces :**
- Produces :
  ```ts
  export type Cadre = { x: number; y: number; largeur: number; hauteur: number; pleinEcran: boolean; agrandie: boolean }
  export type Ecran = { x: number; y: number; largeur: number; hauteur: number }
  export function lireCadre(brut: unknown, ecrans: Ecran[]): Cadre | null
  // src/main/cadre.ts
  export function cadreRetenu(): Cadre | null
  export function suivreCadre(w: BrowserWindow): { vider: () => void }
  ```

- [ ] **Step 1 : tests.** Cadre valide sur l'écran `{ 0, 0, 1728, 1117 }` → rendu tel quel ; dont moins de 100 px × 100 px tombent sur un écran → `null` (écran débranché) ; largeur < 800 ou hauteur < 500 → bornée à 800 × 500 ; valeurs non numériques → `null` ; `pleinEcran: true` gardé.
- [ ] **Step 2 :** `npx vitest run tests/cadre-fenetre.test.ts` → FAIL.
- [ ] **Step 3 : implémenter.** `<userData>/fenetre.json`, écrit 500 ms après `resize`, `move`, `maximize`, `unmaximize`, `enter-full-screen`, `leave-full-screen`, et à la fermeture (`vider`, comme `etat.vider()`) ; le cadre retenu hors plein écran est celui d'avant le plein écran (`getNormalBounds()`). `createWindow` part de `cadreRetenu()` (écrans de `screen.getAllDisplays()`, `workArea`), puis `setFullScreen(true)` ou `maximize()` après `ready-to-show`.
- [ ] **Step 4 :** `npx vitest run tests/cadre-fenetre.test.ts` → PASS.
- [ ] **Step 5 : vérifier tout le retour** avec `npm run dev` dans un space de test (`spbergertest…`) : déplacer et redimensionner la fenêtre, choisir workspace, space, onglet, tirer les deux séparateurs, masquer l'explorateur puis le réafficher, déplier deux dossiers, ouvrir deux fichiers ; quitter (`⌘Q`), relancer : capture et comparaison avec une capture d'avant. Recommencer en plein écran. Noter au bilan tout ce qui ne revient pas et le corriger s'il relève de cette phase (la spec le demande).
- [ ] **Step 6 :** `npm test` → PASS. **Commit** `feat(phase7): taille, place et plein écran de la fenêtre retenus`.

### Task 8 : l'application installée

**Files :**
- Create : `build/icone.svg`, `build/icone-petite.svg`, `scripts/icone.mjs`, `scripts/installer.mjs`, `electron-builder.yml`
- Modify : `build/icon.icns`, `build/icon.png`, `resources/icon.png`, `package.json`, `.gitignore` (`dist`, déjà présent), `docs/COPIES.md`

- [ ] **Step 1 : l'icône.** `build/icone.svg` : le logo `docs/logo-berger.svg` mis au gabarit des icônes macOS (forme sur 824 × 824 centrée dans 1024 × 1024, coins arrondis). `build/icone-petite.svg` : même mouton sans pattes, laine pleine (spec). `scripts/icone.mjs` (`npm run icone`) : `rsvg-convert` vers un `.iconset` (16, 32 depuis la petite ; 64 à 1024 depuis la grande, avec les `@2x`), `iconutil -c icns` → `build/icon.icns`, et `build/icon.png`, `resources/icon.png` en 512. Lire `build/icon.png` avec Read.
- [ ] **Step 2 : `electron-builder.yml`** : `appId: fr.antoine.berger`, `productName: Berger`, `directories.output: dist`, `files: ['out/**', 'package.json']` (plus les `node_modules` de production, ajoutés par electron-builder), `asar: false` (les serveurs de langage et `tsserver` sont lancés par leur chemin de fichier : pas d'archive), `mac: { target: dir, icon: build/icon.icns, identity: null, category: public.app-category.developer-tools, entitlementsInherit: build/entitlements.mac.plist }`, `npmRebuild: false`.
- [ ] **Step 3 : `scripts/installer.mjs`** (`"installer": "node scripts/installer.mjs"`) : `npm run build`, `npx electron-builder --mac --dir`, signature locale `codesign --force --deep -s - dist/mac-arm64/Berger.app` ; si Berger installé tourne (`pgrep -f /Applications/Berger.app/`), lui demander de quitter (`osascript -e 'quit app id "fr.antoine.berger"'` : il pose sa question des fichiers non enregistrés), attendre sa fin jusqu'à 60 s, sinon s'arrêter avec `Berger tourne encore : quitte-le puis relance npm run installer.` ; remplacer `/Applications/Berger.app` (copie `ditto` vers `/Applications/Berger.app.nouveau`, puis échange), `open -a /Applications/Berger.app` s'il tournait avant. Le dossier de données n'est jamais touché. Les terminaux survivent (détachés, jamais tués) : la commande peut tourner depuis un terminal de Berger.
- [ ] **Step 4 : installer.** Copie de sauvegarde de `~/Library/Application Support/berger/` (Global Constraints), puis `npm run installer` → `/Applications/Berger.app` existe ; `mdfind "kMDItemCFBundleIdentifier == 'fr.antoine.berger'"` → `/Applications/Berger.app` (Spotlight le trouve).
- [ ] **Step 5 : lancer comme Antoine.** `open -a Berger` (même environnement qu'un lancement du Dock, sans le `PATH` du terminal ; `BERGER_CAPTURE` ne passe pas par `open`) : capture par `screencapture -l $(osascript -e 'tell app "System Events" to id of window 1 of process "Berger"')` ou `screencapture -x` plein écran. Attendu : fenêtre avec les workspaces et spaces d'Antoine, état « branché » sur herdr-core, icône du mouton dans le Dock (`screencapture` du Dock), un terminal s'ouvre, un fichier `.ts` a sa complétion (serveur de langage lancé hors de l'archive). Ne rien modifier dans les spaces d'Antoine.
- [ ] **Step 6 : mise à jour sans perte.** Changer un réglage dans la version installée (thème de l'éditeur), relancer `npm run installer` : Berger se ferme, est remplacé, se relance avec le même réglage et le même état. `npm run dev` en même temps : deux fenêtres, deux dossiers de données, aucune n'écrit dans le dossier de l'autre.
- [ ] **Step 7 : outils de développement.** Vérifier que la version installée lancée normalement n'a aucun `BERGER_*` actif ni `bergerEssai` (`import.meta.env.DEV` faux) ; `BERGER_CAPTURE=… /Applications/Berger.app/Contents/MacOS/Berger` marche encore.
- [ ] **Step 8 :** `docs/COPIES.md` : icône dessinée d'après le logo de Berger (`docs/logo-berger.svg`), aucun code repris. **Commit** `feat(phase7): Berger.app installé par npm run installer, icône du mouton`.

### Task 9 : bilan et PR

**Files :**
- Create : `docs/notes/bilan-phase7-application.md`
- Modify : `docs/suivi/ROADMAP.md`, `CLAUDE.md` (section « Lancer »)

- [ ] **Step 1 : `CLAUDE.md`** : `npm run installer`, `npm run icone` ; le dossier de données est `~/Library/Application Support/Berger/` (installé) ou `Berger-dev/` (développement) — remplacer les mentions de `berger/` ; la couleur de sélection et le reste se règlent dans la fenêtre des réglages ou dans `reglages.json` (que Berger écrit maintenant) ; thèmes personnels dans `themes/`.
- [ ] **Step 2 : bilan** (format des bilans précédents) : ce qui marche, vu dans l'application lancée (avec les captures) ; décisions prises pendant l'exécution ; ce qui ne revient pas au relancement, s'il en reste ; ce qu'Antoine doit vérifier : lancer Berger depuis Spotlight, changer les deux thèmes, modifier un raccourci dans la fenêtre et dans le fichier, relancer.
- [ ] **Step 3 : ROADMAP** : phase 7 « Faite, à vérifier par Antoine (bilan : `docs/notes/bilan-phase7-application.md`) ».
- [ ] **Step 4 :** `npm test`, `npm run typecheck`, `npm run lint` → verts (sortie lue).
- [ ] **Step 5 : commit** `docs(phase7): bilan, feuille de route et CLAUDE.md`, `git push -u origin phase7-application`, PR vers `develop` « Phase 7 : l'application installée et ses réglages » avec le résumé du bilan.
