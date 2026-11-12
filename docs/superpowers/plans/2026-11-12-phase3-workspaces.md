# Berger phase 3 — workspaces, spaces et agents : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** rendre à Antoine l'organisation de son mod `antoine` : workspaces repris de Herdr une seule fois, barre d'emojis, menu et dialogues, liste des spaces et liste des agents filtrées sur le workspace ouvert, sous-agents en arbre, clic qui ramène au terminal.

**Architecture :** les règles (workspaces, sous-agents des hooks, liste des agents, création et fermeture d'un space dans le document) sont des modules purs dans `src/shared/`, testés dans `tests/`. Le processus principal garde l'état des workspaces (`workspaces.json` dans le dossier de données d'Electron), le reprend de `~/.config/herdr-app/shared.json` au premier lancement, le rapproche des spaces du document à chaque relecture et l'envoie à la fenêtre ; la fenêtre envoie ses demandes (créer, renommer, supprimer, déplacer, ouvrir, space vu). La fenêtre (TypeScript sans framework, comme en phase 2) dessine la barre, les listes, le menu et les dialogues.

**Tech Stack :** Electron 44, electron-vite, TypeScript, vitest, `lucide` (icônes). Aucune dépendance nouvelle.

**Spec :** `docs/superpowers/specs/2026-11-12-phase3-workspaces-design.md` (à lire en entier avant de commencer). Maquettes : `docs/maquettes/workspaces.html` (menu, dialogues, workspace vide), `docs/maquettes/vue-principale.html` (barre, spaces, agents), règles visuelles `docs/maquettes/README.md`. Pas de lien de design externe : les maquettes locales font foi pour l'apparence.

## Global Constraints

- Branche de travail : `phase3-workspaces`, déjà créée depuis `develop` avec ce plan. PR vers `develop` à la fin, jamais vers `main`.
- Textes de l'interface en français, avec les accents. Code et noms en français comme dans les phases 0 et 2.
- `~/.config/herdr-app/` (dont `shared.json`) : lecture seule, une seule fois, au premier lancement. Ne jamais rien y écrire. Ne rien modifier dans `~/dev/playground/herdr-app-mod/`.
- Ne jamais tester sur les spaces d'Antoine. Pendant un scénario (`BERGER_SCENARIO` défini), le processus principal refuse de fermer un space qui n'a pas été créé par Berger pendant ce lancement et dont l'id ne commence pas par `spbergertest` (Tâche 4). Avant la première écriture réelle du document, en garder une copie (`hc` → `doc.get herdr-app` dans un fichier du scratchpad).
- Ne jamais perdre un space : un space qui n'est dans aucun workspace reste visible dans chaque workspace (liste des spaces, liste des agents, `⌘]`/`⌘[`, pastille).
- Fermer des spaces seulement après « Supprimer » dans le dialogue de suppression.
- Chaque écriture de `herdr-app` passe par `ecrireDoc` (`src/main/ecriture.ts`) : dernière version lue, `version` à `doc.set`, relecture sur `conflict`. Garder tel quel ce que Berger ne comprend pas.
- Workspace par défaut (fichier ou clé absents) : un seul workspace, nom `Pro`, emoji `💼`, tous les spaces (comme `initialState` du mod).
- Couleurs du thème `antoine-monokai` : fond `#1e1f1c`, panneau `#272822`, bord `#34352f`, texte `#d0d0c8`, texte vif `#f2f2ea`, gris `#75715e`, gris clair `#a59f85`, survol / choisi `#414339`. États d'agent : au travail `#e6db74` (jaune), t'attend `#f92672` (rose), fini `#a6e22e` (vert). Pas d'orange.
- Ordre d'urgence (pastille d'un workspace, tri « par urgence ») : t'attend > fini > au travail. (Différent de `plusPressant` de `libelles.ts`, qui sert aux onglets : ne pas le changer.)
- Barre des workspaces (maquette) : 76 px de large, boutons 38 × 38 px, rayon 10 px, emoji 18 px, 10 px entre eux ; ouvert : fond `#414339` et `box-shadow: inset 0 0 0 1.5px #a6e22e` ; les autres `opacity: .6` ; « + » en bas, fond `#414339`, icône verte.
- Menu et dialogues : ceux de `workspaces.html` (menu 220 px, entrées 30 px ; dialogue 420 px, rayon 12 px, voile `#0e0f0dad`, champs 34 px fond `#272822`, champ actif bordé `#66d9ef`, « Esc pour annuler », « Annuler », « Valider » vert ou « Supprimer » rose).
- Code repris : une ligne dans `docs/COPIES.md` (règles de `workspaces.js` du mod `antoine`, `subs.js` du mod `antoine-agents`, leurs tests).
- Vérifier sans cliquer : `BERGER_CAPTURE`, `BERGER_SCENARIO` (voir `src/main/scenario.ts`, `CLAUDE.md`). Une chose « marche » seulement après l'avoir vue dans l'application lancée.
- Vérification visuelle : application Electron locale, aucun compte ni identifiant de connexion (rien à mettre dans `.env.local`). Les captures de Berger (lues avec l'outil Read) sont comparées aux maquettes ouvertes dans Chrome avec claude-in-chrome (`file:///Users/antoinesouesme/dev/playground/berger/docs/maquettes/workspaces.html` et `vue-principale.html`) ; si l'extension n'est pas branchée, Chrome lancé en arrière-plan comme en phase 2.

## Review Focus

- **Rapprochement avec une liste de spaces vide ou pas encore lue.** Au démarrage, ou si `doc.get` échoue, Berger n'a pas encore de spaces : rapprocher à ce moment viderait tous les workspaces pour de bon. Attendu : on ne rapproche qu'avec un document lu qui a un tableau `spaces`. Test `spacesDuDoc` (Tâche 4).
- **Space créé ailleurs pendant que Berger tourne (ou pendant qu'il était fermé).** Attendu : il rejoint le workspace ouvert, à la fin, sans changer le space affiché. Test `rapprocher` (Tâche 1).
- **Supprimer un workspace pendant qu'un space y est créé ailleurs.** Attendu : ne sont fermés que les spaces que le dialogue a annoncés (la liste lue au moment de « Supprimer »), un space arrivé après rejoint un autre workspace. Test `supprimer` rend la liste figée (Tâche 1) ; le main ferme exactement cette liste (Tâche 4).
- **Fermeture d'un space qui échoue à moitié.** Attendu : le space qui reste dans le document n'est plus dans aucun workspace et rejoint le workspace ouvert au rapprochement suivant : rien de perdu. Test `rapprocher` sur un space non rangé (Tâche 1).
- **Sous-agent `hc run` dont le parent n'est pas dans le workspace ouvert, ou sous-agent sans panneau.** Attendu : un sous-agent rangé sous un parent visible n'a pas de ligne à lui ; un sous-agent dont le parent n'est pas listé garde sa propre ligne ; un clic sur un sous-agent sans panneau mène au terminal du parent. Tests `listeAgents` (Tâche 2).

---

## Le découpage des fichiers

Nouveaux modules purs (`src/shared/`) :

| Fichier | Rôle |
|---|---|
| `workspaces.ts` | état des workspaces : reprise depuis Herdr, lecture du fichier, rapprochement, ouvrir, créer, renommer, emoji, supprimer, déplacer (workspace et space), space vu, spaces visibles, état d'un workspace |
| `sous-agents.ts` | sous-agents de Claude Code posés par ses hooks (`antoine.sub.<id>`), repris de `subs.js` |
| `agents.ts` | la liste des agents : filtre, tri, arbre des sous-agents, agent voisin, durée affichée |

Modifiés : `src/shared/spaces.ts` (terminal : parent, depuis, titre, sous-agents des hooks), `src/shared/libelles.ts` (`titreAgent`), `src/shared/document.ts` (`space.nouveau`, `space.fermer`, préfixe `sp`), `src/shared/onglets.ts` (retrait de `agents`/`agentVoisin`, passés dans `agents.ts`), `src/shared/raccourcis.ts` (`⌘N`), `src/shared/etat-fenetre.ts` (`triAgents`).

Processus principal : `src/main/workspaces.ts` (nouveau : fichier, reprise, rapprochement, IPC), `src/main/actions.ts` (créer et fermer un space), `src/main/git.ts` (commits à pousser), `src/main/vue.ts`, `src/main/index.ts`, `src/main/scenario.ts`.

Fenêtre (`src/renderer/src/`) : `workspaces.ts` (nouveau : barre, menu, dialogues, glisser), `dialogue.ts` (nouveau : le dialogue de la maquette), `glisser.ts` (nouveau : glisser à la souris, sans glisser-déposer HTML), `colonne.ts` (spaces et agents filtrés), `etat.ts`, `clavier.ts`, `main.ts`, `index.html`, `assets/main.css`.

---

### Task 1 : les règles des workspaces

**Files :**
- Create : `src/shared/workspaces.ts`
- Test : `tests/workspaces.test.ts` (reprendre les cas de `~/dev/playground/herdr-app-mod/tests/workspaces.test.mjs` qui servent, traduits)
- Modify : `docs/COPIES.md`

**Interfaces :**
- Produces :
  ```ts
  export type Workspace = { id: string; nom: string; emoji: string; spaces: string[]; dernierSpace: string | null }
  export type EtatWorkspaces = { liste: Workspace[]; ouvert: string }
  export type EtatAgent = 'travail' | 'attente' | 'fini' | null   // importé de libelles.ts
  export function etatInitial(spaces: string[]): EtatWorkspaces                     // « Pro » 💼, tous les spaces
  export function reprendreDeHerdr(brut: unknown, spaces: string[]): EtatWorkspaces // brut = valeur de la clé `antoine.workspaces`
  export function lireEtatWorkspaces(brut: unknown): EtatWorkspaces | null          // contenu de workspaces.json ; null si illisible
  export function rapprocher(e: EtatWorkspaces, spaces: string[]): EtatWorkspaces
  export function ouvrir(e: EtatWorkspaces, id: string): { etat: EtatWorkspaces; afficher: string | null }
  export function creer(e: EtatWorkspaces, nom: string, emoji: string, id?: string): EtatWorkspaces  // devient l'ouvert
  export function renommer(e: EtatWorkspaces, id: string, nom: string): EtatWorkspaces
  export function changerEmoji(e: EtatWorkspaces, id: string, emoji: string): EtatWorkspaces
  export function supprimer(e: EtatWorkspaces, id: string): { etat: EtatWorkspaces; fermer: string[]; afficher: string | null }
  export function deplacer(e: EtatWorkspaces, id: string, index: number): EtatWorkspaces
  export function deplacerSpace(e: EtatWorkspaces, space: string, index: number): EtatWorkspaces // dans son workspace
  export function spaceVu(e: EtatWorkspaces, space: string): EtatWorkspaces          // dernierSpace du workspace ouvert
  export function spacesVisibles(e: EtatWorkspaces, spaces: string[]): string[]      // ordre du workspace, puis les orphelins dans l'ordre de `spaces`
  export function workspaceDe(e: EtatWorkspaces, space: string): string | null
  export function etatDuWorkspace(e: EtatWorkspaces, id: string, etatParSpace: Record<string, EtatAgent>): EtatAgent
  export function premierEmoji(texte: string): string                               // premier graphème (Intl.Segmenter), '' si vide
  ```

Règles (reprises de `workspaces.js`, sans `seen`, `hold` ni suivi du space affiché par Herdr, que Berger n'a pas) :
- `reprendreDeHerdr` lit `{ list: [{ id, name, emoji, spaces, lastSpace }], active }` ; ignore les entrées mal formées (id ou nom non chaîne, spaces non tableau) ; si rien ne reste, `etatInitial(spaces)`. `active` inconnu → le premier. Le résultat est passé par `rapprocher`.
- `lireEtatWorkspaces` valide la même forme que `EtatWorkspaces` (au moins un workspace) ; sinon `null`.
- `rapprocher` : retire de chaque workspace les spaces absents de `spaces` ; ajoute à la fin du workspace ouvert chaque space qui n'est dans aucun workspace ; `ouvert` inconnu → le premier ; `dernierSpace` absent de son workspace → `null`. Rend le même objet si rien ne change (pour ne pas réécrire le fichier).
- `ouvrir` : `afficher` = `dernierSpace` s'il est dans le workspace, sinon son premier space, sinon `null`.
- `creer` : id `ws-` + base 36 de l'heure, unique ; nom coupé (`trim`) ; workspace vide.
- `supprimer` : refuse le dernier (rend l'état inchangé, `fermer: []`) ; `fermer` = copie des spaces du workspace retiré ; si c'était l'ouvert, le voisin de droite devient l'ouvert (sinon celui de gauche) et `afficher` = son entrée.
- `renommer` avec un nom vide après `trim` : inchangé.
- `etatDuWorkspace` : le plus urgent (t'attend > fini > au travail) parmi ses spaces et les spaces orphelins (ceux de `etatParSpace` qui ne sont dans aucun workspace).

- [ ] **Step 1 : écrire les tests** dans `tests/workspaces.test.ts`, au moins :
  ```ts
  test('reprise : workspaces de Herdr, ordre, ouvert et dernier space gardés', () => {
    const e = reprendreDeHerdr({ list: [
      { id: 'pro', name: 'Pro', emoji: '🖥️', spaces: ['a', 'x'], lastSpace: 'a' },
      { id: 'perso', name: 'Perso', emoji: '🐑', spaces: ['b'], lastSpace: null } ], active: 'perso' }, ['a', 'b', 'c'])
    expect(e.ouvert).toBe('perso')
    expect(e.liste.map((w) => w.spaces)).toEqual([['a'], ['b', 'c']]) // x fermé, c rejoint l'ouvert
    expect(e.liste[0]).toMatchObject({ nom: 'Pro', emoji: '🖥️', dernierSpace: 'a' })
  })
  test('reprise sans clé : un seul workspace Pro 💼 avec tous les spaces', () => {
    expect(reprendreDeHerdr(undefined, ['a', 'b']).liste).toEqual([expect.objectContaining({ nom: 'Pro', emoji: '💼', spaces: ['a', 'b'] })])
  })
  test('rapprocher : un space nouveau va à la fin du workspace ouvert', ...)        // ['b'] + 'c' → ['b','c']
  test('rapprocher : un space fermé disparaît, le dernier space oublié', ...)
  test('rapprocher : rien de changé rend le même objet', ...)                      // toBe(e)
  test('ouvrir rend le dernier space, sinon le premier, sinon null', ...)
  test('supprimer : liste figée des spaces à fermer, voisin de droite ouvert', ...)
  test('supprimer refuse le dernier workspace', ...)
  test('deplacer et deplacerSpace bornent l'index', ...)                            // index -1 → 0, 99 → fin
  test('spacesVisibles : ceux du workspace dans son ordre, puis les orphelins', () => {
    const e = { liste: [ws('pro', ['a']), ws('perso', ['c', 'b'])], ouvert: 'perso' }
    expect(spacesVisibles(e, ['a', 'b', 'c', 'z'])).toEqual(['c', 'b', 'z'])
  })
  test('etatDuWorkspace : t'attend > fini > au travail, orphelins compris', ...)
  test('premierEmoji garde un emoji composé entier', () => {
    expect(premierEmoji('🧑‍💻 dev')).toBe('🧑‍💻'); expect(premierEmoji('  ')).toBe('')
  })
  test('lireEtatWorkspaces refuse une forme invalide', ...)                          // null, {}, { liste: [] }
  ```
- [ ] **Step 2 :** `npx vitest run tests/workspaces.test.ts` → FAIL (module absent).
- [ ] **Step 3 :** écrire `src/shared/workspaces.ts` (fonctions pures, jamais de mutation de l'entrée).
- [ ] **Step 4 :** `npx vitest run tests/workspaces.test.ts` → PASS.
- [ ] **Step 5 :** ligne dans `docs/COPIES.md` (règles reprises de `~/.config/herdr-app/mods/antoine/workspaces.js` et de ses tests, réécrites en TypeScript, code personnel d'Antoine), puis commit `feat(workspaces): règles pures des workspaces`.

### Task 2 : les agents, leurs sous-agents et leur liste

**Files :**
- Create : `src/shared/sous-agents.ts`, `src/shared/agents.ts`
- Modify : `src/shared/spaces.ts`, `src/shared/libelles.ts`, `src/shared/onglets.ts` (retirer `agents`, `agentVoisin`, `PlaceAgent` reste exporté d'ici), `src/renderer/src/clavier.ts` et `src/renderer/src/colonne.ts` (imports seulement, le dessin vient Tâche 6)
- Test : `tests/sous-agents.test.ts` (repris de `subs.test.mjs` pour `sousAgentsHooks`), `tests/agents.test.ts`, `tests/spaces.test.ts`, `tests/libelles.test.ts`, `tests/onglets.test.ts` (déplacer les tests d'agents dans `agents.test.ts`)
- Modify : `docs/COPIES.md`

**Interfaces :**
- Consumes : `Vue`, `VueTerminal`, `PlaceAgent` (phase 2) ; `EtatAgent`.
- Produces :
  ```ts
  // sous-agents.ts
  export const AGE_MAX = 12 * 3600000
  export type SousAgentHook = { id: string; type: string; depuis: number }  // depuis = `at` de l'étiquette (0 : inconnu)
  export function sousAgentsHooks(etiquettes: Record<string, string> | undefined, maintenant: number | null): SousAgentHook[]
  // spaces.ts : TerminalCore gagne `parent?: string | null`, `status_ms?: number | null`, `status.title?: string`
  // VueTerminal gagne :
  //   parent: string | null; depuis: number | null (status_ms); titre: string; hooks: SousAgentHook[]
  export function construireVue(doc: unknown, terminaux: TerminalCore[], maison?: string, maintenant?: number): Vue
  // libelles.ts
  export function titreAgent(t: TerminalCore): string
  // agents.ts
  export type TriAgents = 'spaces' | 'urgence'
  export type LigneAgent = {
    cle: string                 // adresse, ou `${parent}#${id}` pour un sous-agent de hook
    adresse: string | null      // null pour un sous-agent de hook
    place: PlaceAgent | null    // où cliquer : la sienne, sinon celle du parent ; null si aucune
    space: string; nomSpace: string
    titre: string; programme: { nom: string; icone: Icone }
    agent: EtatAgent; depuis: number | null
    traits: ('├' | '└' | '│' | '')[]   // vide pour un agent de premier niveau
    hook: boolean
  }
  export function listeAgents(vue: Vue, visibles: string[], tri: TriAgents): LigneAgent[]
  export function agentVoisin(lignes: LigneAgent[], actuel: string | null, pas: 1 | -1): PlaceAgent | null
  export function duree(ms: number): string          // '<1m', '12m', '3h', '2j'
  export const URGENCE: Record<'attente' | 'fini' | 'travail', number>  // 3, 2, 1
  ```

Règles :
- `sousAgentsHooks` : reprise de `hookSubs` (étiquettes `antoine.sub.<id>` = JSON `{type, at}`, du plus ancien au plus récent, valeurs illisibles ignorées, plus vieux que `AGE_MAX` ignorés quand `maintenant` est donné, `at: 0` gardé).
- `construireVue` : `hooks` seulement pour un terminal vivant dont le programme est Claude Code (`status.app` qui commence par `claude`, sinon `programme(t).nom === 'Claude Code'`), sinon `[]`. `maintenant` par défaut `Date.now()`.
- `titreAgent` : `status.title` s'il n'est pas vide ; sinon `title` du terminal sans ses caractères de tête qui ne sont ni lettre ni chiffre (`✳ Tests` → `Tests`) ; vide si ce titre ressemble à un chemin (`~` ou `/` en tête), contient `@`, ou vaut le nom du programme.
- `listeAgents` :
  - agents = terminaux rangés (onglet → panneau, comme `agents()` de la phase 2) avec `agent` non nul, dans les spaces de `visibles` ;
  - un agent dont le `parent` est lui-même un agent listé n'a pas de ligne de premier niveau : il est rangé sous son parent ;
  - sous chaque agent : ses enfants vivants (`parent === adresse`, dans l'ordre des adresses du core), en profondeur, avec leurs traits (`├`/`└`, `│`/`''` pour les niveaux du dessus), puis ses sous-agents de hook à plat ; seule la toute dernière ligne de premier niveau sous lui ferme l'arbre (règle de `joinSubs`). Un enfant sans panneau a `place` = celle du parent ; un sous-agent de hook : `place` du parent, `agent: 'travail'`, `depuis` = son `at` (ou `null` si 0), `titre` = son type ou « sous-agent » ;
  - tri `spaces` : par place du space dans `visibles`, puis ordre des onglets et des panneaux ; tri `urgence` : par urgence (celle de l'agent ou de son sous-agent le plus urgent), puis `depuis` le plus récent d'abord ; les sous-agents suivent toujours leur parent.
- `agentVoisin` : parcourt les lignes avec une `adresse` et une `place` à elles (saute les sous-agents de hook), en boucle ; actuel inconnu → premier (`pas` 1) ou dernier.

- [ ] **Step 1 : écrire les tests**, au moins :
  ```ts
  test('un sous-agent hc run se range sous son parent, avec ses traits', () => {
    // vue : t1 (Claude, travail) dans sp1 ; t2 (parent t1, attente) dans sp1, t3 (parent t2) sans panneau
    const l = listeAgents(vue, ['sp1'], 'spaces')
    expect(l.map((x) => [x.cle, x.traits])).toEqual([['t1', []], ['t2', ['└']], ['t3', ['', '└']]])
    expect(l[2].place).toEqual(l[0].place)
  })
  test('sous-agents de hook après les enfants, le dernier ferme l’arbre', ...)         // traits ['├'], ['│','└'], ['├'], ['└']
  test('un enfant dont le parent n’est pas visible garde sa propre ligne', ...)
  test('filtre sur les spaces visibles, dans leur ordre', ...)
  test('tri urgence : t’attend, fini, au travail ; plus récent d’abord', ...)
  test('agentVoisin saute les sous-agents de hook et boucle', ...)
  test('duree', () => { expect(duree(30_000)).toBe('<1m'); expect(duree(12 * 60_000)).toBe('12m'); expect(duree(3 * 3_600_000)).toBe('3h'); expect(duree(50 * 3_600_000)).toBe('2j') })
  test('titreAgent : titre du statut, sinon titre nettoyé, jamais un chemin ni user@machine', ...)
  test('construireVue : hooks seulement sous Claude Code, parent et depuis repris', ...)
  test('sousAgentsHooks : …', ...)   // les quatre cas de subs.test.mjs utiles (lecture, âge max, isClaude n'est plus exporté)
  ```
- [ ] **Step 2 :** `npx vitest run tests/agents.test.ts tests/sous-agents.test.ts tests/spaces.test.ts tests/libelles.test.ts` → FAIL.
- [ ] **Step 3 :** écrire `sous-agents.ts`, `agents.ts`, compléter `spaces.ts` et `libelles.ts` ; dans `clavier.ts`, `agent.voisin` appelle `agentVoisin(lignesAgents(), terminalActuel(), a.pas)` avec `lignesAgents()` exportée par `colonne.ts` (la liste dessinée).
- [ ] **Step 4 :** `npm test` et `npm run typecheck` → tout passe.
- [ ] **Step 5 :** ligne dans `docs/COPIES.md` (`subs.js` du mod `antoine-agents` et ses tests ; tri et arbre inspirés de son `main.js`), commit `feat(agents): liste des agents, sous-agents en arbre`.

### Task 3 : créer et fermer un space dans le document

**Files :**
- Modify : `src/shared/document.ts`
- Test : `tests/document.test.ts`

**Interfaces :**
- Produces :
  ```ts
  // idHerdr accepte aussi le préfixe 'sp'
  export function idHerdr(prefixe: 'sp' | 'tb' | 'p' | 's', hasard?: () => string): string
  // Action gagne :
  | { type: 'space.nouveau'; space: string; onglet: string; panneau: string; adresse: string }
  | { type: 'space.fermer'; space: string }
  ```
- `space.nouveau` ajoute à la fin de `spaces` : `{ id: space, name: '', tabs: [{ id: onglet, name: '', root: { type: 'row', id: onglet, children: [{ type: 'block', id: panneau, content: { terminal: adresse }, size: { weight: 1 } }] } }] }`. Si le terminal est déjà rangé quelque part (Herdr l'a adopté avant), ou si le space existe déjà : document inchangé (même objet).
- `space.fermer` retire le space ; space inconnu : même objet.

- [ ] **Step 1 : tests** : `space.nouveau` ajoute le space à la fin ; inchangé si `adresse` déjà rangée ; `space.fermer` retire le space et `terminauxRetires(avant, apres)` rend tous ses terminaux ; champs inconnus des autres spaces gardés (`toBe` sur les autres objets).
- [ ] **Step 2 :** `npx vitest run tests/document.test.ts` → FAIL.
- [ ] **Step 3 :** implémenter dans `appliquer`.
- [ ] **Step 4 :** `npx vitest run tests/document.test.ts` → PASS.
- [ ] **Step 5 :** commit `feat(document): créer et fermer un space`.

### Task 4 : le processus principal (workspaces, spaces, git)

**Files :**
- Create : `src/main/workspaces.ts`
- Modify : `src/main/actions.ts`, `src/main/vue.ts`, `src/main/git.ts`, `src/main/index.ts`, `src/shared/spaces.ts` (`VueSpace.aPousser`)
- Test : `tests/workspaces.test.ts` (la règle `spacesDuDoc`)

**Interfaces :**
- Consumes : Tâches 1 et 3.
- Produces :
  ```ts
  // src/shared/workspaces.ts (ajout)
  export function spacesDuDoc(doc: unknown): string[] | null   // null : pas de tableau `spaces` (document pas lu)
  // src/shared/spaces.ts : VueSpace gagne `aPousser?: number`
  // src/main/git.ts
  export function etatGit(dossier: string): Promise<{ branche?: string; aPousser: number }>
  // src/main/workspaces.ts
  export function brancherWorkspaces(o: {
    envoyer: (e: EtatWorkspaces) => void
    fermerSpaces: (ids: string[]) => Promise<void>
  }): { rapprocher: (doc: unknown) => void; actuel: () => EtatWorkspaces | null; vider: () => void }
  // IPC (fenêtre → main) : ipcMain.handle('berger:workspace', (_e, d: DemandeWorkspace) => ReponseWorkspace)
  export type DemandeWorkspace =
    | { type: 'ouvrir'; id: string }
    | { type: 'creer'; nom: string; emoji: string }
    | { type: 'renommer'; id: string; nom: string }
    | { type: 'emoji'; id: string; emoji: string }
    | { type: 'supprimer'; id: string; spaces: string[] }   // la liste annoncée par le dialogue
    | { type: 'deplacer'; id: string; index: number }
    | { type: 'space.deplacer'; space: string; index: number }
    | { type: 'space.vu'; space: string }
  export type ReponseWorkspace = { etat: EtatWorkspaces; afficher: string | null }
  // Envoi main → fenêtre : 'berger:workspaces' (EtatWorkspaces) ; 'berger:etat' rend aussi `workspaces`.
  // DemandeStructure (actions.ts) gagne : { type: 'space.nouveau' } → ReponseStructure avec { space, onglet, panneau }
  ```

Comportement :
- Fichier : `join(app.getPath('userData'), 'workspaces.json')`, écrit au plus toutes les 300 ms, vidé à `before-quit` (comme `src/main/etat.ts`). Fichier présent mais illisible (`lireEtatWorkspaces` → null) : le renommer en `workspaces.json.illisible`, puis faire comme au premier lancement.
- Premier lancement (pas de fichier) : lire **une fois** `~/.config/herdr-app/shared.json` (`readFileSync`, jamais d'écriture), clé `antoine.workspaces` ; fichier ou clé absents → `undefined`. L'état n'est construit (`reprendreDeHerdr`) qu'au premier document lu, puis écrit tout de suite dans `workspaces.json`.
- `rapprocher(doc)` est appelé par `suivreLaVue` après chaque relecture du document ; il ne fait rien si `spacesDuDoc(doc)` est `null`. Il envoie l'état à la fenêtre et l'écrit seulement s'il a changé.
- `supprimer` : `supprimer()` pur sur l'état ; fermer `d.spaces ∩ fermer` (jamais un space que le dialogue n'a pas annoncé) ; écrire l'état ; répondre ; puis `fermerSpaces`.
- `fermerSpaces` (dans `actions.ts`) : pour chaque space, même méthode que `fermer` de la phase 2 : lire le document, `terminauxRetires(doc, appliquer(doc, { type: 'space.fermer', space }))`, `terminal.kill` de chacun, puis `ecrireDoc`. Garde des scénarios : si `process.env.BERGER_SCENARIO` est défini, refuser (journal `[berger] fermeture refusée`) tout space qui n'est ni dans l'ensemble des spaces créés par ce lancement ni préfixé `spbergertest`.
- `space.nouveau` (dans `actions.ts`) : `space = idHerdr('sp')`, `onglet = idHerdr('tb')`, `lancer(space, onglet, homedir())`, puis `ecrireEtPlacer({ type: 'space.nouveau', space, onglet, panneau: idHerdr('p'), adresse }, adresse)` ; ajouter l'id à l'ensemble des spaces créés ; rendre `{ ok: true, space: place.space, onglet, panneau }` (la place réelle relue). Le space rejoint le workspace ouvert par le rapprochement.
- `etatGit` : `git -C <dossier> branch --show-current` puis `git -C <dossier> rev-list --count @{u}..HEAD` (échec ou pas d'amont → 0), délai 2 s chacun ; remplace `brancheDe` dans `vue.ts` (même cache de 5 s), qui remplit `branche` et `aPousser`.

- [ ] **Step 1 : test** de `spacesDuDoc` : `null` pour `null`, `{}`, `{ spaces: 'x' }` ; `['a']` pour `{ spaces: [{ id: 'a' }] }` ; ignore les entrées sans id.
- [ ] **Step 2 :** `npx vitest run tests/workspaces.test.ts` → FAIL, puis écrire `spacesDuDoc`, → PASS.
- [ ] **Step 3 :** écrire `src/main/workspaces.ts`, `etatGit`, `space.nouveau` et `fermerSpaces` dans `actions.ts`, brancher dans `index.ts` (`rapprocher` passé à `suivreLaVue`, `vider` à `before-quit` et à `berger:reponse-quitter`).
- [ ] **Step 4 :** `npm test`, `npm run typecheck` → passent. Copie du document : `hc` (voir `docs/notes/trames-herdr-core.md`) → `doc.get herdr-app` enregistré dans le scratchpad. Lancer `BERGER_TRACE=1 npm run dev` : le journal montre la reprise ; `cat ~/Library/Application\ Support/berger/workspaces.json` montre les workspaces de Herdr (mêmes noms, emojis, ordre, ouvert que `antoine.workspaces` de `shared.json`) ; `shared.json` inchangé (`shasum` avant / après).
- [ ] **Step 5 :** commit `feat(workspaces): état gardé par Berger, reprise depuis Herdr, créer et fermer un space`.

### Task 5 : la barre des workspaces, son menu et ses dialogues

**Files :**
- Create : `src/renderer/src/workspaces.ts`, `src/renderer/src/dialogue.ts`, `src/renderer/src/glisser.ts`
- Modify : `src/renderer/src/etat.ts`, `src/renderer/src/main.ts`, `src/renderer/src/icones.ts`, `src/renderer/index.html`, `src/renderer/assets/main.css`

**Interfaces :**
- Consumes : `berger:workspace`, `berger:workspaces` (Tâche 4) ; `ouvrirMenu` (`menus.ts`) ; `etatDuWorkspace`, `spacesVisibles`, `premierEmoji` (Tâche 1).
- Produces :
  ```ts
  // etat.ts : EtatUi gagne `workspaces: EtatWorkspaces | null`
  export function spacesVisiblesUi(): VueSpace[]            // vue.spaces filtrés et ordonnés par spacesVisibles
  export function workspaceOuvert(): Workspace | null
  export function ouvrirWorkspace(id: string): Promise<void>  // demande 'ouvrir', puis afficherSpace(afficher) ou space = null
  // spaceAffiche() : le space retenu s'il est visible, sinon le premier visible, sinon null (workspace vide)
  // afficherSpace(id) : si le space n'est pas visible, ouvre d'abord le workspace qui le contient
  // dialogue.ts
  export function ouvrirDialogue(o: {
    titre: string; texte?: string
    champs?: { emoji: string; nom: string; focus: 'emoji' | 'nom' }
    bouton: { libelle: 'Valider' | 'Supprimer'; danger?: boolean }
  }): Promise<{ emoji: string; nom: string } | null>   // null : Annuler ou Échap
  // glisser.ts
  export function rendreGlissable(el: HTMLElement, o: { axe: 'x' | 'y'; liste: () => HTMLElement[]; deposer: (index: number) => void }): void
  ```

Comportement :
- Barre (`<nav id="workspaces">`) : en haut les deux boutons de colonne de la maquette, inactifs dans cette phase (explorateur, recherche : phases 4 et 5 ; aucun clic branché), un trait, un bouton par workspace (son emoji, `title` = son nom), l'ouvert mis en avant (Global Constraints) ; en bas « + ». Pastille d'état : point de 8 px dans le coin haut droit du bouton, couleur de `etatDuWorkspace` (rien si `null`).
- Clic sur un workspace : `ouvrirWorkspace(id)`.
- Clic droit : `ouvrirMenu` avec « Renommer » (icône `pencil`), « Changer l'emoji » (`smile`), séparateur, « Supprimer » (`trash-2`, en rose `#f92672`). Pas de raccourci affiché à côté de « Renommer » (F2 renomme l'onglet de terminal ; la maquette montre « F2 », écart noté au bilan). Le dernier workspace : « Supprimer » grisé et sans effet.
- Dialogues (`dialogue.ts`, posé sur `document.body`, voile plein écran) : « Nouveau workspace » (emoji `📁`, nom vide, focus sur le nom), « Renommer le workspace » (focus sur le nom), « Changer l'emoji » (focus sur l'emoji, texte sélectionné). Emoji retenu = `premierEmoji(champ)`, `📁` si vide ; « Valider » sans effet si le nom est vide après `trim`. `Échap` ferme, `↵` valide ; le clavier ne part ni au terminal ni aux raccourcis de Berger tant que le dialogue est ouvert (arrêter la propagation en capture, comme `menus.ts`).
- Suppression : titre `Supprimer « Nom » ?`, texte `Ses n spaces et leurs agents seront fermés.` (n ≥ 2), `Son space et ses agents seront fermés.` (n = 1) ou `Ce workspace ne contient aucun space.` ; bouton « Supprimer » rose. Sur « Supprimer », envoyer `{ type: 'supprimer', id, spaces }` avec la liste lue à l'ouverture du dialogue ; puis afficher `afficher`.
- Glisser (`glisser.ts`) : à la souris (`mousedown` / `mousemove` / `mouseup`), seuil de 4 px avant de bouger, la ligne suit le pointeur sur son axe, l'index de dépôt est le nombre d'éléments dont le centre est avant le pointeur ; un clic sans mouvement reste un clic. Pas de glisser-déposer HTML (les scénarios ne savent pas le jouer). Barre : axe `y`, `deplacer`.
- Space affiché : à chaque changement de `spaceAffiche()?.id`, envoyer `{ type: 'space.vu', space }`.

- [ ] **Step 1 :** écrire les trois modules et le style ; `npm run typecheck` → passe.
- [ ] **Step 2 :** `BERGER_CAPTURE=<scratchpad>/barre.png npm run dev` : la barre montre les workspaces d'Antoine, l'ouvert mis en avant ; lire l'image.
- [ ] **Step 3 :** commit `feat(workspaces): barre des workspaces, menu et dialogues`.

### Task 6 : les listes des spaces et des agents, les raccourcis

**Files :**
- Modify : `src/renderer/src/colonne.ts`, `src/renderer/src/clavier.ts`, `src/renderer/src/main.ts`, `src/renderer/src/etat.ts`, `src/shared/etat-fenetre.ts`, `src/shared/raccourcis.ts`, `src/renderer/index.html`, `src/renderer/assets/main.css`
- Test : `tests/raccourcis.test.ts`, `tests/etat-fenetre.test.ts`

**Interfaces :**
- Consumes : `listeAgents`, `agentVoisin`, `duree` (Tâche 2) ; `spacesVisiblesUi`, `ouvrirWorkspace`, `rendreGlissable` (Tâche 5) ; `space.nouveau` (Tâche 4).
- Produces :
  ```ts
  // raccourcis.ts : ActionClavier gagne { type: 'space.nouveau' } ; ⌘N (mods 'm', code 'KeyN') ; pris aussi à l'éditeur
  // etat-fenetre.ts : EtatFenetre gagne triAgents: TriAgents (défaut 'spaces', valeur inconnue → 'spaces')
  // colonne.ts
  export function lignesAgents(): LigneAgent[]   // la liste dessinée, pour ⌘] / ⌘[
  export function nouveauSpace(): Promise<void>  // demande 'space.nouveau' puis choisirPlace sur la place rendue
  ```

Comportement :
- Liste des spaces : `spacesVisiblesUi()`. Ligne : pastille avec l'initiale (couleurs actuelles de `PASTILLES`), nom, à droite `↑n` en vert (`#a6e22e`, icône `arrow-up` 12 px, `title` = « n commits à pousser ») si `aPousser > 0`, sinon la branche en gris. Le space affiché est mis en avant. `⇧F2` garde le renommage sur place de la phase 2. Glisser une ligne (axe `y`) → `{ type: 'space.deplacer', space, index }`.
- Titre « Spaces » : son « + » (icône `plus`, à droite, comme la maquette) appelle `nouveauSpace()`. Workspace vide : la liste montre le bouton « Nouveau space » (bordure pointillée `#414339`, 34 px) ; la zone de droite montre « <Nom> est vide. Crée un space pour commencer. » (carte de la maquette d) ; l'explorateur montre « Aucun space dans ce workspace » (le lien « Ajouter un dossier » de la maquette est de la phase 4 : ne pas le mettre).
- Liste des agents : `listeAgents(vue, ids visibles, triAgents)`, redessinée aussi toutes les 30 s (durées). Ligne de premier niveau (maquette) : icône du programme (`bot` en `#d98a6a` pour Claude Code et Codex, sinon l'icône de `programme`), nom du space en `#f2f2ea`, `· titre` en gris (omis si vide), durée (`duree(maintenant - depuis)`, omise si `depuis` nul), état : au travail = icône `loader-circle` jaune 13 px, t'attend = point rose 8 px, fini = icône `check` verte 13 px. Sous-agent : retrait de 39 px à gauche, traits de l'arbre (bordure gauche et bas de 1,5 px `#414339`, coin arrondi pour `└`/`├`), titre en gris, durée, état. Ligne choisie (fond `#414339`) : le terminal qui a le clavier dans l'onglet affiché. « Aucun agent » en gris si la liste est vide.
- Titre « Agents » : son bouton (icône `folder` pour « Ordre des spaces », `clock` pour « par urgence », `title` = le tri en cours) bascule `triAgents`, retenu dans `etat-fenetre.json`.
- Clic sur une ligne : `choisirPlace(ligne.place)` (le space, l'onglet, le panneau et le clavier) ; rien si `place` est nul.
- Raccourcis : `space.n` → n-ième de `spacesVisiblesUi()` ; `space.voisin` → voisin dans `spacesVisiblesUi()` ; `agent.voisin` → `agentVoisin(lignesAgents(), …)` ; `space.nouveau` → `nouveauSpace()`.

- [ ] **Step 1 : tests** : `actionDe(⌘N, 'terminal')` et `(…, 'editeur')` → `{ type: 'space.nouveau' }` ; `lireEtatFenetre({ triAgents: 'urgence' }).triAgents === 'urgence'`, `lireEtatFenetre({ triAgents: 'x' }).triAgents === 'spaces'`.
- [ ] **Step 2 :** `npx vitest run tests/raccourcis.test.ts tests/etat-fenetre.test.ts` → FAIL, puis implémenter, → PASS.
- [ ] **Step 3 :** dessin des listes et branchements ; `npm test`, `npm run typecheck` → passent.
- [ ] **Step 4 :** `BERGER_CAPTURE=<scratchpad>/listes.png npm run dev` : spaces et agents du workspace ouvert seulement, `↑n` sur un dépôt en avance ; lire l'image.
- [ ] **Step 5 :** commit `feat(colonne): spaces et agents du workspace ouvert, sous-agents, raccourcis`.

### Task 7 : scénario, vérification dans l'application, bilan

**Files :**
- Modify : `src/main/scenario.ts`, `CLAUDE.md` (ligne « Vérifier sans cliquer »), `docs/suivi/ROADMAP.md`
- Create : `docs/notes/bilan-phase3-workspaces.md`

**Scénario `BERGER_SCENARIO=workspaces`** (étapes espacées de 2,5 s, capture + journal de l'état des workspaces lu dans `workspaces.json` à chaque étape) : clic sur « + » de la barre → dialogue (capture `01-nouveau`) → taper `Test Berger`, `↵` (`02-cree`, workspace vide : « Nouveau space », message de la zone de droite) → `⌘N` (`03-space`, un space neuf dans ce workspace, terminal ouvert) → clic droit sur le workspace (`04-menu`) → « Renommer », taper `Essai`, `↵` (`05-renomme`) → clic droit, « Changer l'emoji », taper `🧪`, `↵` (`06-emoji`) → glisser son bouton en première place (`07-deplace`) → clic sur le workspace d'origine (`08-retour` : ses spaces, le dernier space choisi rouvert) → retour sur `Essai` → clic droit, « Supprimer » (`09-question`, texte « Son space et ses agents seront fermés. ») → « Supprimer » (`10-supprime` : workspace parti, le space créé fermé dans le document, aucun autre space touché). Le scénario retrouve les boutons par leur `aria-label` (`Workspace <nom>`) via `executeJavaScript` pour calculer les coordonnées, puis joue de vrais événements souris.

- [ ] **Step 1 :** écrire le scénario. Avant de le jouer : copie du document `herdr-app` et de `workspaces.json` dans le scratchpad.
- [ ] **Step 2 :** jouer `BERGER_SCENARIO=workspaces BERGER_SCENARIO_SORTIE=<scratchpad>/ws npm run dev` ; lire chaque capture et le journal. Attendu : chaque étape comme décrit ; après `10`, `workspaces.json` égal à la copie sauf le `dernierSpace` éventuel, et les spaces du document égaux à la copie (à part ceux qu'Antoine ou ses agents ont changés entre-temps dans Herdr : le noter).
- [ ] **Step 3 : vérification visuelle avec claude-in-chrome.** Ouvrir `file:///Users/antoinesouesme/dev/playground/berger/docs/maquettes/workspaces.html` et `vue-principale.html` (onglet neuf, `tabs_context_mcp` d'abord), capturer chaque vue de la maquette, et comparer avec les captures du scénario : barre (tailles, mise en avant, opacité, « + »), menu du clic droit, dialogue « Nouveau workspace », dialogue de suppression, workspace vide, lignes des spaces (pastille, branche, `↑n`), lignes des agents (icône, nom du space, titre gris, durée, icône d'état). Corriger les écarts, rejouer.
- [ ] **Step 4 : sous-agents en vrai.** Dans un space de test (`hc run --bg --keep --no-parent --label herdr.space=spbergertest<hex> --label herdr.tab=tbbergertest<hex> -- zsh`, voir `CLAUDE.md`), lancer `claude` et lui demander une tâche qui lance un sous-agent (« lance un agent Explore qui liste les fichiers de ce dossier ») ; capture pendant qu'il tourne : la ligne du sous-agent sous son parent, avec son trait ; un clic dessus mène au terminal du parent. Puis lancer depuis ce terminal `hc run --keep -- zsh` (un enfant `hc run`) : il s'affiche sous son parent. Fermer ensuite ces terminaux et ce space (`BERGER_SCENARIO=ranger`).
- [ ] **Step 5 :** vérifier encore `⌃1`…`⌃9`, `⌥⌘]`/`⌥⌘[`, `⌘]`/`⌘[` (journal `BERGER_TRACE=1`), le tri des agents retenu après relance, et qu'un space créé dans Herdr pendant que Berger tourne (space de test) apparaît dans le workspace ouvert ; le fermer ensuite.
- [ ] **Step 6 :** `npm test`, `npm run typecheck`, `npm run lint` → passent.
- [ ] **Step 7 :** écrire `docs/notes/bilan-phase3-workspaces.md` (même forme que celui de la phase 2 : ce qui marche, décisions prises dont l'écart F2 du menu, la place de `workspaces.json`, l'emoji en saisie libre, le glisser à la souris ; ce qu'Antoine doit vérifier : ses vrais workspaces au premier lancement, les sous-agents de ses vrais agents) ; ROADMAP : phase 3 « Faite, à vérifier par Antoine (bilan : …) » ; `CLAUDE.md` : `BERGER_SCENARIO=workspaces`. Commit `docs: bilan de la phase 3`.
- [ ] **Step 8 :** pousser la branche et ouvrir la PR vers `develop` (`gh pr create --base develop`), corps en français avec le lien vers le bilan.
