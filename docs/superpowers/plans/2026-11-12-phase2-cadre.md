# Berger phase 2 — le cadre de la fenêtre : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** monter la vraie fenêtre de Berger (colonnes, barre d'onglets, onglets de terminaux découpés partagés avec Herdr, onglets de fichiers, barre d'état, raccourcis de Herdr) et corriger les petits défauts de la phase 0.

**Architecture :** toutes les règles (arbre des découpages, modification du document `herdr-app`, libellés, ordre des onglets, raccourcis, état retenu) sont des modules purs dans `src/shared/`, testés dans `tests/`. Le processus principal fait les échanges avec herdr-core (une connexion tramée `hc connect` par terminal attaché, écriture du document par `doc.get` → règle pure → `doc.set` avec la version, relecture en cas de conflit). La fenêtre (TypeScript sans framework, comme en phase 0) dessine l'état reçu et envoie des actions.

**Tech Stack :** Electron 44, electron-vite, TypeScript, xterm.js 6, Monaco 0.57, vitest. Icônes d'interface : paquet `lucide` (version vanilla de Lucide, ISC) à ajouter.

**Spec :** `docs/superpowers/specs/2026-11-12-phase2-cadre-design.md` (à lire en entier avant de commencer). Maquettes : `docs/maquettes/vue-principale.html`, `docs/maquettes/vue-fichier.html`, règles visuelles dans `docs/maquettes/README.md`. Pas de lien de design externe : les maquettes locales font foi pour l'apparence.

## Global Constraints

- Branche de travail : `phase2-cadre`, créée depuis `develop`. PR vers `develop` à la fin, jamais vers `main`.
- Textes de l'interface en français, avec les accents. Code et noms en français comme dans la phase 0.
- Ne jamais modifier `~/.config/herdr-app/` ni `~/dev/playground/herdr-app-mod/`.
- Ne jamais tester sur les spaces, onglets ou terminaux d'Antoine : créer ses propres spaces de test, les supprimer ensuite. Avant la première écriture réelle du document, en garder une copie (Tâche 10).
- Chaque écriture de `herdr-app` part de la dernière version lue et passe `version` à `doc.set` ; en cas d'erreur `conflict`, relire et réappliquer. Ne jamais écrire une version non lue. Garder tel quel ce que Berger ne comprend pas (panneaux de mods, champs inconnus).
- Seuls « Fermer le panneau » et « Fermer » (onglet) ferment des terminaux (`terminal.kill`).
- Berger n'envoie la taille d'un terminal (`RESIZE`) que quand sa fenêtre a le focus.
- Couleurs du thème `antoine-monokai` : fond `#1e1f1c`, panneau `#272822`, bord `#34352f`, texte `#d0d0c8`, texte vif `#f2f2ea`, gris `#75715e`, gris clair `#a59f85`, onglet actif `#414339`, bord du panneau qui a le clavier `#66d9ef`. États d'agent : au travail `#e6db74` (jaune), t'attend `#f92672` (rose), fini `#a6e22e` (vert). Pas d'orange.
- Tailles : barre d'onglets 52 px, onglet 30 px de haut, bandeau de panneau 28 px, 6 px entre les panneaux, barre d'état 26 px, barre des workspaces 76 px, explorateur 274 px par défaut.
- Rien dans la barre d'onglets à part les onglets et le séparateur (pas de « + », « Files », « Changes », « Outils »).
- Code repris ou inspiré d'ailleurs : une ligne dans `docs/COPIES.md`.
- Vérifier sans cliquer : `BERGER_CAPTURE`, `BERGER_SCENARIO` (voir `src/main/scenario.ts`, `CLAUDE.md`). Une chose « marche » seulement après l'avoir vue dans l'application lancée.
- Vérification visuelle : application Electron locale, pas de compte ni d'identifiants de connexion. Les captures de Berger (`BERGER_CAPTURE`, lues avec l'outil Read) sont comparées aux maquettes ouvertes dans Chrome avec claude-in-chrome (`file:///Users/antoinesouesme/dev/playground/berger/docs/maquettes/vue-principale.html` et `vue-fichier.html`).

## Review Focus

- **Herdr adopte le nouveau terminal avant que Berger écrive le document.** Un terminal lancé avec `herdr.space`/`herdr.tab` est rangé par Herdr lui-même s'il le voit avant le `doc.set` de Berger (« an id Herdr doesn't know becomes a new space or tab »). Attendu : un seul onglet ou un seul panneau, à la place demandée, jamais de doublon. Test : `appliquer` sur un document où l'adresse est déjà présente (Tâche 2).
- **Herdr écrit pendant que Berger écrit.** Attendu : Berger relit, réapplique, et les changements de Herdr restent. Test de `ecrireDoc` avec un faux core qui répond `conflict` une fois (Tâche 2).
- **Panneau de mod et champs inconnus dans un onglet découpé ou fermé.** Attendu : ils survivent à toutes les actions de Berger, octet pour octet. Test avec une fixture qui en contient (Tâche 2).
- **Terminal créé par Berger qui meurt quand Berger quitte.** Attendu : il continue de tourner dans Herdr. `terminal.run` avec `keep: true`, `no_parent: true`, `die_with_parent: false` ; vérifié en vrai à la Tâche 10 en quittant Berger.
- **Berger en arrière-plan qui se bat avec Herdr pour la taille.** Attendu : aucun `RESIZE` envoyé quand `document.hasFocus()` est faux, même quand un panneau change de taille. Vérifié avec `BERGER_TRACE=1` à la Tâche 10.

---

## Le découpage des fichiers

Nouveaux modules purs (`src/shared/`) :

| Fichier | Rôle |
|---|---|
| `arbre.ts` | l'arbre des découpages d'un onglet : feuilles, diviser, fermer, échanger, poids, géométrie, voisin |
| `document.ts` | modifier le document `herdr-app` : une action en entrée, le nouveau document en sortie ; identifiants façon Herdr |
| `libelles.ts` | nom et icône d'un programme, dossier affiché avec `~`, nom d'un onglet, couleur d'un état |
| `onglets.ts` | barre d'onglets (terminaux puis fichiers), onglet suivant/précédent/n, onglets de fichiers, agent suivant/précédent |
| `raccourcis.ts` | la table des raccourcis et le partage des touches entre Berger, le terminal et l'éditeur |
| `etat-fenetre.ts` | l'état retenu d'une session à l'autre : lecture avec valeurs par défaut |

Modifiés : `src/shared/spaces.ts` (la vue porte les onglets, leurs arbres et les terminaux), `src/shared/terminaux.ts` (suivi du numéro d'événement), `src/shared/fichiers.ts` (liste plafonnée signalée).

Processus principal : `src/main/ecriture.ts` (nouveau : boucle `doc.get`/`doc.set`), `src/main/actions.ts` (nouveau : actions de structure, création et fin des terminaux), `src/main/terminaux.ts` (nouveau, remplace le terminal unique de `index.ts` : une `TerminalOuvert` par adresse), `src/main/etat.ts` (nouveau : lire/écrire `etat-fenetre.json` dans `app.getPath('userData')`), `src/main/git.ts` (nouveau : branche d'un dossier), `src/main/menu.ts` (nouveau : menu de l'application sans `⌘W` ni `⌘T`), `index.ts`, `hc.ts`, `terminal.ts`, `fichiers.ts`, `vue.ts`, `scenario.ts`.

Fenêtre (`src/renderer/src/`) : `etat.ts` (l'état de la fenêtre et ses changements), `fenetre.ts` (colonnes et séparateurs), `colonne.ts` (réécrit : workspaces vides, liste de fichiers à la place de l'explorateur, spaces et agents), `barre-onglets.ts`, `panneaux.ts` (l'onglet de terminal), `terminal.ts` (réécrit : un xterm par adresse), `editeur.ts` (réécrit : un modèle Monaco par fichier), `menus.ts`, `clavier.ts`, `barre-etat.ts`, `icones.ts`, `main.ts`, `index.html`, `assets/main.css`. `choix-fichier.ts` est fondu dans `colonne.ts`.

---

### Task 1 : l'arbre des découpages

**Files :**
- Create : `src/shared/arbre.ts`
- Test : `tests/arbre.test.ts`

**Interfaces :**
- Produces :
  ```ts
  export type Taille = { weight?: number; px?: number }
  export type Bloc = { type: 'block'; id: string; content: { terminal?: string; mod?: string; props?: unknown }; size?: Taille; [cle: string]: unknown }
  export type Conteneur = { type: 'row' | 'column'; id: string; children: Noeud[]; size?: Taille; [cle: string]: unknown }
  export type Noeud = Bloc | Conteneur
  export type Sens = 'right' | 'down'
  export type Direction = 'left' | 'right' | 'up' | 'down'
  export type Rect = { x: number; y: number; l: number; h: number }
  export function feuilles(racine: Noeud): Bloc[]                       // ordre de lecture : gauche→droite, haut→bas
  export function diviser(racine: Noeud, panneau: string, sens: Sens, nouveau: Bloc, idConteneur: string): Noeud
  export function fermerPanneau(racine: Noeud, panneau: string): Noeud | null   // null : c'était le dernier
  export function echanger(racine: Noeud, a: string, b: string): Noeud
  export function changerPoids(racine: Noeud, conteneur: string, poids: number[]): Noeud
  export function rectangles(racine: Noeud): Map<string, Rect>         // id de bloc → rectangle dans [0,1]²
  export function voisin(racine: Noeud, panneau: string, direction: Direction): string | null
  ```
  Toutes les fonctions rendent un nouvel arbre, ne modifient jamais l'entrée, et recopient les champs inconnus des nœuds (`...noeud`). Un panneau absent de l'arbre : l'arbre est rendu inchangé (même référence), `voisin` rend `null`.

Règles (format observé dans le document réel, voir `tests/fixtures/herdr-app.json`) : la racine d'un onglet est toujours un `row` dont l'`id` est celui de l'onglet ; un enfant sans `size` compte pour un poids de 1 ; `px` (rare) est gardé tel quel et compte pour un poids de 1 dans la géométrie.

- `diviser` : si le parent du panneau a le même sens (`right` ↔ `row`, `down` ↔ `column`), `nouveau` est inséré juste après le panneau et les deux se partagent le poids du panneau (moitié chacun). Sinon le panneau est remplacé par un `Conteneur` d'id `idConteneur`, du bon type, qui prend la `size` du panneau et contient `[panneau, nouveau]` avec `{ weight: 0.5 }` chacun.
- `fermerPanneau` : retire le bloc ; un conteneur qui n'a plus qu'un enfant est remplacé par cet enfant (qui prend la `size` du conteneur), sauf la racine, qui reste un `row` (même vide d'un seul enfant). Plus aucun bloc : `null`.
- `echanger` : les deux positions gardent leur `size`, les blocs (id, content, champs inconnus) changent de place.
- `voisin` : parmi les blocs dont le rectangle touche le bord du panneau dans cette direction et le chevauche sur l'autre axe, celui qui le chevauche le plus ; à égalité, le premier dans l'ordre de lecture.

- [ ] **Step 1 : créer la branche**

```bash
git checkout develop && git pull && git checkout -b phase2-cadre
```

- [ ] **Step 2 : écrire les tests qui échouent** (`tests/arbre.test.ts`), avec un petit constructeur `b(id, terminal)` de bloc :

```ts
// onglet « trois » : A à gauche, B en haut à droite, C en bas à droite (comme la maquette)
const trois = { type: 'row', id: 'tb', children: [
  { ...b('A', 't1'), size: { weight: 0.5 } },
  { type: 'column', id: 's1', size: { weight: 0.5 }, children: [b('B', 't2'), b('C', 't3')] }
] } as Noeud

test('feuilles dans l\'ordre de lecture', () => expect(feuilles(trois).map((f) => f.id)).toEqual(['A', 'B', 'C']))
test('diviser à droite dans un row insère un frère et partage le poids', () => {
  const r = diviser(trois, 'A', 'right', b('N', 't9'), 'sX') as Conteneur
  expect(r.children.map((c) => c.id)).toEqual(['A', 'N', 's1'])
  expect(r.children[0].size).toEqual({ weight: 0.25 })
  expect(r.children[1].size).toEqual({ weight: 0.25 })
})
test('diviser en bas dans un row enveloppe le panneau dans un column', () => {
  const r = diviser(trois, 'A', 'down', b('N', 't9'), 'sX') as Conteneur
  expect(r.children[0]).toMatchObject({ type: 'column', id: 'sX', size: { weight: 0.5 } })
  expect(feuilles(r).map((f) => f.id)).toEqual(['A', 'N', 'B', 'C'])
})
test('fermer B remplace la colonne par C, qui prend sa taille', () => {
  const r = fermerPanneau(trois, 'B') as Conteneur
  expect(r.children[1]).toMatchObject({ id: 'C', size: { weight: 0.5 } })
})
test('fermer le dernier panneau rend null', () => {
  expect(fermerPanneau({ type: 'row', id: 'tb', children: [b('A', 't1')] }, 'A')).toBeNull()
})
test('la racine reste un row avec un seul enfant', () => {
  const r = fermerPanneau(fermerPanneau(trois, 'B')!, 'C')!
  expect(r).toMatchObject({ type: 'row', id: 'tb' })
  expect(feuilles(r).map((f) => f.id)).toEqual(['A'])
})
test('échanger garde les tailles aux positions', () => {
  const r = echanger(trois, 'A', 'C') as Conteneur
  expect(r.children[0]).toMatchObject({ id: 'C', size: { weight: 0.5 } })
  expect(feuilles(r).map((f) => f.id)).toEqual(['C', 'B', 'A'])
})
test('voisin', () => {
  expect(voisin(trois, 'A', 'right')).toBe('B')
  expect(voisin(trois, 'C', 'up')).toBe('B')
  expect(voisin(trois, 'C', 'left')).toBe('A')
  expect(voisin(trois, 'A', 'left')).toBeNull()
})
test('rectangles', () => expect(rectangles(trois).get('C')).toEqual({ x: 0.5, y: 0.5, l: 0.5, h: 0.5 }))
test('champs inconnus et panneaux de mods gardés', () => {
  const avecMod = { ...trois, inconnu: 1, children: [...(trois as Conteneur).children, { type: 'block', id: 'M', content: { mod: 'markdown', props: { file: '/x' } }, extra: true }] } as Noeud
  const r = diviser(avecMod, 'A', 'right', b('N', 't9'), 'sX') as Conteneur
  expect(r.inconnu).toBe(1)
  expect(r.children.at(-1)).toEqual({ type: 'block', id: 'M', content: { mod: 'markdown', props: { file: '/x' } }, extra: true })
})
test('panneau absent : arbre inchangé', () => expect(fermerPanneau(trois, 'Z')).toBe(trois))
test('changerPoids', () => expect((changerPoids(trois, 'tb', [0.7, 0.3]) as Conteneur).children[1].size).toEqual({ weight: 0.3 }))
```

- [ ] **Step 3 : lancer** `npx vitest run tests/arbre.test.ts` — Expected : FAIL (module introuvable).
- [ ] **Step 4 : écrire `src/shared/arbre.ts`** avec les signatures ci-dessus.
- [ ] **Step 5 : relancer** — Expected : PASS. Puis `npm run typecheck` — Expected : aucune erreur.
- [ ] **Step 6 : commit** `feat(arbre): règles pures de l'arbre des découpages`.

---

### Task 2 : modifier le document `herdr-app`, sans jamais écraser

**Files :**
- Create : `src/shared/document.ts`, `src/main/ecriture.ts`, `tests/document.test.ts`, `tests/ecriture.test.ts`, `tests/fixtures/herdr-app-mods.json`

**Interfaces :**
- Consumes : `arbre.ts` (Task 1).
- Produces :
  ```ts
  export type Action =
    | { type: 'onglet.nouveau'; space: string; onglet: string; panneau: string; adresse: string }
    | { type: 'onglet.renommer'; space: string; onglet: string; nom: string }
    | { type: 'onglet.fermer'; space: string; onglet: string }
    | { type: 'space.renommer'; space: string; nom: string }
    | { type: 'panneau.diviser'; space: string; onglet: string; panneau: string; sens: Sens; nouveau: string; conteneur: string; adresse: string }
    | { type: 'panneau.fermer'; space: string; onglet: string; panneau: string }
    | { type: 'panneau.echanger'; space: string; onglet: string; a: string; b: string }
    | { type: 'panneau.poids'; space: string; onglet: string; conteneur: string; poids: number[] }
  export function appliquer(doc: unknown, action: Action): unknown   // même référence si rien ne change
  export function idHerdr(prefixe: 'tb' | 'p' | 's', hasard?: () => string): string  // prefixe + 32 caractères hexadécimaux
  // src/main/ecriture.ts
  export type Requete = (methode: string, params: object) => Promise<unknown>
  export async function ecrireDoc(requete: Requete, action: Action, essais?: number): Promise<'ecrit' | 'inchange'>  // essais par défaut : 5 ; lève après
  ```

Règles d'`appliquer` (comportement de Herdr, `~/.config/herdr-app/AGENTS.md` § « The model ») :
- `onglet.nouveau` : ajoute à la fin des onglets du space `{ id: onglet, name: '', root: { type: 'row', id: onglet, children: [{ type: 'block', id: panneau, content: { terminal: adresse }, size: { weight: 1 } }] } }`. Si un onglet contient déjà `adresse` (Herdr l'a adopté le premier) : rien ne change.
- `panneau.diviser` : si `adresse` est déjà dans l'onglet (adoptée par Herdr), on retire d'abord son bloc, puis on divise. Si `adresse` est déjà juste à côté du panneau dans le bon sens, rien ne change.
- `onglet.renommer` / `space.renommer` : `name` = nom sans espaces autour (`''` rend le nom de place).
- `onglet.fermer` : retire l'onglet ; s'il était le dernier, retire le space.
- `panneau.fermer` : `fermerPanneau` ; `null` → comme `onglet.fermer`.
- space, onglet ou panneau introuvable : document inchangé (même référence).
- Tous les autres spaces, onglets et champs sont recopiés tels quels.

`ecrireDoc` : `doc.get {name:'herdr-app'}` → `appliquer` → si même référence, rendre `'inchange'` sans écrire ; sinon `doc.set {name, value, version}`. Erreur dont `kind === 'conflict'` : recommencer depuis `doc.get`. Autre erreur : la relancer.

- [ ] **Step 1 : fixture** `tests/fixtures/herdr-app-mods.json` : copie de `tests/fixtures/herdr-app.json` avec, dans l'onglet `tb1`, un troisième enfant `{ "type": "block", "id": "pm", "content": { "mod": "antoine-md", "props": { "file": "/x/a.md" } }, "inconnu": 42 }`, un champ `"settled": true` sur `tb2` et un champ `"machine": null` sur `sp1`.
- [ ] **Step 2 : tests qui échouent** (`tests/document.test.ts`) :

```ts
test('onglet.nouveau ajoute un onglet sans nom à la fin du space', () => {
  const d = appliquer(doc, { type: 'onglet.nouveau', space: 'sp2', onglet: 'tbN', panneau: 'pN', adresse: 't7' }) as any
  expect(d.spaces[1].tabs.map((t: any) => t.id)).toEqual(['tb3', 'tbN'])
  expect(d.spaces[1].tabs[1]).toEqual({ id: 'tbN', name: '', root: { type: 'row', id: 'tbN', children: [{ type: 'block', id: 'pN', content: { terminal: 't7' }, size: { weight: 1 } }] } })
})
test('onglet.nouveau ne double pas un terminal que Herdr a déjà rangé', () => {
  expect(appliquer(doc, { type: 'onglet.nouveau', space: 'sp1', onglet: 'tbN', panneau: 'pN', adresse: 't2b' })).toBe(doc)
})
test('panneau.diviser déplace un terminal adopté par Herdr au lieu de le doubler', () => {
  const d = appliquer(doc, { type: 'panneau.diviser', space: 'sp1', onglet: 'tb1', panneau: 'p1', sens: 'down', nouveau: 'pN', conteneur: 'sN', adresse: 't2c' }) as any
  expect(terminauxDeLArbre(d.spaces[0].tabs[0].root)).toEqual(['t2b', 't2c'])
})
test('fermer le dernier onglet ferme le space', () => {
  const d = appliquer(doc, { type: 'onglet.fermer', space: 'sp2', onglet: 'tb3' }) as any
  expect(d.spaces.map((s: any) => s.id)).toEqual(['sp1'])
})
test('fermer le dernier panneau ferme l\'onglet', () => {
  const d = appliquer(doc, { type: 'panneau.fermer', space: 'sp1', onglet: 'tb2', panneau: 'p3' }) as any
  expect(d.spaces[0].tabs.map((t: any) => t.id)).toEqual(['tb1'])
})
test('renommer à vide rend le nom de place', () => {
  const d = appliquer(doc, { type: 'onglet.renommer', space: 'sp1', onglet: 'tb1', nom: '  ' }) as any
  expect(d.spaces[0].tabs[0].name).toBe('')
})
test('panneaux de mods et champs inconnus survivent à chaque action', () => {
  for (const action of [/* une action de chaque type sur sp1/tb1/p1 */]) {
    const d = appliquer(mods, action) as any
    const json = JSON.stringify(d)
    expect(json).toContain('"mod":"antoine-md"'); expect(json).toContain('"inconnu":42')
    expect(json).toContain('"settled":true'); expect(json).toContain('"machine":null')
  }
})
test('cible introuvable : même document', () => {
  expect(appliquer(doc, { type: 'panneau.fermer', space: 'sp1', onglet: 'tb1', panneau: 'zz' })).toBe(doc)
})
test('idHerdr', () => expect(idHerdr('p')).toMatch(/^p[0-9a-f]{32}$/))
```

(le tableau d'actions du test « survivent » liste concrètement les 8 types d'action, sauf `onglet.fermer` et `panneau.fermer` qui ciblent `p1`/`tb1` sans supprimer le panneau de mod.)

Tests de `tests/ecriture.test.ts`, avec un faux `requete` qui enregistre les appels :
```ts
test('passe la version lue à doc.set', ...)           // doc.get rend version 7 → doc.set reçoit version: 7
test('relit et réapplique après un conflit', ...)      // 1er doc.set lève { kind: 'conflict' }, 2e doc.get rend un doc où Herdr a renommé sp2 → le doc écrit garde ce renommage ET l'action
test('n\'écrit rien quand rien ne change', ...)        // rend 'inchange', aucun doc.set
test('abandonne après 5 conflits', ...)                // rejette
```
L'erreur `conflict` se fabrique avec `new ErreurHc('conflict', 'conflict')` (`src/main/hc.ts`).

- [ ] **Step 3 : lancer** `npx vitest run tests/document.test.ts tests/ecriture.test.ts` — Expected : FAIL.
- [ ] **Step 4 : écrire `src/shared/document.ts` et `src/main/ecriture.ts`.** `idHerdr` utilise `crypto.getRandomValues` (16 octets en hexadécimal) par défaut.
- [ ] **Step 5 : relancer** — Expected : PASS.
- [ ] **Step 6 : commit** `feat(document): actions sur herdr-app avec relecture en cas de conflit`.

---

### Task 3 : la vue, les libellés et l'ordre des onglets

**Files :**
- Create : `src/shared/libelles.ts`, `src/shared/onglets.ts`, `tests/libelles.test.ts`, `tests/onglets.test.ts`
- Modify : `src/shared/spaces.ts`, `tests/spaces.test.ts`

**Interfaces :**
- Consumes : `Noeud`, `feuilles` (Task 1).
- Produces :
  ```ts
  // libelles.ts
  export type Icone = 'bot' | 'git-branch' | 'terminal' | 'square-terminal' | 'puzzle'
  export function programme(t: { argv?: string[]; foreground?: { name?: string; argv?: string[] } | null }): { nom: string; icone: Icone }
  export function dossierAffiche(chemin: string, maison: string): string        // '/Users/a/dev/x' → '~/dev/x'
  export function nomOnglet(nom: string | undefined, place: number): string       // place commence à 0 : '' → '1'
  export type EtatAgent = 'travail' | 'attente' | 'fini' | null
  export function etatAgent(t: TerminalCore): EtatAgent                           // working → travail ; idle, blocked → attente ; done → fini ; pas de status → null
  export const COULEUR_ETAT: Record<'travail' | 'attente' | 'fini', string>       // '#e6db74', '#f92672', '#a6e22e'
  // spaces.ts (vue enrichie, construireVue garde sa signature)
  export type VueTerminal = { adresse: string; libelle: string; etat: string; programme: { nom: string; icone: Icone }; dossier: string; agent: EtatAgent; vivant: boolean; clicsDroitsAuProgramme: boolean }
  export type VueOnglet = { id: string; nom: string; racine: Noeud; agent: EtatAgent }
  export type VueSpace = { id: string; nom: string; dossier: string; branche?: string; onglets: VueOnglet[]; terminaux: VueTerminal[] }
  export type Vue = { spaces: VueSpace[]; autres: VueTerminal[]; terminaux: Record<string, VueTerminal> }
  export function construireVue(doc: unknown, terminaux: TerminalCore[], maison?: string): Vue
  // onglets.ts
  export type RefOnglet = { type: 'terminal'; id: string } | { type: 'fichier'; chemin: string }
  export function barre(onglets: VueOnglet[], fichiers: string[]): RefOnglet[]    // terminaux puis fichiers
  export function ongletVoisin(liste: RefOnglet[], actif: RefOnglet | null, pas: 1 | -1): RefOnglet | null  // boucle
  export function ongletN(liste: RefOnglet[], n: number): RefOnglet | null         // n de 1 à 9, null au-delà de la liste
  export function apresFermeture(liste: RefOnglet[], ferme: RefOnglet): RefOnglet | null  // l'onglet à droite, sinon à gauche
  export function ouvrirFichier(fichiers: string[], chemin: string): string[]      // ajoute à la fin s'il n'y est pas
  export function fermerFichier(fichiers: string[], chemin: string): string[]
  export type PlaceAgent = { space: string; onglet: string; panneau: string; adresse: string }
  export function agents(vue: Vue): PlaceAgent[]                                    // ordre des spaces, des onglets, des panneaux
  export function agentVoisin(vue: Vue, actuel: string | null, pas: 1 | -1): PlaceAgent | null
  export function memeOnglet(a: RefOnglet | null, b: RefOnglet | null): boolean
  ```

Règles :
- `programme` : regarde `foreground.name`, sinon le nom de base de `foreground.argv[0]`, sinon de `argv[0]`. `claude` → `Claude Code` / `bot` ; `codex` → `Codex` / `bot` ; `lazygit` → `lazygit` / `git-branch` ; `zsh`, `bash`, `fish`, `sh` → ce nom / `terminal` ; autre → son nom de base / `square-terminal`. Jamais le `title` du terminal (`utilisateur@machine:chemin`).
- `VueTerminal.dossier` : `dossierAffiche(foreground.cwd || cwd, maison)` ; `clicsDroitsAuProgramme` : `labels['herdr.right-click'] === 'program'`.
- `VueOnglet.agent` : l'état du premier agent de l'onglet qui t'attend, sinon au travail, sinon fini, sinon `null` (l'icône de l'onglet prend cette couleur ; `null` → icône `terminal` grise).
- `VueSpace.dossier` : inchangé (phase 0). Un space dont le dossier est vide garde `dossier: ''` (la fenêtre en tient compte, Task 9).
- Les tests existants de `tests/spaces.test.ts` restent verts (adapter les attendus si la forme change, pas la règle).

- [ ] **Step 1 : tests qui échouent.** Exemples à écrire tels quels, plus un test par règle ci-dessus :

```ts
test('claude devient Claude Code', () => expect(programme({ foreground: { name: 'claude', argv: ['claude'] } })).toEqual({ nom: 'Claude Code', icone: 'bot' }))
test('zsh lancé en -l', () => expect(programme({ argv: ['/bin/zsh', '-l'], foreground: { argv: ['/bin/zsh', '-l'] } }).nom).toBe('zsh'))
test('dossier affiché', () => expect(dossierAffiche('/Users/a/dev/playground/berger', '/Users/a')).toBe('~/dev/playground/berger'))
test('onglet sans nom', () => expect(nomOnglet('', 2)).toBe('3'))
test('barre : terminaux puis fichiers', () => expect(barre([o('tb1'), o('tb2')], ['/a.ts'])).toEqual([{ type: 'terminal', id: 'tb1' }, { type: 'terminal', id: 'tb2' }, { type: 'fichier', chemin: '/a.ts' }]))
test('onglet suivant boucle', () => expect(ongletVoisin(liste, liste.at(-1)!, 1)).toEqual(liste[0]))
test('après fermeture : à droite, sinon à gauche', ...)
test('agentVoisin suit l\'ordre des spaces puis des onglets', ...)
test('la vue porte les onglets et leurs arbres', () => {
  const vue = construireVue(doc, [vivant('t2b'), vivant('t2c')], '/x')
  expect(vue.spaces[0].onglets.map((o) => o.nom)).toEqual(['1', '2'])
  expect(vue.spaces[0].onglets[0].racine).toBe(doc.spaces[0].tabs[0].root)
})
```

- [ ] **Step 2 : lancer** `npx vitest run tests/libelles.test.ts tests/onglets.test.ts tests/spaces.test.ts` — Expected : FAIL.
- [ ] **Step 3 : écrire les modules.**
- [ ] **Step 4 : relancer** — Expected : PASS ; `npm run typecheck` — Expected : erreurs seulement dans `src/renderer/src/colonne.ts` (réécrit en Task 7) ; si oui, les corriger a minima pour garder le typecheck vert à chaque commit.
- [ ] **Step 5 : commit** `feat(vue): onglets, libellés des programmes et ordre des onglets`.

---

### Task 4 : raccourcis et état retenu

**Files :**
- Create : `src/shared/raccourcis.ts`, `src/shared/etat-fenetre.ts`, `tests/raccourcis.test.ts`, `tests/etat-fenetre.test.ts`

**Interfaces :**
- Produces :
  ```ts
  // raccourcis.ts
  export type ActionClavier =
    | { type: 'onglet.nouveau' } | { type: 'onglet.fermer' } | { type: 'onglet.voisin'; pas: 1 | -1 } | { type: 'onglet.n'; n: number }
    | { type: 'space.n'; n: number } | { type: 'space.voisin'; pas: 1 | -1 } | { type: 'agent.voisin'; pas: 1 | -1 }
    | { type: 'panneau.diviser'; sens: Sens } | { type: 'panneau.fermer' } | { type: 'panneau.agrandir' }
    | { type: 'panneau.aller'; direction: Direction } | { type: 'panneau.echanger'; direction: Direction }
    | { type: 'onglet.renommer' } | { type: 'space.renommer' } | { type: 'colonne.basculer' }
    | { type: 'zoom'; pas: 1 | -1 | 0 } | { type: 'fichier.enregistrer' } | { type: 'fichier.chercher' } | { type: 'rien' }
  export type Touche = { key: string; code: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }
  export type Cible = 'terminal' | 'editeur' | 'autre'
  export function actionDe(touche: Touche, cible: Cible): ActionClavier | null   // null : la touche part au terminal / à l'éditeur
  ```
  ```ts
  // etat-fenetre.ts
  export type EtatFenetre = {
    largeurs: { explorateur: number; spaces: number }   // défaut 274 et 250 ; bornées à [160, 600]
    colonneMasquee: boolean                              // défaut false
    space: string | null
    onglet: RefOnglet | null
    fichiers: string[]
  }
  export const ETAT_PAR_DEFAUT: EtatFenetre
  export function lireEtatFenetre(brut: unknown): EtatFenetre   // tout champ absent ou mal formé → sa valeur par défaut
  ```

Table (spec § Raccourcis) — reconnaître par `code` (`KeyT`, `BracketRight`, `Digit1`, `Equal`, `Minus`, `Digit0`, `Enter`, `ArrowLeft`, `F2`, `Tab`…) pour ne pas dépendre de la disposition du clavier :
`⌘T` onglet.nouveau · `⌘W` onglet.fermer · `⌃Tab`/`⇧⌘]` onglet.voisin +1 · `⌃⇧Tab`/`⇧⌘[` −1 · `⌘1…9` onglet.n · `⌃1…9` space.n · `⌥⌘]`/`⌥⌘[` space.voisin · `⌘]`/`⌘[` agent.voisin · `⌘D` diviser right · `⇧⌘D` diviser down · `⇧⌘W` panneau.fermer · `⇧⌘↵` panneau.agrandir · `⌥⌘←→↑↓` panneau.aller · `⌥⇧⌘←→↑↓` panneau.echanger · `F2` onglet.renommer · `⇧F2` space.renommer · `⌘B` colonne.basculer · `⌘=` zoom +1 · `⌘-` −1 · `⌘0` 0 · `⌘S` fichier.enregistrer · `⌘F` fichier.chercher · `⌘P`, `⇧⌘P`, `⇧⌘F`, `⇧⌘E`, `⌘,` → `rien` (réservés, sans effet dans cette phase).

Partage :
- `cible === 'terminal'` ou `'autre'` : toute la table s'applique ; `⌘S` et `⌘F` → `null` dans un terminal (rien à enregistrer, la touche part au terminal).
- `cible === 'editeur'` : seuls passent à Berger `⌘T`, `⌘W`, `⌘1…9`, `⌃1…9`, `⌃Tab`, `⌃⇧Tab`, `⇧⌘[`, `⇧⌘]`, `⌥⌘[`, `⌥⌘]`, `⌘[`, `⌘]`, `⌘B`, `⌘P`, `⇧⌘P`, `⇧⌘F`, `⇧⌘E`, `⌘,`, et le zoom `⌘=` `⌘-` `⌘0`. Tout le reste (`⌘D`, `F2`, `⇧F2`, `⌥⌘↑↓←→`, `⌘S`, `⌘F`…) → `null` : Monaco le garde (`⌘S` est géré par une commande Monaco, `⌘F` est la recherche de Monaco).

- [ ] **Step 1 : tests qui échouent.**

```ts
const t = (code: string, mods: Partial<Touche> = {}, key = ''): Touche => ({ key, code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods })
test('⌘D divise à droite dans un terminal', () => expect(actionDe(t('KeyD', { metaKey: true }), 'terminal')).toEqual({ type: 'panneau.diviser', sens: 'right' }))
test('⌘D reste à Monaco dans l\'éditeur', () => expect(actionDe(t('KeyD', { metaKey: true }), 'editeur')).toBeNull())
test('⌘] change d\'agent même dans l\'éditeur', () => expect(actionDe(t('BracketRight', { metaKey: true }), 'editeur')).toEqual({ type: 'agent.voisin', pas: 1 }))
test('⇧⌘] onglet suivant', () => expect(actionDe(t('BracketRight', { metaKey: true, shiftKey: true }), 'terminal')).toEqual({ type: 'onglet.voisin', pas: 1 }))
test('⌥⇧⌘← échange à gauche', ...)
test('F2 renomme l\'onglet dans un terminal, pas dans l\'éditeur', ...)
test('⌘P est réservé dans l\'éditeur', () => expect(actionDe(t('KeyP', { metaKey: true }), 'editeur')).toEqual({ type: 'rien' }))
test('une lettre seule part au terminal', () => expect(actionDe(t('KeyA', {}, 'a'), 'terminal')).toBeNull())
test('⌃3 choisit le space 3', ...)
test('état par défaut quand le fichier est illisible', () => expect(lireEtatFenetre('n\'importe quoi')).toEqual(ETAT_PAR_DEFAUT))
test('largeur hors bornes ramenée', () => expect(lireEtatFenetre({ largeurs: { explorateur: 5000 } }).largeurs.explorateur).toBe(600))
test('onglet mal formé ignoré', () => expect(lireEtatFenetre({ onglet: { type: 'x' } }).onglet).toBeNull())
```

- [ ] **Step 2 : lancer** `npx vitest run tests/raccourcis.test.ts tests/etat-fenetre.test.ts` — Expected : FAIL.
- [ ] **Step 3 : écrire les deux modules.**
- [ ] **Step 4 : relancer** — Expected : PASS.
- [ ] **Step 5 : commit** `feat(clavier): raccourcis de Herdr et état retenu de la fenêtre`.

---

### Task 5 : les petits défauts de la phase 0 (côté processus principal)

**Files :**
- Modify : `src/main/hc.ts`, `src/main/terminal.ts`, `src/main/vue.ts`, `src/main/fichiers.ts`, `src/shared/terminaux.ts`, `src/shared/fichiers.ts`
- Create : `tests/faux/hc-muet.sh` (lit l'entrée sans jamais répondre)
- Test : `tests/robustesse.test.ts`, `tests/terminaux.test.ts`, `tests/fichiers.test.ts`

**Interfaces :**
- Produces :
  ```ts
  // hc.ts
  static async ouvrir(delaiHello?: number): Promise<Hc>   // défaut 5000 ms ; au-delà : ferme le processus et rejette ErreurHc('herdr-core ne répond pas', 'timeout')
  // terminaux.ts
  export function evenementNeuf(dernier: number | null, seq: number | undefined): boolean  // false si seq <= dernier
  // fichiers.ts (shared)
  export type ListeFichiers = { fichiers: string[]; tronquee: boolean }
  // main/fichiers.ts
  export async function listerFichiers(dossier: string): Promise<ListeFichiers>  // tronquee = true quand LIMITE_FICHIERS est atteinte
  ```

Corrections (spec § « Les petits défauts ») :
1. `hello` de `hc connect` : délai d'attente (ci-dessus). Test : `BERGER_HC=tests/faux/hc-muet.sh`, `Hc.ouvrir(200)` rejette en moins d'une seconde avec `kind === 'timeout'` (suivre le style de `tests/robustesse.test.ts`).
2. Numéro des événements : `vue.ts` garde le dernier `seq` vu ; un événement avec `seq <= dernier` est ignoré ; après un instantané `missed`, `dernier` prend le `seq` de l'instantané (lire sa forme exacte avec `hc schema` → `events.subscribe` et les notifications ; noter ce qui a été trouvé dans `docs/notes/trames-herdr-core.md`). Test de `evenementNeuf`.
3. Erreur au `hello` tramé : dans `TerminalOuvert`, lire la ligne de réponse au `hello` ; si elle contient `error`, `terminer(<message de l'erreur>)` sans envoyer `terminal.attach`. Test avec `tests/faux/hc-trame.mjs` adapté (une variante qui répond une erreur au hello) : `fin` est appelé avec le message.
4. Enregistrer quand la relecture échoue (fichier supprimé) : dans `berger:ecrire`, si `lire` rend `{ erreur }`, poser la question native « Le fichier n'a pas pu être relu (<erreur>). Enregistrer quand même ? » (`Enregistrer` / `Annuler`, défaut Annuler) avant d'écrire.
5. Liste plafonnée : `berger:lister` rend `ListeFichiers` ; la fenêtre affiche « Liste limitée aux 5 000 premiers fichiers » sous le filtre quand `tronquee` (Task 7). Test : un dossier temporaire de `LIMITE_FICHIERS + 1` fichiers → `tronquee === true` (baisser la limite par un paramètre facultatif `limite` de `listerFichiers` pour garder le test rapide).
6. Space sans dossier : `berger:lister` avec `dossier === ''` rend `{ fichiers: [], tronquee: false }` sans parcourir ; la fenêtre affiche « Ce space n'a pas de dossier » (Task 7). Jamais de chemin `/relatif`.

- [ ] **Step 1 : écrire les tests qui échouent** (un par correction 1, 2, 3, 5, 6 ; la 4 est vérifiée à la Task 10 en supprimant le fichier de test avant `⌘S`).
- [ ] **Step 2 : lancer** `npm test` — Expected : les nouveaux tests en FAIL, les anciens PASS.
- [ ] **Step 3 : corriger.**
- [ ] **Step 4 : relancer** `npm test` et `npm run typecheck` — Expected : PASS.
- [ ] **Step 5 : commit** `fix: petits défauts de la phase 0 (hello, seq, relecture, liste)`.

---

### Task 6 : processus principal — plusieurs terminaux, actions de structure, état retenu

**Files :**
- Create : `src/main/terminaux.ts`, `src/main/actions.ts`, `src/main/etat.ts`, `src/main/git.ts`, `src/main/menu.ts`
- Modify : `src/main/index.ts`, `src/main/vue.ts`, `src/preload/index.ts` (inchangé sauf besoin)

**Interfaces :**
- Consumes : `ecrireDoc` (Task 2), `idHerdr`, `Action` (Task 2), `construireVue` (Task 3), `lireEtatFenetre` (Task 4), `TerminalOuvert`.
- Produces — canaux IPC (la fenêtre s'appuie sur ces noms exacts) :
  | Canal | Sens | Données |
  |---|---|---|
  | `berger:vue` | main → fenêtre | `Vue` (avec `branche` de chaque space) |
  | `berger:attacher` | fenêtre → main | `{ adresse, cols, rows }` (n'en détache aucun autre) |
  | `berger:detacher` | fenêtre → main | `{ adresse }` |
  | `berger:touches` | fenêtre → main | `{ adresse, octets }` |
  | `berger:taille` | fenêtre → main | `{ adresse, cols, rows }` |
  | `berger:focus` | fenêtre → main | `{ actif }` (envoyé à tous les terminaux attachés) |
  | `berger:sortie` | main → fenêtre | `{ adresse, octets }` |
  | `berger:fin-terminal` | main → fenêtre | `{ adresse, raison }` |
  | `berger:structure` (invoke) | fenêtre → main | `DemandeStructure` ci-dessous → `{ ok: true; panneau?: string; onglet?: string } \| { erreur: string }` |
  | `berger:clics-droits` (invoke) | fenêtre → main | `{ adresse, auProgramme: boolean }` → `terminal.label { labels: { 'herdr.right-click': 'program' \| '' } }` |
  | `berger:etat-fenetre` (invoke) | fenêtre → main | sans données → `EtatFenetre` lu |
  | `berger:retenir` | fenêtre → main | `EtatFenetre` (écrit dans `userData/etat-fenetre.json`, au plus une fois toutes les 300 ms) |
  | `berger:zoom` | fenêtre → main | `{ pas: 1 \| -1 \| 0 }` → `webContents.setZoomLevel` (0 : niveau 0) |
  | `berger:question` (invoke) | fenêtre → main | `{ message, detail?, boutons: string[], defaut, annuler }` → index du bouton (`dialog.showMessageBox` sur la fenêtre) |
  | `berger:non-enregistres` (main → fenêtre) / `berger:reponse-quitter` (fenêtre → main) | voir Task 9 |
  ```ts
  // actions.ts
  export type DemandeStructure =
    | { type: 'onglet.nouveau'; space: string; dossier: string }
    | { type: 'panneau.diviser'; space: string; onglet: string; panneau: string; sens: Sens; dossier: string }
    | { type: 'onglet.fermer'; space: string; onglet: string; terminaux: string[]; dernier: boolean }
    | { type: 'panneau.fermer'; space: string; onglet: string; panneau: string; terminal?: string }
    | Extract<Action, { type: 'onglet.renommer' | 'space.renommer' | 'panneau.echanger' | 'panneau.poids' }>
  export function brancherActions(coeur: Coeur, fenetre: () => BrowserWindow | null): void
  ```

Comportement :
- Créer un terminal (nouvel onglet, division) : `terminal.run { argv: [], cwd: dossier || undefined, keep: true, no_parent: true, die_with_parent: false, labels: { 'herdr.space': space, 'herdr.tab': onglet } }` (le dossier est celui du panneau qui a le clavier, envoyé par la fenêtre ; vide → le dossier du space ; vide aussi → pas de `cwd`, le core choisit). Puis `ecrireDoc` avec `onglet.nouveau` (ids neufs `idHerdr('tb')`, `idHerdr('p')`) ou `panneau.diviser` (`idHerdr('p')`, `idHerdr('s')`). Si `doc.set` échoue définitivement, tuer le terminal créé (`terminal.kill`) et rendre `{ erreur }`.
- Fermer un onglet : si `dernier` (dernier onglet du space), `berger:question` est posée par la fenêtre avant (« Fermer le dernier onglet ferme aussi le space « <nom> ». Continuer ? », `Fermer` / `Annuler`). Écrire d'abord le document (`onglet.fermer`), puis `terminal.kill` sur chaque terminal de l'onglet.
- Fermer un panneau : document (`panneau.fermer`) puis `terminal.kill` du terminal du panneau s'il y en a un (un panneau de mod n'a pas de terminal).
- Renommer, échanger, poids : `ecrireDoc` seulement. Les poids sont envoyés par la fenêtre au relâchement du séparateur, pas pendant le glissement.
- `terminaux.ts` : `Map<adresse, TerminalOuvert>` ; `attacher` d'une adresse déjà attachée ne fait rien ; `detacher` ferme la connexion de cette adresse ; les sorties et fins portent l'adresse.
- `git.ts` : `brancheDe(dossier: string): Promise<string | undefined>` par `git -C <dossier> branch --show-current` (délai 2 s, `undefined` en cas d'erreur ou dossier vide) ; `vue.ts` l'ajoute aux spaces, mise en cache par dossier et rafraîchie au plus toutes les 5 s.
- `menu.ts` : `Menu.setApplicationMenu` avec le menu Berger (À propos, Masquer, Masquer les autres, Quitter `⌘Q`) et Édition (rôles `undo`, `redo`, `cut`, `copy`, `paste`, `selectAll`) ; aucun accélérateur `⌘W`, `⌘T`, `⌘=`, `⌘-`, `⌘0`, `⌘B`, `⌘D` (sinon macOS les prend avant la fenêtre).
- Quitter : sur `close` de la fenêtre, `preventDefault`, envoyer `berger:non-enregistres` ; la fenêtre répond `berger:reponse-quitter { quitter: boolean }` (Task 9) ; si vrai, détacher tous les terminaux (sans les tuer) et fermer.

- [ ] **Step 1 : écrire les modules et câbler `index.ts`** (retirer le terminal unique `ouvert` ; garder `BERGER_OUVRIR`/`BERGER_TAPER` en les faisant passer par la `Map`).
- [ ] **Step 2 :** `npm run typecheck` et `npm test` — Expected : PASS (la fenêtre peut ne pas encore utiliser les nouveaux canaux).
- [ ] **Step 3 :** `npm run dev` avec `BERGER_TRACE=1` — Expected : la fenêtre (encore celle de la phase 0, adaptée a minima pour compiler) s'ouvre, la console montre la connexion et la vue, aucune erreur.
- [ ] **Step 4 : commit** `feat(main): plusieurs terminaux, actions de structure et état retenu`.

---

### Task 7 : la fenêtre — colonnes, colonne de gauche, barre d'état

**Files :**
- Create : `src/renderer/src/etat.ts`, `src/renderer/src/fenetre.ts`, `src/renderer/src/barre-etat.ts`, `src/renderer/src/icones.ts`
- Modify : `src/renderer/index.html`, `src/renderer/assets/main.css`, `src/renderer/src/colonne.ts`, `src/renderer/src/main.ts`, `package.json` (ajout de `lucide`)
- Delete : `src/renderer/src/choix-fichier.ts` (fondu dans `colonne.ts`)

**Interfaces :**
- Consumes : canaux de la Task 6, `EtatFenetre` (Task 4), `Vue` (Task 3), `barre`/`RefOnglet` (Task 3).
- Produces :
  ```ts
  // etat.ts — la seule source de vérité de la fenêtre
  export type EtatUi = EtatFenetre & {
    vue: Vue; connecte: boolean
    focus: Record<string, string>      // onglet → panneau qui a le clavier
    agrandi: Record<string, string>    // onglet → panneau agrandi
    modifies: Set<string>              // fichiers non enregistrés
  }
  export function etat(): EtatUi
  export function changer(f: (e: EtatUi) => void): void   // applique, redessine (requestAnimationFrame), envoie berger:retenir
  export function surChangement(f: (e: EtatUi) => void): void
  export function spaceAffiche(): VueSpace | null          // etat().space, sinon le premier space
  export function ongletAffiche(): RefOnglet | null         // etat().onglet s'il existe encore, sinon le premier onglet du space
  // icones.ts
  export function icone(nom: string, couleur?: string, taille?: number): SVGElement   // depuis le paquet lucide
  ```

Ce qu'on voit (maquette `vue-principale.html`, à reproduire) :
- Fenêtre `titleBarStyle: 'hiddenInset'` (boutons macOS en haut de la barre des workspaces, comme la maquette).
- Colonne de gauche, trois bandes séparées par des traits pleine hauteur `#34352f` : barre des workspaces (76 px, vide dans cette phase en dehors de la place des boutons de fenêtre) ; zone « Explorateur » (titre « Explorateur », largeur `largeurs.explorateur`) qui contient, en attendant la phase 4, la liste de fichiers de la phase 0 (filtre + liste, 200 lignes affichées, message « Liste limitée aux 5 000 premiers fichiers » si `tronquee`, « Ce space n'a pas de dossier » si `dossier === ''`) ; « Spaces » puis « Agents » (largeur `largeurs.spaces`) : les spaces dans l'ordre du document avec la pastille de l'initiale et la branche à droite, le space affiché surligné ; sous chaque space ou dans la liste « Agents », les agents (icône `bot` à la couleur de l'état, nom du programme, état). Cliquer un space l'affiche ; `⇧F2` renomme sur place le space affiché (champ dans sa ligne, Entrée valide `space.renommer`, vide → nom de Herdr, Échap annule) ; cliquer un agent affiche son space, son onglet et donne le clavier à son panneau.
- Séparateurs entre les bandes : on les tire (largeur bornée à [160, 600]), la largeur est retenue (`berger:retenir`). `⌘B` masque ou montre toute la colonne de gauche (`colonneMasquee`, retenu).
- Colonne de droite : barre d'onglets (Task 8), contenu de l'onglet (Task 8 et 9), barre d'état de 26 px : icône `monitor` + « Cet ordinateur », icône `git-branch` + branche du space affiché (absente si inconnue), icône `bot` + « N agents » (agents vivants de tous les spaces ; « 1 agent » au singulier), et à droite « ⇧⌘P Commandes » (sans action).
- Bandeau « Déconnecté de herdr-core » en haut de la colonne de droite quand `connecte` est faux.
- Au chargement : `berger:etat-fenetre` puis `berger:etat`, et l'état retenu est appliqué (largeurs, space, onglet, fichiers rouverts).

- [ ] **Step 1 :** `npm install lucide` ; ajouter une ligne Lucide (ISC) dans `docs/COPIES.md` (dépendances).
- [ ] **Step 2 : écrire `etat.ts`, `fenetre.ts`, `colonne.ts`, `barre-etat.ts`, `icones.ts`, le HTML et le CSS.**
- [ ] **Step 3 :** `npm run typecheck` — Expected : PASS.
- [ ] **Step 4 : vérification visuelle.** `BERGER_CAPTURE=$SCRATCH/t7.png npm run dev`, lire la capture avec Read ; ouvrir `docs/maquettes/vue-principale.html` dans Chrome avec claude-in-chrome et comparer : trois bandes à gauche, barre d'état en bas à droite, couleurs. Puis tirer un séparateur (scénario ou à la main par `BERGER_SCENARIO`, voir Task 10), relancer : la largeur revient.
- [ ] **Step 5 : commit** `feat(fenetre): colonnes, spaces et agents, barre d'état`.

---

### Task 8 : barre d'onglets et onglets de terminaux découpés

**Files :**
- Create : `src/renderer/src/barre-onglets.ts`, `src/renderer/src/panneaux.ts`, `src/renderer/src/menus.ts`
- Modify : `src/renderer/src/terminal.ts` (réécrit), `src/renderer/assets/main.css`, `src/renderer/src/main.ts`

**Interfaces :**
- Consumes : `etat`/`changer` (Task 7), `rectangles`, `feuilles`, `voisin` (Task 1), `barre`, `apresFermeture`, `nomOnglet` (Task 3), canaux de la Task 6.
- Produces :
  ```ts
  // terminal.ts — un xterm par adresse, gardé tant que son onglet est affiché
  export function vueTerminal(adresse: string): HTMLElement     // crée ou rend l'élément ; attache au premier appel
  export function oublierTerminauxSauf(adresses: Set<string>): void   // détache et détruit les autres
  export function donnerClavier(adresse: string): void
  // menus.ts
  export type Entree = { libelle: string; raccourci?: string; icone?: string; coche?: boolean; faire: () => void } | 'separateur'
  export function ouvrirMenu(x: number, y: number, entrees: Entree[]): void   // se ferme sur Échap, clic dehors, choix
  // panneaux.ts
  export function dessinerOnglet(space: VueSpace, onglet: VueOnglet): void
  export function actionPanneau(a: Extract<ActionClavier, { type: `panneau.${string}` }>): void
  // barre-onglets.ts
  export function dessinerBarre(): void
  export function renommerOngletEnPlace(): void
  export function fermerOngletAffiche(): Promise<void>
  ```

Comportement (spec § « Le comportement attendu », maquettes) :
- **Barre** : onglets de terminaux du space affiché, un trait vertical séparateur, onglets de fichiers. Onglet de terminal : icône `bot` à la couleur de `VueOnglet.agent` (ou `terminal` gris si `null`) + `nom` ; actif : fond `#414339`, texte `#f2f2ea`. Clic : l'afficher. Clic molette (`auxclick`, `button === 1`) : le fermer. L'onglet actif est ramené en vue (`scrollIntoView({ inline: 'nearest' })`) à chaque changement. Pas de « + ».
- **Menu du clic droit sur un onglet de terminal** : « Renommer » (F2), « Nouvel onglet » (⌘T), séparateur, « Fermer » (⌘W). Renommer : un champ dans l'onglet, Entrée valide (`onglet.renommer`, vide → nom de place), Échap annule.
- **Onglet de terminal** : l'arbre est dessiné en flex imbriqués (`row` → `flex-direction: row`, `column` → `column`, `flex-grow` = poids), 6 px entre les panneaux, marge de 6 px sur les côtés et en bas. Séparateur entre deux enfants : on le tire, les poids changent à l'écran et `panneau.poids` part au relâchement. Chaque panneau : bord arrondi 8 px, fond `#272822`, bord `#34352f` ou `#66d9ef` s'il a le clavier ; bandeau de 28 px : icône du programme (couleur de l'état si agent), nom du programme en `#f2f2ea` gras, dossier en `#75715e`. Panneau de mod : même cadre, bandeau « Panneau de Herdr » + nom du mod, contenu vide. Terminal fini : message « Terminal terminé » dans le panneau.
- **Agrandir** (`⇧⌘↵`, menu) : seul ce panneau est dessiné, sur toute la place ; refaire l'action rétablit. Local à Berger (`agrandi`), jamais écrit dans le document.
- **Panneau qui a le clavier** : clic dans le panneau, `panneau.aller` (via `voisin`), ou agent choisi. Local (`focus`).
- **Menu du clic droit sur un panneau** : « Diviser à droite » (⌘D), « Diviser en bas » (⇧⌘D), « Agrandir le panneau » (⇧⌘↵), « Envoyer les clics droits au terminal » (coché si `clicsDroitsAuProgramme` ; le choisir bascule par `berger:clics-droits`), séparateur, « Fermer le panneau » (⇧⌘W). Quand `clicsDroitsAuProgramme`, un clic droit sans Maj part au terminal (pas de menu) ; Maj + clic droit ouvre toujours le menu.
- **Diviser, nouvel onglet** : `berger:structure` avec le dossier du panneau qui a le clavier (le `foreground.cwd` du terminal, chemin complet, pas la forme `~`) ; le nouveau panneau (ou onglet) prend le clavier dès que la vue le contient.
- **Fermer un onglet de terminal** : `dernier` vrai si c'est le seul onglet du space → question (Task 6) ; après fermeture, l'onglet affiché devient `apresFermeture`.
- **Taille** : un `ResizeObserver` par xterm ; `fit()` toujours, mais `berger:taille` n'est envoyé que si `document.hasFocus()`. Au `focus` de la fenêtre : `berger:focus { actif: true }` puis `berger:taille` pour chaque terminal affiché. Au `blur` : `berger:focus { actif: false }`.
- **Changer d'onglet ou de space** : `oublierTerminauxSauf` les adresses du nouvel onglet affiché (les terminaux d'un onglet caché sont détachés ; rattachés au retour).

- [ ] **Step 1 : écrire les modules.**
- [ ] **Step 2 :** `npm run typecheck` — Expected : PASS.
- [ ] **Step 3 : vérification visuelle sur un space de test** (créé comme dit en Task 10, Step 1) : capture d'un onglet découpé en trois, comparée à la maquette `vue-principale.html` dans Chrome (bandeaux, bord bleu, 6 px, menu du clic droit).
- [ ] **Step 4 : commit** `feat(onglets): barre d'onglets et terminaux découpés partagés avec Herdr`.

---

### Task 9 : onglets de fichiers et éditeur

**Files :**
- Modify : `src/renderer/src/editeur.ts` (réécrit), `src/renderer/src/barre-onglets.ts`, `src/renderer/src/colonne.ts`, `src/renderer/src/main.ts`, `src/renderer/assets/main.css`, `src/main/index.ts`

**Interfaces :**
- Consumes : `ouvrirFichier`, `fermerFichier`, `apresFermeture` (Task 3), `berger:question`, `berger:non-enregistres`, `berger:reponse-quitter` (Task 6).
- Produces :
  ```ts
  // editeur.ts
  export async function afficherFichier(chemin: string): Promise<void>   // crée le modèle au premier affichage (berger:lire), sinon le reprend
  export async function enregistrer(chemin: string): Promise<boolean>     // true si écrit
  export async function fermerFichierAvecQuestion(chemin: string): Promise<boolean>  // false si « Annuler »
  export async function quitterAvecQuestion(): Promise<boolean>
  export function modifie(chemin: string): boolean
  ```

Comportement :
- Ouvrir un fichier depuis la liste de la colonne de gauche : `ouvrirFichier` (ajouté à la fin des onglets de fichiers s'il n'y est pas), puis il devient l'onglet affiché. La liste est la même quel que soit le space (une seule liste, retenue).
- Onglet de fichier affiché : la zone de droite montre seulement l'éditeur, sur toute la largeur (marge 6 px), avec son bandeau de 28 px (icône `file` de Lucide en attendant les icônes Material de la phase 4, chemin découpé par `›` avec le nom en `#f2f2ea` gras, comme `vue-fichier.html`) et une ligne d'état sous l'éditeur : « Ligne L, colonne C » et le langage (`langageDe`). Jamais de terminal à côté.
- Un modèle Monaco par fichier ouvert, gardé tant que l'onglet est ouvert : changer d'onglet n'enregistre rien et ne perd rien. Un fichier modifié (`getAlternativeVersionId` différent de celui de l'enregistrement) : l'onglet montre un point `●` à la place de la croix.
- `⌘S` : enregistre le fichier affiché (`berger:ecrire` comme en phase 0 ; question si changé sur le disque ou illisible).
- Fermer un onglet de fichier modifié (clic molette, croix, `⌘W`) : `berger:question` « Voulez-vous enregistrer les modifications de <nom> ? », détail « Vos modifications seront perdues si vous ne les enregistrez pas. », boutons `Enregistrer`, `Ne pas enregistrer`, `Annuler` (défaut 0, annuler 2). Annuler : rien ne change ; Enregistrer échoué : l'onglet reste.
- Quitter avec des fichiers modifiés : même question pour l'ensemble (« Voulez-vous enregistrer les modifications de N fichiers ? », `Tout enregistrer`, `Ne pas enregistrer`, `Annuler`) ; répondre `berger:reponse-quitter`.
- Au lancement, les onglets de fichiers retenus se rouvrent (modèle créé au premier affichage ; un fichier disparu : son onglet est retiré).
- Les lignes longues ne passent plus sous la minicarte : reproduire d'abord avec un fichier de test aux lignes de 400 caractères, trouver la cause (option Monaco ou CSS du conteneur) et la corriger ; vérifier par capture que la fin d'une ligne défilée horizontalement reste lisible à gauche de la minicarte.
- Pas de menu du clic droit ni d'épinglage sur les onglets de fichiers (phase 4).

- [ ] **Step 1 : écrire `editeur.ts` et brancher la barre et la question de fermeture.**
- [ ] **Step 2 :** `npm run typecheck` et `npm test` — Expected : PASS.
- [ ] **Step 3 : vérification visuelle** : ouvrir un fichier de test du scratchpad, capture comparée à `vue-fichier.html` dans Chrome ; modifier, changer d'onglet, revenir : la modification est là et l'onglet a son point ; fermer : la question apparaît.
- [ ] **Step 4 : commit** `feat(fichiers): onglets de fichiers sur toute la largeur`.

---

### Task 10 : clavier, scénario et vérification avec Herdr

**Files :**
- Create : `src/renderer/src/clavier.ts`
- Modify : `src/main/scenario.ts`, `CLAUDE.md` (section Lancer), `docs/COPIES.md`, `docs/suivi/ROADMAP.md`, `docs/superpowers/specs/2026-11-12-phase4-fichiers-design.md`, `docs/notes/trames-herdr-core.md` (si la Task 5 a appris quelque chose)
- Create : `docs/notes/bilan-phase2-cadre.md`

**Interfaces :**
- Consumes : `actionDe` (Task 4), toutes les actions des Tasks 7 à 9.
- Produces : `export function brancherClavier(): void` — un écouteur `keydown` sur `window` en phase de capture : `cible` = `'editeur'` si l'élément actif est dans `#editeur`, `'terminal'` s'il est dans un xterm, sinon `'autre'` ; si `actionDe` rend une action : `preventDefault()`, `stopPropagation()`, l'exécuter. Les xterm reçoivent aussi `attachCustomKeyEventHandler` qui rend `false` pour une touche dont `actionDe(…, 'terminal')` n'est pas `null`. `⌘F` dans l'éditeur reste la recherche de Monaco.

- [ ] **Step 1 : se préparer sans toucher aux affaires d'Antoine.** Enregistrer une copie du document : `printf '%s\n%s\n' '{"jsonrpc":"2.0","id":1,"method":"hello","params":{"generation":1}}' '{"jsonrpc":"2.0","id":2,"method":"doc.get","params":{"name":"herdr-app"}}' | hc connect | tail -1 > $SCRATCH/herdr-app-avant.json`. Créer un space de test : `hc run --keep --label herdr.space=spbergertest<26 hex> --label herdr.tab=tbbergertest<26 hex> -- zsh` (Herdr ouvert l'adopte comme nouveau space ; s'il ne le fait pas, l'écrire par `ecrireDoc` avec une action de test locale au scénario). Ne travailler que dans ce space.
- [ ] **Step 2 : écrire `clavier.ts`** et étendre `BERGER_SCENARIO` avec `cadre` (variable `BERGER_SCENARIO_SPACE` = id du space de test) : afficher le space, `⌘T`, `⌘D`, `⇧⌘D`, `⌥⌘←`, `⌥⇧⌘→`, `F2` + « essai » + Entrée, `⇧⌘↵` deux fois, `⇧⌘W`, `⌘W`, avec une capture après chaque étape. Le scénario refuse de démarrer si `BERGER_SCENARIO_SPACE` n'est pas un space dont l'id commence par `spbergertest`.
- [ ] **Step 3 : jouer le scénario avec Herdr ouvert** et après chaque étape lire le document (`doc.get`) : l'onglet ou le panneau attendu est là, les autres spaces sont identiques à la copie du Step 1 (comparer avec `python3 -c` en retirant le space de test). Vérifier dans les captures : 6 px, bandeaux, bord bleu, nom « essai ».
- [ ] **Step 4 : l'inverse.** Sans toucher à l'écran de Herdr d'Antoine : écrire dans le document, par un petit script du scratchpad qui appelle `doc.get` puis `doc.set` avec la version, un renommage de l'onglet du space de test et une division d'un de ses panneaux (terminal lancé avec les étiquettes du space de test) ; Berger doit les montrer sans relancer (capture).
- [ ] **Step 5 : les terminaux survivent.** Quitter Berger : les terminaux du space de test sont toujours `live` (`hc ls`). `BERGER_TRACE=1` : aucune ligne `RESIZE` journalisée pendant que la fenêtre de Berger n'a pas le focus (ajouter la trace dans `TerminalOuvert.redimensionner`).
- [ ] **Step 6 : persistance.** Tirer un séparateur, ouvrir deux fichiers, afficher le second, quitter, relancer : largeurs, space, onglet et fichiers reviennent (capture).
- [ ] **Step 7 : défaut 4 de la Task 5.** Ouvrir un fichier du scratchpad, le modifier, le supprimer sur le disque, `⌘S` : la question « Le fichier n'a pas pu être relu… » apparaît.
- [ ] **Step 8 : ranger.** Fermer le space de test par Berger (`⌘W` sur son dernier onglet, question acceptée), puis vérifier que `doc.get` rend les mêmes spaces que la copie du Step 1 et que `hc ls` ne montre plus ses terminaux (sinon `hc kill`).
- [ ] **Step 9 : documentation.**
  - `docs/COPIES.md` : Lucide (ISC), règles d'onglets de fichiers inspirées de `files.js` du mod `antoine` (code personnel d'Antoine), règles de l'arbre et des commandes imitées de Herdr (`AGENTS.md`, aucun code repris).
  - `docs/superpowers/specs/2026-11-12-phase4-fichiers-design.md` : ajouter une note « Laissé par la phase 2 : la zone de l'explorateur contient provisoirement la liste de fichiers de la phase 0, et les onglets de fichiers portent l'icône `file` de Lucide ; la phase 4 les remplace par l'explorateur et les icônes Material. »
  - `CLAUDE.md` § Lancer : `BERGER_SCENARIO=cadre` et `BERGER_SCENARIO_SPACE`.
  - `docs/suivi/ROADMAP.md` : phase 2 « Faite, à vérifier par Antoine ».
  - `docs/notes/bilan-phase2-cadre.md` : ce qui marche (vu), décisions prises, ce qu'Antoine doit vérifier lui-même avec ses vrais onglets (onglets et découpages identiques à Herdr, changements dans Herdr suivis par Berger).
- [ ] **Step 10 : vérification finale.** `npm test` — Expected : tout PASS. `npm run typecheck` — Expected : aucune erreur. `npm run lint` — Expected : aucune erreur.
- [ ] **Step 11 : commit et PR.** `git commit -m "feat(clavier): raccourcis de Herdr, scénario cadre, bilan de la phase 2"`, `git push -u origin phase2-cadre`, `gh pr create --base develop` avec le bilan en description.
