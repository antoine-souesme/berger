# Berger phase 4 — fichiers : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** donner à Berger un explorateur de fichiers, une recherche `⌘P`, l'ouverture de fichiers de partout, des onglets de fichiers épinglables retenus par workspace et une visionneuse d'images, en reprenant les règles du mod `antoine`.

**Architecture :** les règles (affichage de l'explorateur, couleurs git, presse-papiers, état des fichiers par workspace, libellés d'onglets, recherche, raccourcis) sont des modules purs dans `src/shared/`, testés dans `tests/`. Le processus principal fait tout ce qui touche au disque par Node, dans un seul module (`src/main/disque.ts`) pour que la phase 6 puisse le remplacer : lister un dossier, état git, liste de tous les fichiers d'une racine, surveillance, déplacements, corbeille, presse-papiers de macOS. Il garde l'état des fichiers par workspace dans `fichiers.json` (dossier de données d'Electron), repris une seule fois de `~/.config/herdr-app/shared.json`. La fenêtre (TypeScript sans framework, comme avant) dessine l'explorateur, la recherche, les onglets et la visionneuse.

**Tech Stack :** Electron 44, electron-vite, TypeScript, vitest, `lucide`. Aucune dépendance nouvelle : les icônes Material sont des fichiers SVG copiés du mod.

**Spec :** `docs/superpowers/specs/2026-11-12-phase4-fichiers-design.md` (à lire en entier avant de commencer). Maquettes : `docs/maquettes/explorateur.html` (menu, glisser-déposer, corbeille, onglets, visionneuse), `docs/maquettes/recherche-fichiers.html` (`⌘P`), `docs/maquettes/vue-principale.html` et `vue-fichier.html` (explorateur, onglets), règles visuelles `docs/maquettes/README.md`. Pas de lien de design externe : les maquettes locales font foi pour l'apparence.

## Global Constraints

- Branche de travail : `phase4-fichiers`, déjà créée depuis `develop` avec ce plan. PR vers `develop` à la fin, jamais vers `main`.
- Textes de l'interface en français, avec les accents. Code et noms en français comme dans les phases précédentes.
- Jamais de suppression définitive d'un fichier d'Antoine : « Mettre à la corbeille » passe par `shell.trashItem`, après le dialogue. « Remplacer » (conflit de nom) met d'abord l'ancien à la corbeille, puis déplace.
- Ne jamais écraser un fichier existant sans le demander : déplacement, copie et dépôt du Finder posent la question « Remplacer » / « Garder les deux » / « Annuler » ; le collage prend un nom libre comme le Finder (`a copie.txt`, `a copie 2.txt`) ; nouveau fichier, nouveau dossier et renommage refusent un nom déjà pris (« Un élément porte déjà ce nom. »).
- Ne jamais figer l'interface : l'arbre se charge dossier par dossier ; un dossier affiche au plus 2 000 éléments ; la liste de `⌘P` est gardée en cache par racine dans le processus principal et le champ vide montre les récents sans attendre.
- `~/.config/herdr-app/` (dont `shared.json`) : lecture seule, une seule fois, quand `fichiers.json` n'existe pas encore. Ne rien modifier dans `~/dev/playground/herdr-app-mod/`.
- Décision suite à la question à Antoine (maquette et spec en désaccord) : « Retirer de l'explorateur » seulement sur une racine ajoutée à la main, comme le dit la spec.
- Les essais ne touchent que des dossiers de test dont le chemin contient `berger-essai` (créés dans le scratchpad) et les spaces de test `spbergertest…`. Avant le premier essai, garder une copie de `~/Library/Application Support/berger/fichiers.json` (s'il existe), `workspaces.json` et `etat-fenetre.json` ; les remettre à la fin. Le vrai premier lancement d'Antoine doit reprendre ses fichiers de Herdr : renommer le `fichiers.json` des essais en `fichiers.json.essai-phase4`.
- Règles visuelles (README des maquettes) : lignes de 22 px, police système 13 px, retrait de 8 px par niveau, noms sans gras, ce que git ignore en `#8c8c8c`, couleurs git de VS Code : conflit `#e4676b` (`!`), supprimé `#c74e39` (`D`), modifié `#e2c08d` (`M`), ajouté `#81b88b` (`A`), renommé `#73c991` (`R`), non suivi `#73c991` (`U`) ; un dossier porte un point `•` de la couleur la plus importante de son contenu.
- Fichiers masqués comme VS Code (`files.exclude`, liste du mod) : `.git`, `.svn`, `.hg`, `CVS`, `.DS_Store`, `Thumbs.db`.
- Images ouvertes dans la visionneuse : `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `ico`, `tiff`, `tif`, `svg` (sans tenir compte de la casse).
- Couleurs du thème `antoine-monokai` déjà dans `main.css` (fond `#1e1f1c`, panneau `#272822`, bord `#34352f`, texte `#d0d0c8`, gris `#75715e`, gris clair `#a59f85`, survol `#414339`). Rien de plus que ce que montrent les maquettes.
- Code repris : une ligne par morceau dans `docs/COPIES.md` (`files.js`, `quickopen.js`, `git.js`, `clip.js`, les règles d'affichage de `explorer.js`, `icons.js`, `material.js`, `icons/material/` sous licence MIT avec son fichier `LICENSE`).
- Vérifier sans cliquer : `BERGER_CAPTURE`, `BERGER_SCENARIO` (voir `src/main/scenario.ts` et `CLAUDE.md`). Une chose « marche » seulement après l'avoir vue dans l'application lancée.
- Vérification visuelle : application Electron locale, aucun compte ni identifiant de connexion (rien à mettre dans `.env.local`). Les captures de Berger (lues avec l'outil Read) sont comparées aux maquettes ouvertes dans Chrome avec claude-in-chrome (`file:///Users/antoinesouesme/dev/playground/berger/docs/maquettes/explorateur.html`, `recherche-fichiers.html`, `vue-fichier.html`) ; si l'extension n'est pas branchée, Chrome lancé en arrière-plan comme en phase 3.

## Review Focus

- **Déplacer un dossier dans lui-même ou dans un de ses sous-dossiers** (glisser, coller). Attendu : refusé sans rien toucher, message « Impossible de déplacer un dossier dans lui-même. ». Test `peutDeposer` (Tâche 1), et `transferer` le refuse (Tâche 5).
- **Déplacer un dossier dont des fichiers sont ouverts, dont un non enregistré.** Attendu : chaque onglet sous ce dossier suit son nouveau chemin, la modification en attente reste en attente sous le nouveau nom, le récent suit aussi. Test `suivreDeplacement` sur un dossier (Tâche 2) ; l'éditeur change la clé de ses modèles (Tâche 6).
- **Mettre à la corbeille un fichier ouvert.** Attendu : son onglet se ferme s'il n'a pas de modification en attente ; s'il en a, l'onglet reste (l'enregistrer recrée le fichier). Rien d'autre n'est fermé. Vu dans le scénario (Tâche 9).
- **Fichier retenu qui n'existe plus au relancement** (supprimé par un agent pendant que Berger était fermé). Attendu : retiré sans message, les autres onglets reviennent. Test `retirerAbsents` (Tâche 2), appliqué au chargement par le processus principal (Tâche 5).
- **Une même racine deux fois** (deux spaces dans le même dossier, ou un dossier ajouté qui est aussi le dossier d'un space ; un dossier ajouté d'un workspace sans space). Attendu : une seule racine ; `⌘P` liste chaque fichier une fois. Tests `racines` (Tâche 2) et `fusionner` (Tâche 3).

---

## Le découpage des fichiers

Nouveaux modules purs (`src/shared/`) :

| Fichier | Rôle |
|---|---|
| `explorateur.ts` | fichiers masqués, tri, couleurs git (`git status`), nom de copie, dossier de collage, dépôt possible, dossiers à relire après un changement du disque |
| `etat-fichiers.ts` | état par workspace : onglets épinglés et ouverts, récents, dossiers ajoutés, ordre des racines, dossiers dépliés ; reprise depuis Herdr ; racines ; libellés d'onglets ; images |
| `recherche.ts` | recherche de `⌘P` : correspondance (score et lettres trouvées), tri, emplacement affiché, fusion des racines |
| `icones-fichiers.ts` + `material.ts` | icône Material d'un fichier ou d'un dossier (repris de `icons.js` et `material.js`) |

Modifiés : `src/shared/raccourcis.ts` (`⇧⌘E`, `⌘P`, touches de l'explorateur), `src/shared/etat-fenetre.ts` (`explorateurMasque`, retrait de `fichiers`), `src/shared/fichiers.ts` (retrait de la liste plate de la phase 0).

Processus principal : `src/main/disque.ts` (nouveau : tout le disque), `src/main/etat-fichiers.ts` (nouveau : `fichiers.json`, reprise, IPC), `src/main/fichiers.ts` (retrait de `berger:lister`, ajout des canaux du disque), `src/main/menu.ts` (menu « Fichier »), `src/main/index.ts`, `src/main/scenario.ts`, `src/preload/index.ts` (`cheminDe`).

Fenêtre (`src/renderer/src/`) : `explorateur.ts` (nouveau : l'arbre et ses actions), `recherche-fichiers.ts` (nouveau : `⌘P`), `visionneuse.ts` (nouveau), `barre-onglets.ts`, `editeur.ts`, `etat.ts`, `colonne.ts` (retrait de la liste de la phase 0), `workspaces.ts` (bouton de l'explorateur), `fenetre.ts`, `clavier.ts`, `icones.ts`, `main.ts`, `index.html`, `assets/main.css`. Icônes : `src/renderer/public/material/*.svg` + `LICENSE` (servies à `./material/<nom>.svg`).

---

### Task 1 : les règles de l'explorateur et les icônes Material

**Files :**
- Create : `src/shared/explorateur.ts`, `src/shared/icones-fichiers.ts`, `src/shared/material.ts`, `src/renderer/public/material/` (copie de `~/.config/herdr-app/mods/antoine/icons/material/`, `LICENSE` compris)
- Test : `tests/explorateur.test.ts` (reprendre et traduire les cas de `~/dev/playground/herdr-app-mod/tests/git.test.mjs` et `clip.test.mjs`), `tests/icones-fichiers.test.ts`
- Modify : `docs/COPIES.md`

**Interfaces :**
- Produces :
  ```ts
  // explorateur.ts
  export const MASQUES: ReadonlySet<string>            // '.git', '.svn', '.hg', 'CVS', '.DS_Store', 'Thumbs.db'
  export type Entree = { nom: string; dossier: boolean; ignore: boolean }
  export function trierEntrees(entrees: Entree[]): Entree[]          // dossiers d'abord, puis localeCompare
  export type GenreGit = 'conflit' | 'supprime' | 'modifie' | 'ajoute' | 'renomme' | 'nonSuivi'
  export function lireStatutGit(sortie: string): [string, GenreGit][] // sortie de `git status --porcelain -z`
  export type Decoration = { genre: GenreGit; lettre: string; couleur: string }
  export function decoration(statut: [string, GenreGit][], relatif: string, dossier: boolean): Decoration | null
  export function nomDeCopie(nom: string, dossier: boolean, pris: Set<string>): string
  export function dossierDeCollage(choisi: { chemin: string; dossier: boolean }): string
  export function peutDeposer(source: string, dossierCible: string): boolean
  export function dossiersAPerimer(changes: string[], affiches: string[]): string[]
  // icones-fichiers.ts
  export function iconeFichier(nom: string, dossier: boolean, ouvert?: boolean): string  // nom du SVG, sans extension
  ```
  `material.ts` : `export default { file, folder, folderExpanded, folderNames, folderNamesExpanded, fileNames, fileExtensions }`, contenu de `material.js` tel quel (garder sa ligne d'en-tête « Generated from material-icon-theme 5.40.0 (MIT) »).

- [ ] **Step 1 : écrire les tests qui échouent**

```ts
test('lireStatutGit : non suivi, conflit, et le renommage saute l’ancien chemin', () => {
  const s = lireStatutGit('?? neuf.txt\0UU a.ts\0R  b.ts\0vieux.ts\0 M src/c.ts\0')
  expect(s).toEqual([['neuf.txt', 'nonSuivi'], ['a.ts', 'conflit'], ['b.ts', 'renomme'], ['src/c.ts', 'modifie']])
})
test('decoration : lettre sur le fichier, point de la couleur la plus importante sur le dossier', () => {
  const s: [string, GenreGit][] = [['src/a.ts', 'modifie'], ['src/b.ts', 'conflit'], ['neuf/', 'nonSuivi']]
  expect(decoration(s, 'src/a.ts', false)).toEqual({ genre: 'modifie', lettre: 'M', couleur: '#e2c08d' })
  expect(decoration(s, 'src', true)).toEqual({ genre: 'conflit', lettre: '•', couleur: '#e4676b' })
  expect(decoration(s, 'neuf/x.txt', false)?.lettre).toBe('U')
  expect(decoration(s, 'docs', true)).toBeNull()
})
test('trierEntrees : dossiers d’abord', () => {
  expect(trierEntrees([{ nom: 'b', dossier: false, ignore: false }, { nom: 'a', dossier: false, ignore: false }, { nom: 'z', dossier: true, ignore: false }]).map((e) => e.nom)).toEqual(['z', 'a', 'b'])
})
test('nomDeCopie comme le Finder', () => {
  expect(nomDeCopie('a.txt', false, new Set())).toBe('a.txt')
  expect(nomDeCopie('a.txt', false, new Set(['a.txt']))).toBe('a copie.txt')
  expect(nomDeCopie('a.txt', false, new Set(['a.txt', 'a copie.txt']))).toBe('a copie 2.txt')
  expect(nomDeCopie('v1.0', true, new Set(['v1.0']))).toBe('v1.0 copie')
})
test('peutDeposer refuse un dossier dans lui-même ou un sous-dossier', () => {
  expect(peutDeposer('/p/src', '/p/src')).toBe(false)
  expect(peutDeposer('/p/src', '/p/src/a')).toBe(false)
  expect(peutDeposer('/p/src', '/p/src2')).toBe(true)
})
test('dossierDeCollage : le dossier choisi, ou celui du fichier choisi', () => {
  expect(dossierDeCollage({ chemin: '/p/src', dossier: true })).toBe('/p/src')
  expect(dossierDeCollage({ chemin: '/p/src/a.ts', dossier: false })).toBe('/p/src')
})
test('dossiersAPerimer : le parent affiché et le dossier lui-même, jamais .git', () => {
  expect(dossiersAPerimer(['/p/src/a.ts', '/p/.git/index', '/p/docs'], ['/p/src', '/p', '/p/docs'])).toEqual(['/p/src', '/p', '/p/docs'])
})
// icones-fichiers.test.ts
test('iconeFichier : nom exact, extension double, dossier ouvert, repli', () => {
  expect(iconeFichier('package.json', false)).toBe('nodejs')
  expect(iconeFichier('index.d.ts', false)).toBe('typescript-def')
  expect(iconeFichier('src', true, true)).toBe('folder-src-open')
  expect(iconeFichier('zzz.inconnu', false)).toBe('file')
})
```

- [ ] **Step 2 : lancer les tests, ils échouent** — Run : `npx vitest run tests/explorateur.test.ts tests/icones-fichiers.test.ts` — Expected : FAIL (modules absents).

- [ ] **Step 3 : écrire `explorateur.ts`, `icones-fichiers.ts`, `material.ts` et copier les icônes**

Réécrire en TypeScript `parseStatus`/`decoration` (`git.js`), `copyName`/`pasteDir`/`canPaste` (`clip.js`), `staleDirs` (`files.js`), `iconFor` (`icons.js`, la table `material.ts` intégrée au lieu d'être passée en paramètre). `cp -R ~/.config/herdr-app/mods/antoine/icons/material src/renderer/public/material`. Ajouter les lignes de `docs/COPIES.md`.

- [ ] **Step 4 : lancer les tests, ils passent** — Run : `npx vitest run tests/explorateur.test.ts tests/icones-fichiers.test.ts && npm run typecheck` — Expected : PASS.

- [ ] **Step 5 : commit** — `git add -A && git commit -m "feat(fichiers): règles de l'explorateur et icônes Material"`

---

### Task 2 : l'état des fichiers par workspace

**Files :**
- Create : `src/shared/etat-fichiers.ts`
- Test : `tests/etat-fichiers.test.ts` (reprendre les cas utiles de `~/dev/playground/herdr-app-mod/tests/files.test.mjs` : onglets, dossiers ajoutés, `fileLabels`, `isImage`)

**Interfaces :**
- Produces :
  ```ts
  export type FichiersWorkspace = {
    epingles: string[]; ouverts: string[]; recents: string[]   // recents : le plus récent d'abord, 30 au plus
    dossiers: string[]; ordreRacines: string[]
    deplies: string[]   // dossiers dépliés sous les racines
    replies: string[]   // racines repliées (une racine est dépliée par défaut)
  }
  export type EtatFichiers = Record<string, FichiersWorkspace>  // clé : id du workspace
  export type OngletFichier = { chemin: string; epingle: boolean }
  export function lireEtatFichiers(brut: unknown): EtatFichiers | null   // contenu de fichiers.json ; null si illisible
  export function reprendreFichiersDeHerdr(partage: unknown): EtatFichiers  // objet entier de shared.json
  export function deWorkspace(e: EtatFichiers, ws: string): FichiersWorkspace
  export function ongletsFichiers(e: EtatFichiers, ws: string): OngletFichier[]   // épinglés puis ouverts
  export function ouvrirFichiers(e: EtatFichiers, ws: string, chemins: string[]): EtatFichiers  // + récents
  export function epingler(e: EtatFichiers, ws: string, chemin: string): EtatFichiers
  export function desepingler(e: EtatFichiers, ws: string, chemin: string): EtatFichiers        // repasse dans ouverts, en tête
  export function fermerFichierWs(e: EtatFichiers, ws: string, chemin: string): EtatFichiers    // épinglé ou non
  export function suivreDeplacement(e: EtatFichiers, paires: [string, string][]): EtatFichiers  // tous les workspaces, toutes les listes
  export function retirerAbsents(e: EtatFichiers, existe: (chemin: string) => boolean): EtatFichiers  // epingles, ouverts
  export function oublierWorkspace(e: EtatFichiers, ws: string): EtatFichiers
  export function ajouterDossier(e: EtatFichiers, ws: string, chemin: string): EtatFichiers
  export function retirerDossier(e: EtatFichiers, ws: string, chemin: string): EtatFichiers
  export function racines(dossiersSpaces: string[], f: FichiersWorkspace): string[]
  export function deplacerRacine(e: EtatFichiers, ws: string, actuelles: string[], chemin: string, index: number): EtatFichiers
  export function basculerDeplie(e: EtatFichiers, ws: string, dossier: string): EtatFichiers
  export function basculerRacine(e: EtatFichiers, ws: string, racine: string): EtatFichiers
  export function toutReplier(e: EtatFichiers, ws: string): EtatFichiers   // vide `deplies`, laisse `replies`
  export function libellesOnglets(chemins: string[]): Map<string, { nom: string; dossier: string }>
  export function estImage(chemin: string): boolean
  ```
  Toutes rendent un nouvel objet quand quelque chose change (la fenêtre compare les références pour savoir quoi retenir). Le fichier affiché n'est pas dans cet état : l'onglet retenu de `etat-fenetre.json` le rouvre déjà (le `shown` de Herdr n'est pas repris).

- [ ] **Step 1 : écrire les tests qui échouent**

```ts
const ws = 'ws-a'
test('ouvrir ajoute à la fin des ouverts et en tête des récents, sans doublon', () => {
  let e = ouvrirFichiers({}, ws, ['/p/a.ts', '/p/b.ts'])
  e = ouvrirFichiers(e, ws, ['/p/a.ts'])
  expect(deWorkspace(e, ws).ouverts).toEqual(['/p/a.ts', '/p/b.ts'])
  expect(deWorkspace(e, ws).recents).toEqual(['/p/a.ts', '/p/b.ts'])
})
test('épinglés en premier, désépingler remet dans les ouverts', () => {
  let e = ouvrirFichiers({}, ws, ['/p/a.ts', '/p/b.ts'])
  e = epingler(e, ws, '/p/b.ts')
  expect(ongletsFichiers(e, ws)).toEqual([{ chemin: '/p/b.ts', epingle: true }, { chemin: '/p/a.ts', epingle: false }])
  e = desepingler(e, ws, '/p/b.ts')
  expect(ongletsFichiers(e, ws).every((o) => !o.epingle)).toBe(true)
})
test('fermer retire un onglet épinglé comme un ouvert', () => {
  const e = fermerFichierWs(epingler(ouvrirFichiers({}, ws, ['/p/a.ts']), ws, '/p/a.ts'), ws, '/p/a.ts')
  expect(ongletsFichiers(e, ws)).toEqual([])
})
test('suivreDeplacement : un fichier, et tout ce qui est sous un dossier, dans tous les workspaces', () => {
  let e = ouvrirFichiers({}, ws, ['/p/src/a.ts', '/p/src2/b.ts'])
  e = epingler(ouvrirFichiers(e, 'ws-b', ['/p/src/x/c.ts']), 'ws-b', '/p/src/x/c.ts')
  e = suivreDeplacement(e, [['/p/src', '/p/lib/src']])
  expect(deWorkspace(e, ws).ouverts).toEqual(['/p/lib/src/a.ts', '/p/src2/b.ts'])
  expect(deWorkspace(e, ws).recents[0]).toBe('/p/src2/b.ts')
  expect(deWorkspace(e, 'ws-b').epingles).toEqual(['/p/lib/src/x/c.ts'])
})
test('retirerAbsents retire sans toucher aux autres', () => {
  const e = retirerAbsents(ouvrirFichiers({}, ws, ['/p/a', '/p/b']), (c) => c !== '/p/a')
  expect(deWorkspace(e, ws).ouverts).toEqual(['/p/b'])
})
test('reprendreFichiersDeHerdr lit folders, recent et files (pinned, open)', () => {
  const e = reprendreFichiersDeHerdr({
    'antoine.folders': { [ws]: ['/d'] },
    'antoine.recent': { [ws]: ['/r'] },
    'antoine.files': { [ws]: { pinned: ['/e'], open: ['/o'], shown: '/o' } },
    'autre.cle': 1
  })
  expect(deWorkspace(e, ws)).toEqual({ epingles: ['/e'], ouverts: ['/o'], recents: ['/r'], dossiers: ['/d'], ordreRacines: [], deplies: [], replies: [] })
  expect(reprendreFichiersDeHerdr(null)).toEqual({})
})
test('lireEtatFichiers : null si ce n’est pas un objet, champs manquants complétés', () => {
  expect(lireEtatFichiers('x')).toBeNull()
  expect(deWorkspace(lireEtatFichiers({ [ws]: { ouverts: ['/a'] } })!, ws).epingles).toEqual([])
})
test('racines : spaces puis dossiers ajoutés, sans doublon, dans l’ordre retenu', () => {
  const f = { ...deWorkspace({}, ws), dossiers: ['/b', '/x'], ordreRacines: ['/x', '/a'] }
  expect(racines(['/a', '/b', '/a'], f)).toEqual(['/x', '/a', '/b'])
  expect(racines([], { ...deWorkspace({}, ws), dossiers: ['/d'] })).toEqual(['/d'])
})
test('deplacerRacine retient l’ordre complet', () => {
  const e = deplacerRacine({}, ws, ['/a', '/b', '/c'], '/c', 0)
  expect(racines(['/a', '/b'], { ...deWorkspace(e, ws), dossiers: ['/c'] })).toEqual(['/c', '/a', '/b'])
})
test('libellesOnglets : le dossier seulement quand deux noms se ressemblent, assez profond pour les distinguer', () => {
  const l = libellesOnglets(['/p/src/main/index.ts', '/p/src/renderer/index.ts', '/p/a.md'])
  expect(l.get('/p/src/main/index.ts')).toEqual({ nom: 'index.ts', dossier: 'main' })
  expect(l.get('/p/a.md')).toEqual({ nom: 'a.md', dossier: '' })
  const m = libellesOnglets(['/x/src/index.ts', '/y/src/index.ts'])
  expect(m.get('/x/src/index.ts')!.dossier).toBe('x/src')
})
test('estImage', () => {
  expect(estImage('/a/B.PNG')).toBe(true)
  expect(estImage('/a/logo.svg')).toBe(true)
  expect(estImage('/a/x.tif')).toBe(true)
  expect(estImage('/a/x.ts')).toBe(false)
})
test('basculerDeplie, toutReplier, oublierWorkspace, ajouter et retirer un dossier', () => {
  let e = basculerDeplie({}, ws, '/p/src')
  expect(deWorkspace(e, ws).deplies).toEqual(['/p/src'])
  e = basculerRacine(e, ws, '/p')
  e = toutReplier(ajouterDossier(e, ws, '/d'), ws)
  expect(deWorkspace(e, ws)).toMatchObject({ deplies: [], replies: ['/p'], dossiers: ['/d'] })
  expect(deWorkspace(retirerDossier(e, ws, '/d'), ws).dossiers).toEqual([])
  expect(oublierWorkspace(e, ws)[ws]).toBeUndefined()
})
```

- [ ] **Step 2 : lancer les tests, ils échouent** — Run : `npx vitest run tests/etat-fichiers.test.ts` — Expected : FAIL.
- [ ] **Step 3 : écrire `etat-fichiers.ts`** en partant de `files.js` (`openFile`, `pin`, `unpin`, `closeFile`, `addFolder`, `removeFolder`, `withFolders`, `fileLabels`, `isImage`) et `remember` de `quickopen.js` (30 récents). `libellesOnglets` : même algorithme que `fileLabels`, mais rend le nom et le dossier séparés (le dossier va en gris dans l'onglet). Ligne dans `docs/COPIES.md`.
- [ ] **Step 4 : lancer les tests, ils passent** — Run : `npx vitest run tests/etat-fichiers.test.ts && npm run typecheck` — Expected : PASS.
- [ ] **Step 5 : commit** — `git commit -am "feat(fichiers): état des fichiers par workspace"` (ajouter les nouveaux fichiers).

---

### Task 3 : les règles de la recherche de fichiers

**Files :**
- Create : `src/shared/recherche.ts`
- Modify : `src/shared/fichiers.ts` (retirer `filtrerFichiers`, `DOSSIERS_IGNORES` reste pour le parcours hors git, `LIMITE_FICHIERS` passe à 50 000 par racine), `tests/fichiers.test.ts` (retirer les trois tests de `filtrerFichiers`)
- Test : `tests/recherche.test.ts` (reprendre et traduire `~/dev/playground/herdr-app-mod/tests/quickopen.test.mjs`)

**Interfaces :**
- Produces :
  ```ts
  export type FichierRacine = { racine: string; relatif: string }
  export const cheminDe: (f: FichierRacine) => string
  export function correspondance(requete: string, texte: string): { score: number; positions: number[] } | null
  export type Trouve = { fichier: FichierRacine; positionsNom: number[]; positionsDossier: number[] }
  export function chercher(requete: string, fichiers: FichierRacine[], recents: string[], limite?: number): Trouve[]  // limite 60
  export function emplacement(f: FichierRacine, maison: string): string    // « berger • src/main », « ~ »
  export function fusionner(listes: FichierRacine[][]): FichierRacine[]
  ```
  `positionsNom` : index des lettres trouvées dans le nom du fichier (surlignées) ; `positionsDossier` : dans le dossier, quand la correspondance n'est pas dans le nom.

- [ ] **Step 1 : écrire les tests qui échouent** — en plus des cas traduits de `quickopen.test.mjs` (score, tri, récents, `where`, `merge`) :

```ts
test('correspondance rend les lettres trouvées', () => {
  expect(correspondance('edt', 'editeur.ts')?.positions).toEqual([0, 1, 8])
  expect(correspondance('zz', 'editeur.ts')).toBeNull()
})
test('requête vide : les récents qui existent encore, dans l’ordre', () => {
  const f = [{ racine: '/p', relatif: 'a.ts' }, { racine: '/p', relatif: 'b.ts' }]
  expect(chercher('', f, ['/p/b.ts', '/p/disparu.ts', '/p/a.ts']).map((t) => t.fichier.relatif)).toEqual(['b.ts', 'a.ts'])
})
test('le nom bat le dossier, et les positions suivent', () => {
  const f = [{ racine: '/p', relatif: 'edit/x.ts' }, { racine: '/p', relatif: 'src/editeur.ts' }]
  const r = chercher('edit', f, [])
  expect(r[0].fichier.relatif).toBe('src/editeur.ts')
  expect(r[0].positionsNom).toEqual([0, 1, 2, 3])
  expect(r[1].positionsDossier).toEqual([0, 1, 2, 3])
})
test('fusionner garde chaque fichier une fois (racine dans une racine)', () => {
  const r = fusionner([[{ racine: '/p', relatif: 'sub/a.ts' }], [{ racine: '/p/sub', relatif: 'a.ts' }]])
  expect(r).toHaveLength(1)
})
```

- [ ] **Step 2 : lancer les tests, ils échouent** — Run : `npx vitest run tests/recherche.test.ts` — Expected : FAIL.
- [ ] **Step 3 : écrire `recherche.ts`** en reprenant `match`, `search`, `where`, `merge` de `quickopen.js` (même score et même tri), `correspondance` gardant en plus les index trouvés. Retirer `filtrerFichiers` de `fichiers.ts` et ses tests. Ligne dans `docs/COPIES.md`.
- [ ] **Step 4 : lancer les tests, ils passent** — Run : `npm test && npm run typecheck` — Expected : PASS. `colonne.ts` importe encore `filtrerFichiers` : dans ce même commit, retirer de `colonne.ts` la liste de la phase 0 (`chargerFichiers`, `dessinerFichiers`, le filtre `#filtre` et `#liste-fichiers` de `index.html`) ; `annoncerColonne` garde son nom et écrit dans `#explorateur-message`. La zone de l'explorateur reste vide jusqu'à la Tâche 7.
- [ ] **Step 5 : commit** — `git commit -m "feat(fichiers): règles de la recherche de fichiers"`

---

### Task 4 : les raccourcis

**Files :**
- Modify : `src/shared/raccourcis.ts`
- Test : `tests/raccourcis.test.ts`

**Interfaces :**
- Produces : `Cible` devient `'terminal' | 'editeur' | 'explorateur' | 'autre'` ; nouvelles actions `{ type: 'explorateur.basculer' }` (`⇧⌘E`, à la place de `rien`), `{ type: 'fichier.rechercher' }` (`⌘P`, à la place de `rien`), et pour la cible `explorateur` seulement : `explorateur.renommer` (F2), `explorateur.copier` (`⌘C`), `explorateur.coller` (`⌘V`), `explorateur.copierChemin` (`⌥⌘C`), `explorateur.corbeille` (`⌘⌫`). `explorateur.basculer` et `fichier.rechercher` vont dans `PRIS_A_L_EDITEUR`. `⌘O` n'est pas dans la table : il appartient au menu « Fichier » (Tâche 5).

- [ ] **Step 1 : écrire les tests qui échouent**

```ts
const t = (code: string, m: Partial<Touche> = {}): Touche => ({ key: '', code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...m })
test('⇧⌘E et ⌘P partout, même dans l’éditeur et le terminal', () => {
  for (const c of ['editeur', 'terminal', 'autre'] as const) {
    expect(actionDe(t('KeyE', { metaKey: true, shiftKey: true }), c)).toEqual({ type: 'explorateur.basculer' })
    expect(actionDe(t('KeyP', { metaKey: true }), c)).toEqual({ type: 'fichier.rechercher' })
  }
})
test('les touches de l’explorateur seulement quand il a le clavier', () => {
  expect(actionDe(t('F2'), 'explorateur')).toEqual({ type: 'explorateur.renommer' })
  expect(actionDe(t('F2'), 'autre')).toEqual({ type: 'onglet.renommer' })
  expect(actionDe(t('KeyC', { metaKey: true }), 'explorateur')).toEqual({ type: 'explorateur.copier' })
  expect(actionDe(t('KeyC', { metaKey: true }), 'terminal')).toBeNull()
  expect(actionDe(t('KeyV', { metaKey: true }), 'explorateur')).toEqual({ type: 'explorateur.coller' })
  expect(actionDe(t('KeyC', { metaKey: true, altKey: true }), 'explorateur')).toEqual({ type: 'explorateur.copierChemin' })
  expect(actionDe(t('Backspace', { metaKey: true }), 'explorateur')).toEqual({ type: 'explorateur.corbeille' })
  expect(actionDe(t('Backspace', { metaKey: true }), 'autre')).toBeNull()
})
```

- [ ] **Step 2 : lancer, échec** — Run : `npx vitest run tests/raccourcis.test.ts` — Expected : FAIL.
- [ ] **Step 3 : modifier `raccourcis.ts`** : les touches de la cible `explorateur` sont regardées avant la table ; sinon la table habituelle. Corriger `executer` de `clavier.ts` pour que le typecheck passe (les nouvelles actions appellent des fonctions des Tâches 7 et 8 : d'ici là, `case` vides marqués `// Tâche 7` / `// Tâche 8`, à remplir dans ces tâches). `cibleDe` rend `'explorateur'` quand l'élément est dans `#arbre` (l'arbre de la Tâche 7) et n'est pas un `INPUT`.
- [ ] **Step 4 : lancer, succès** — Run : `npm test && npm run typecheck` — Expected : PASS.
- [ ] **Step 5 : commit** — `git commit -am "feat(fichiers): raccourcis de l'explorateur et de la recherche"`

---

### Task 5 : le disque et l'état des fichiers dans le processus principal

**Files :**
- Create : `src/main/disque.ts`, `src/main/etat-fichiers.ts`
- Modify : `src/main/fichiers.ts` (retirer `listerFichiers` et `berger:lister` ; brancher les canaux ci-dessous), `src/main/menu.ts`, `src/main/index.ts`, `src/preload/index.ts`
- Test : `tests/disque.test.ts` (dossier temporaire `mkdtemp(join(tmpdir(), 'berger-essai-'))`, pas d'Electron : `disque.ts` n'importe `electron` que dans les fonctions qui en ont besoin — corbeille, presse-papiers, Finder — passées en paramètre ou isolées dans `fichiers.ts`)

**Interfaces :**
- Consumes : `Entree`, `MASQUES`, `trierEntrees`, `lireStatutGit`, `nomDeCopie`, `peutDeposer` (Tâche 1) ; `lireEtatFichiers`, `reprendreFichiersDeHerdr`, `retirerAbsents` (Tâche 2) ; `DOSSIERS_IGNORES`, `LIMITE_FICHIERS` (Tâche 3).
- Produces (`disque.ts`) :
  ```ts
  export async function listerDossier(dossier: string): Promise<{ entrees: Entree[]; tronque: boolean } | { erreur: string }>  // 2 000 au plus, masqués retirés, `ignore` par `git check-ignore`
  export async function statutGit(racine: string): Promise<{ depot: string; statut: [string, GenreGit][] } | null>  // `git rev-parse --show-toplevel` puis `git status --porcelain -z` ; null hors dépôt ; 2 s au plus
  export async function tousLesFichiers(racine: string): Promise<string[]>  // relatifs ; `git ls-files -z --cached --others --exclude-standard` dans un dépôt, sinon parcours sans MASQUES ni DOSSIERS_IGNORES ; 50 000 au plus
  export function surveiller(racine: string, changement: (chemins: string[]) => void): () => void  // fs.watch récursif, changements groupés toutes les 150 ms
  export async function nomsPris(sources: string[], cible: string): Promise<string[]>
  export async function transferer(o: { sources: string[]; cible: string; copier: boolean; conflit: 'remplacer' | 'garder' | null; corbeille: (chemin: string) => Promise<void> }): Promise<{ faits: [string, string][]; erreurs: string[] }>
  export async function creer(chemin: string, dossier: boolean): Promise<{ ok: true } | { erreur: string }>
  export async function renommer(ancien: string, nouveau: string): Promise<{ ok: true } | { erreur: string }>
  export async function coller(sources: string[], cible: string): Promise<{ faits: [string, string][]; erreurs: string[] }>  // nomDeCopie, jamais d'écrasement
  export async function fichiersSeuls(chemins: string[]): Promise<string[]>  // garde les fichiers ordinaires
  export async function lireImage(chemin: string): Promise<{ url: string; poids: number } | { erreur: string }>  // data URL, 50 Mo au plus
  ```
  `transferer` : refuse une source pour laquelle `peutDeposer` est faux (erreur « Impossible de déplacer un dossier dans lui-même. ») ; source déjà dans la cible : rien ; nom pris et `conflit` à `null` : erreur sans rien toucher ; `remplacer` : `corbeille(cible/nom)` puis déplacement ; `garder` : `nomDeCopie`. Déplacement par `fs.rename`, et `fs.cp` récursif puis suppression de la source si `rename` rend `EXDEV`.
- Produces (`etat-fichiers.ts` du main) : `brancherEtatFichiers(): { vider: () => void }`. `fichiers.json` dans `app.getPath('userData')`, écrit au plus toutes les 300 ms (même façon que `src/main/workspaces.ts`). Absent : lire `~/.config/herdr-app/shared.json` une fois et `reprendreFichiersDeHerdr` ; illisible : renommé `fichiers.json.illisible` puis reprise. Au chargement : `retirerAbsents(etat, existsSync)`.
- Canaux IPC (tous `ipcMain.handle` sauf mention) : `berger:etat-fichiers` → `EtatFichiers` ; `berger:retenir-fichiers` (`on`, l'état entier) ; `berger:dossier` `{ dossier }` ; `berger:git` `{ racine }` ; `berger:tous-fichiers` `{ racines }` → `FichierRacine[][]` (cache par racine, vidé par la surveillance) ; `berger:surveiller` (`on`, `{ racines }` : surveille exactement ces racines, arrête les autres) → envoie `berger:disque` `{ chemins }` ; `berger:noms-pris` ; `berger:transferer` (sans `corbeille`, branchée sur `shell.trashItem`) ; `berger:creer` ; `berger:renommer-fichier` ; `berger:corbeille` `{ chemins }` → `{ erreurs }` ; `berger:copier-fichiers` `{ chemins }` et `berger:coller` `{ cible }` (presse-papiers de macOS : reprendre les scripts JXA `CLIP_WRITE`/`CLIP_READ` de `explorer.js` lancés par `osascript -l JavaScript`, qui marchent avec le Finder dans les deux sens) ; `berger:copier-chemin` `{ chemin }` (`clipboard.writeText`) ; `berger:finder` (`shell.showItemInFolder`) ; `berger:vscode` (`open -a "Visual Studio Code" <chemin>`) ; `berger:choisir-dossier` → chemin ou `null` (`dialog.showOpenDialog`, `openDirectory`) ; `berger:fichiers-seuls` ; `berger:image`.
- Menu (`menu.ts`) : entre « Berger » et « Édition », « Fichier » avec « Ouvrir un fichier… » (`CmdOrCtrl+O`) : `dialog.showOpenDialog` (`openFile`, `multiSelections`) puis envoie `berger:ouvrir-fichiers` `{ chemins }` à la fenêtre. Mettre à jour le commentaire du menu (⌘O est le seul raccourci qu'il porte).
- Preload : `cheminDe(f: File): string` par `webUtils.getPathForFile`.

- [ ] **Step 1 : écrire les tests qui échouent** (`tests/disque.test.ts`, dans un dossier `berger-essai-` temporaire)

```ts
test('listerDossier : dossiers d’abord, masqués retirés', async () => { /* a.txt, src/, .DS_Store → ['src', 'a.txt'] */ })
test('transferer refuse un nom pris sans choix et ne touche à rien', async () => {
  // cible/a.txt existe (« ancien ») ; source/a.txt (« neuf »)
  const r = await transferer({ sources: [src], cible, copier: false, conflit: null, corbeille })
  expect(r.erreurs).toHaveLength(1)
  expect(readFileSync(join(cible, 'a.txt'), 'utf8')).toBe('ancien')
  expect(existsSync(src)).toBe(true)
})
test('remplacer met l’ancien à la corbeille avant de déplacer', async () => {
  const jetes: string[] = []
  await transferer({ sources: [src], cible, copier: false, conflit: 'remplacer', corbeille: async (c) => { jetes.push(c); renameSync(c, c + '.jete') } })
  expect(jetes).toEqual([join(cible, 'a.txt')])
  expect(readFileSync(join(cible, 'a.txt'), 'utf8')).toBe('neuf')
})
test('garder les deux : « a copie.txt »', async () => { /* conflit 'garder' → cible/a copie.txt */ })
test('copier laisse la source', async () => { /* copier: true */ })
test('un dossier ne va pas dans lui-même', async () => { /* sources [d], cible d/sous → erreur, rien bougé */ })
test('creer et renommer refusent un nom pris', async () => {
  expect(await creer(join(dir, 'a.txt'), false)).toEqual({ erreur: 'Un élément porte déjà ce nom.' })
  expect(await renommer(join(dir, 'b.txt'), join(dir, 'a.txt'))).toEqual({ erreur: 'Un élément porte déjà ce nom.' })
})
test('coller prend un nom libre', async () => { /* coller([dir/a.txt], dir) → dir/a copie.txt */ })
test('tousLesFichiers hors git : sans node_modules ni .git', async () => { /* … */ })
```

Écrire le corps de chaque test (les commentaires disent les fichiers à créer et l'attendu).

- [ ] **Step 2 : lancer, échec** — Run : `npx vitest run tests/disque.test.ts` — Expected : FAIL.
- [ ] **Step 3 : écrire `disque.ts`, `etat-fichiers.ts` (main), brancher les canaux, le menu, le preload.**
- [ ] **Step 4 : lancer, succès** — Run : `npm test && npm run typecheck` — Expected : PASS.
- [ ] **Step 5 : vérifier la reprise sans rien écrire chez Herdr** — copier les fichiers de `~/Library/Application Support/berger/` dans le scratchpad (Global Constraints), noter `shasum ~/.config/herdr-app/shared.json`, lancer `npm run dev` avec `BERGER_TRACE=1` quelques secondes, fermer. Expected : `fichiers.json` créé avec les dossiers, récents et onglets de Herdr par workspace ; `shasum` inchangé.
- [ ] **Step 6 : commit** — `git commit -m "feat(fichiers): disque, fichiers.json et menu Fichier"`

---

### Task 6 : les onglets de fichiers par workspace

**Files :**
- Modify : `src/shared/etat-fenetre.ts` (retirer `fichiers`, ajouter `explorateurMasque: boolean`, défaut `false`), `tests/etat-fenetre.test.ts`, `src/renderer/src/etat.ts`, `src/renderer/src/barre-onglets.ts`, `src/renderer/src/editeur.ts`, `src/renderer/src/main.ts`, `src/renderer/src/workspaces.ts` (supprimer un workspace : `oublierWorkspace`), `src/renderer/src/icones.ts` (`pin`), `src/renderer/assets/main.css`

**Interfaces :**
- Consumes : Tâche 2 en entier, `iconeFichier` (Tâche 1), `berger:etat-fichiers` / `berger:retenir-fichiers` (Tâche 5).
- Produces (fenêtre) :
  ```ts
  // etat.ts
  EtatUi.fichiersWs: EtatFichiers | null            // null tant que non lu ; rien n'est retenu avant
  export function fichiersDuWorkspace(): OngletFichier[]
  export function changerFichiers(f: (e: EtatFichiers, ws: string) => EtatFichiers): void  // no-op sans workspace ouvert
  export function ouvrirChemins(chemins: string[]): void   // ouvrirFichiers + affiche le dernier
  // editeur.ts
  export function suivreDeplacementEditeur(paires: [string, string][]): void  // modèles, `affiche`, `etat().modifies`
  export function oublierFichier(chemin: string): void   // l'actuel `oublier`, exporté
  ```
  `ongletsAffiches()` utilise `fichiersDuWorkspace()` au lieu de `e.fichiers`. `changer` envoie `berger:retenir-fichiers` quand la référence de `fichiersWs` a changé. `ouvrirUnFichier` de `main.ts` est remplacé par `ouvrirChemins([chemin])`.
- Onglet de fichier (maquette `explorateur.html` d) : icône Material (`<img src="./material/<nom>.svg">`, 16 px), nom, dossier en gris quand `libellesOnglets` en donne un, puis à droite : punaise (lucide `pin`) pour un épinglé — un clic désépingle —, point `●` pour un non enregistré (il gagne sur la punaise), sinon la croix. Clic molette : fermer. Clic droit : « Épingler » ou « Désépingler », « Enregistrer » (`⌘S`, inactif pour une image), séparateur, « Fermer » (`⌘W`). Fermer un épinglé le retire aussi.

- [ ] **Step 1 : test qui échoue** dans `tests/etat-fenetre.test.ts` : `lireEtatFenetre({ explorateurMasque: true, fichiers: ['/a'] })` rend `explorateurMasque: true` et n'a pas de clé `fichiers` ; défaut `false`.
- [ ] **Step 2 : lancer, échec** — Run : `npx vitest run tests/etat-fenetre.test.ts` — Expected : FAIL.
- [ ] **Step 3 : écrire le code** (état, barre d'onglets, éditeur, workspaces, CSS).
- [ ] **Step 4 : lancer, succès** — Run : `npm test && npm run typecheck` — Expected : PASS.
- [ ] **Step 5 : voir dans l'application** — dans un dossier `berger-essai-onglets` du scratchpad avec `src/main/index.ts`, `src/renderer/index.ts`, `notes.md` : ouvrir les trois par `berger:scenario-fichier` (ajouter à `scenario.ts` le scénario `onglets`, qui lit la liste `BERGER_SCENARIO_FICHIERS` séparée par `:`), épingler `notes.md` par le menu, modifier le second `index.ts`, capture. Expected (capture lue) : `notes.md` en premier avec la punaise, deux `index.ts` suivis de `main` et `renderer` en gris, le dernier avec un point. Relancer avec `BERGER_CAPTURE` : les trois onglets reviennent, le fichier affiché aussi.
- [ ] **Step 6 : commit** — `git commit -am "feat(fichiers): onglets de fichiers par workspace, épinglés, même nom"`

---

### Task 7 : l'explorateur — affichage

**Files :**
- Create : `src/renderer/src/explorateur.ts`
- Modify : `src/renderer/index.html` (zone `#explorateur` : en-tête « Explorateur » avec les boutons « Ajouter un dossier » et « Tout replier », `#arbre` avec `tabindex="0"`, le message du workspace sans space gardé), `src/renderer/src/colonne.ts` (`annoncerColonne` passe dans `explorateur.ts` sous le nom `annoncer` ; mettre à jour ses appelants), `src/renderer/src/workspaces.ts` (le bouton « Explorateur » bascule `explorateurMasque`, `aria-pressed` et classe `actif` selon l'état), `src/renderer/src/fenetre.ts` (`#explorateur` et son séparateur cachés quand `explorateurMasque`), `src/renderer/src/clavier.ts` (`explorateur.basculer`), `src/renderer/src/main.ts`, `src/renderer/assets/main.css`

**Interfaces :**
- Consumes : `racines`, `basculerDeplie`, `basculerRacine`, `toutReplier`, `ajouterDossier`, `deplacerRacine` (Tâche 2) ; `decoration`, `dossiersAPerimer`, `Entree` (Tâche 1) ; `iconeFichier` ; canaux `berger:dossier`, `berger:git`, `berger:surveiller`, `berger:disque`, `berger:choisir-dossier` (Tâche 5) ; `ouvrirChemins` (Tâche 6).
- Produces : `initExplorateur(): void`, `basculerExplorateur(): void`, `racinesDuWorkspace(): string[]` (utilisée par `⌘P`), `annoncer(texte: string): void`. Racines des spaces : `VueSpace.dossier` de chaque space visible (`spacesVisiblesUi()`), vides retirés.
- Comportement :
  - Chaque racine : chevron, nom du dossier (couleur de la maquette), chemin en gris (`~` pour la maison) ; dépliée sauf si elle est dans `replies` (clic sur la racine : `basculerRacine`).
  - Un dossier déplié est lu par `berger:dossier` (une fois, gardé en cache dans la fenêtre) ; chevron, icône Material ouverte ou fermée, nom, décoration git à droite (lettre ou point) et nom de la couleur git ; ignoré en `#8c8c8c` ; « Dossier limité aux 2 000 premiers éléments » en gris si `tronque`.
  - État git : `berger:git` par racine au chargement et après chaque lot `berger:disque` (au plus une relecture par racine toutes les 500 ms) ; chemin relatif au `depot` pour `decoration`.
  - Surveillance : `berger:surveiller` avec les racines à chaque changement de la liste des racines ; sur `berger:disque`, relire les dossiers de `dossiersAPerimer(chemins, dossiers dépliés)`.
  - Clic sur un fichier : le choisir et `ouvrirChemins([chemin])` ; clic sur un dossier : le choisir et `basculerDeplie`. Clic `⌘` : ajoute ou retire de la sélection (sélection multiple pour glisser et mettre à la corbeille).
  - « Ajouter un dossier » (bouton de l'en-tête et ligne en bas de la liste) : `berger:choisir-dossier` puis `ajouterDossier`. « Tout replier » : `toutReplier` (les racines restent dépliées).
  - Workspace sans space et sans dossier ajouté : « Aucun space dans ce workspace » et le bouton « Ajouter un dossier ».
  - Ne redessiner l'arbre que quand ses données changent (racines, cache des dossiers, état git, sélection, dépliés), pas à chaque `surChangement` : les événements des terminaux arrivent sans cesse.

- [ ] **Step 1 : écrire le code** (pas de test unitaire : toutes les règles viennent des Tâches 1 et 2).
- [ ] **Step 2 : typecheck et tests** — Run : `npm test && npm run typecheck` — Expected : PASS.
- [ ] **Step 3 : voir dans l'application** — dossier `berger-essai-explorateur` du scratchpad : `git init`, un fichier suivi modifié, un non suivi, `node_modules/` et `.gitignore` qui l'ignore, `.DS_Store`. Lancer avec `BERGER_SCENARIO=explorateur` (nouveau, Tâche 9 le complète ; ici : ajoute ce dossier comme racine par le même chemin que le bouton, déplie `node_modules`, capture, crée `nouveau.txt` par Node, capture 1 s après, `⇧⌘E` deux fois avec une capture entre). Expected (captures lues, comparées à `vue-principale.html` dans Chrome) : racine avec son chemin en gris, `M` jaune et `U` vert, point sur le dossier parent, `node_modules` gris, pas de `.DS_Store`, icônes Material, lignes de 22 px ; `nouveau.txt` apparaît sans rafraîchir ; explorateur caché puis revenu, l'état retenu après relance.
- [ ] **Step 4 : commit** — `git commit -am "feat(fichiers): explorateur, racines, couleurs git, surveillance du disque"`

---

### Task 8 : l'explorateur — ranger les fichiers

**Files :**
- Modify : `src/renderer/src/explorateur.ts`, `src/renderer/src/clavier.ts` (actions `explorateur.*`), `src/renderer/src/main.ts` (dépôt du Finder hors explorateur), `src/renderer/src/icones.ts`, `src/renderer/assets/main.css`

**Interfaces :**
- Consumes : canaux de la Tâche 5 (`berger:creer`, `berger:renommer-fichier`, `berger:noms-pris`, `berger:transferer`, `berger:copier-fichiers`, `berger:coller`, `berger:copier-chemin`, `berger:finder`, `berger:vscode`, `berger:corbeille`, `berger:fichiers-seuls`), `window.berger.cheminDe` ; `peutDeposer`, `dossierDeCollage` (Tâche 1) ; `suivreDeplacement`, `retirerDossier`, `deplacerRacine` (Tâche 2) ; `suivreDeplacementEditeur`, `oublierFichier`, `modifie` (éditeur) ; `ouvrirDialogue` (`dialogue.ts`), `ouvrirMenu` (`menus.ts`), `berger:question`.
- Produces : `renommerChoisi()`, `copierChoisis()`, `collerIci()`, `copierCheminChoisi()`, `corbeilleChoisis()` (appelées par `clavier.ts`).
- Comportement :
  - Menu du clic droit (maquette `explorateur.html` a, mêmes icônes) : « Nouveau fichier », « Nouveau dossier », séparateur, « Renommer » (F2), « Copier » (`⌘C`), « Coller » (`⌘V`), « Copier le chemin » (`⌥⌘C`), séparateur, « Afficher dans le Finder », « Ouvrir dans VS Code », séparateur, « Mettre à la corbeille » (`⌘⌫`, en rose). Sur une racine ajoutée à la main, en plus, « Retirer de l'explorateur » (`retirerDossier`) ; jamais sur la racine d'un space.
  - Nouveau fichier / dossier : ligne avec un champ dans le dossier visé (le dossier cliqué, ou celui du fichier cliqué), déplié d'abord ; `↵` valide (`berger:creer`, un nouveau fichier s'ouvre), `Échap` ou perte du clavier annule ; erreur affichée par `annoncer`. Renommer : champ à la place du nom, nom sans extension choisi ; `↵` → `berger:renommer-fichier`, puis `suivreDeplacement` et `suivreDeplacementEditeur` avec la paire.
  - Glisser-déposer HTML dans l'arbre : glisser la sélection (ou la ligne saisie si elle n'est pas choisie) ; le dossier sous le pointeur (ou le dossier du fichier survolé) est surligné avec son contenu (maquette b) ; au dépôt : sources refusées par `peutDeposer` → `annoncer('Impossible de déplacer un dossier dans lui-même.')` ; `berger:noms-pris` ; si des noms sont pris, `berger:question` « « nom » existe déjà dans « dossier ». » (ou « N éléments existent déjà… ») boutons « Remplacer », « Garder les deux », « Annuler » ; `⌥` au dépôt copie ; puis `berger:transferer`, et pour un déplacement `suivreDeplacement` + `suivreDeplacementEditeur` avec `faits`. Glisser une racine sur une autre racine les réordonne (`deplacerRacine`).
  - Dépôt depuis le Finder sur un dossier de l'arbre : copie (même question en cas de nom pris). Ailleurs dans la fenêtre (`main.ts`) : `berger:fichiers-seuls` puis `ouvrirChemins` (le dernier est affiché). Le dépôt dans l'arbre arrête la propagation.
  - Copier / coller : `berger:copier-fichiers` avec la sélection ; coller dans `dossierDeCollage(choisi)` par `berger:coller`.
  - Corbeille : `ouvrirDialogue({ titre: 'Supprimer « nom » ?', texte: 'Il sera placé dans la corbeille.', bouton: { libelle: 'Mettre à la corbeille', danger: true } })` (plusieurs éléments : « Supprimer N éléments ? », « Ils seront placés dans la corbeille. ») ; sur accord `berger:corbeille` ; puis fermer les onglets sous ces chemins qui n'ont pas de modification en attente (`modifie` faux) : `fermerFichierWs` + `oublierFichier`.

- [ ] **Step 1 : écrire le code.**
- [ ] **Step 2 : typecheck et tests** — Run : `npm test && npm run typecheck` — Expected : PASS.
- [ ] **Step 3 : commit** — `git commit -am "feat(fichiers): menu, renommer, copier-coller, glisser-déposer, corbeille"` (la vérification dans l'application est à la Tâche 9).

---

### Task 9 : `⌘P`, visionneuse, ouverture de partout, scénario et bilan

**Files :**
- Create : `src/renderer/src/recherche-fichiers.ts`, `src/renderer/src/visionneuse.ts`, `docs/notes/bilan-phase4-fichiers.md`
- Modify : `src/renderer/index.html` (`#recherche-fichiers` en surcouche, `#zone-image` à côté de `#zone-fichier` : bandeau du chemin, image, pied « 1200 × 630 · 48 Ko »), `src/renderer/src/main.ts` (une image s'affiche dans la visionneuse au lieu de Monaco ; `berger:ouvrir-fichiers` → `ouvrirChemins`), `src/renderer/src/clavier.ts` (`fichier.rechercher`), `src/main/scenario.ts`, `CLAUDE.md` (scénario `fichiers`), `docs/suivi/ROADMAP.md`, `docs/COPIES.md`, `src/renderer/assets/main.css`

**Interfaces :**
- Consumes : `chercher`, `emplacement`, `fusionner`, `cheminDe` (Tâche 3) ; `berger:tous-fichiers`, `berger:image` (Tâche 5) ; `racinesDuWorkspace` (Tâche 7) ; `ouvrirChemins`, `deWorkspace(...).recents` (Tâche 6) ; `estImage` (Tâche 2).
- Produces : `ouvrirRechercheFichiers(): void` ; `afficherImage(chemin: string): Promise<boolean>` (faux si illisible : l'onglet est retiré avec `annoncer`, comme un fichier illisible).
- `⌘P` (maquette `recherche-fichiers.html`) : fenêtre en haut au centre, champ, champ vide → titre « Récents » et les récents ; sinon `chercher` sur `fusionner(berger:tous-fichiers)` : icône Material, nom avec les lettres trouvées surlignées, `emplacement` en gris. La liste des fichiers est demandée à l'ouverture (le cache du main répond tout de suite après la première fois) ; tant qu'elle n'est pas arrivée, les récents restent affichés. `↑`/`↓`, `↵` ouvre (`ouvrirChemins`), `Échap` ou clic dehors ferme.
- Visionneuse (maquette `explorateur.html`, dernière vue) : image centrée sur un damier discret, chemin en bandeau, dimensions (`naturalWidth × naturalHeight`) et poids (Ko / Mo, virgule française) en bas.
- Scénario `BERGER_SCENARIO=fichiers` avec `BERGER_SCENARIO_DOSSIER` (refusé si le chemin ne contient pas `berger-essai`) et `BERGER_SCENARIO_SORTIE` : ajoute le dossier comme racine ; crée `a.txt` puis le dossier `notes` sur place ; renomme `a.txt` en `b.txt` ; copie / colle `b.txt` (→ `b copie.txt`) ; glisse `b.txt` sur `notes` puis `b copie.txt` sur `notes` (question → « Garder les deux ») par le débogueur de `webContents` (CDP `Input.dispatchDragEvent`, avec `Input.setInterceptDrags` pour le glisser interne) ; dépose un fichier « du Finder » (`data.files`) sur `notes` et un autre sur l'éditeur ; ouvre une image ; `⌘P`, tape `bt`, `↵` ; ouvre deux `index.ts` ; épingle l'un ; clic molette sur un autre ; met `notes/b.txt` à la corbeille (dialogue accepté) ; retire la racine à la fin. Une capture et une ligne de journal par étape. La question de conflit et `⌘O` (sélecteur de macOS) se voient aussi : `BERGER_SCENARIO_REPONSE` répond à la question ; `⌘O` est vérifié en ouvrant le menu par `Menu.getApplicationMenu()` et une capture d'écran de macOS (`screencapture`) — sinon le noter « à vérifier par Antoine » au bilan.

- [ ] **Step 1 : écrire `recherche-fichiers.ts`, `visionneuse.ts`, le branchement dans `main.ts` et `clavier.ts`.**
- [ ] **Step 2 : typecheck et tests** — Run : `npm test && npm run typecheck` — Expected : PASS.
- [ ] **Step 3 : écrire le scénario `fichiers`** et sa ligne dans `CLAUDE.md`.
- [ ] **Step 4 : jouer le scénario** sur un dossier `berger-essai-fichiers` du scratchpad (avec `src/main/index.ts`, `src/renderer/index.ts`, `logo.png`, un dépôt git), copies des fichiers de données prises avant. Expected (chaque capture lue, comparée dans Chrome à `explorateur.html` a à e et `recherche-fichiers.html`) : chaque étape visible comme dans la maquette ; sur le disque à la fin : `notes/b.txt` dans la corbeille de macOS (`ls ~/.Trash`), `notes/b copie.txt` et `notes/b copie 2.txt` présents si la question a répondu « Garder les deux » ; aucun fichier hors du dossier d'essai touché.
- [ ] **Step 5 : relancer** avec `BERGER_CAPTURE` : les onglets de fichiers (épinglé compris) et le fichier affiché reviennent ; supprimer un des fichiers ouverts pendant que Berger est fermé, relancer : il a disparu sans message.
- [ ] **Step 6 : ranger** : remettre `workspaces.json`, `etat-fenetre.json`, et renommer le `fichiers.json` des essais en `fichiers.json.essai-phase4` ; vérifier `shasum ~/.config/herdr-app/shared.json` inchangé.
- [ ] **Step 7 : bilan et feuille de route** — `docs/notes/bilan-phase4-fichiers.md` (même forme que celui de la phase 3 : ce qui marche, vu dans l'application ; décisions prises, dont « Retirer de l'explorateur » seulement sur une racine ajoutée, le collage qui prend un nom libre, « Remplacer » qui passe par la corbeille, le fichier affiché retenu par `etat-fenetre.json` et non par l'état des fichiers, les onglets de la phase 3 (liste globale) non repris ; à vérifier par Antoine, dont ses fichiers de Herdr au premier lancement). `ROADMAP.md` : phase 4 « Faite, à vérifier par Antoine (bilan : …) ». `docs/COPIES.md` complet.
- [ ] **Step 8 : vérification finale** — Run : `npm test && npm run typecheck && npm run lint` — Expected : PASS.
- [ ] **Step 9 : commit et PR** — `git commit -am "feat(fichiers): ⌘P, visionneuse, ouverture de partout, bilan de la phase 4"`, `git push -u origin phase4-fichiers`, PR vers `develop` « Phase 4 : fichiers ».
