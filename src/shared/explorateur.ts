// Règles pures de l'explorateur : fichiers masqués, tri, couleurs git,
// copier-coller et glisser-déposer, dossiers à relire.
// Repris et réécrits de `git.js`, `clip.js`, `files.js` (`staleDirs`) et des
// règles d'affichage de `explorer.js` du mod `antoine` (voir docs/COPIES.md).

// Masqués comme le `files.exclude` par défaut de VS Code.
export const MASQUES: ReadonlySet<string> = new Set([
  '.git',
  '.svn',
  '.hg',
  'CVS',
  '.DS_Store',
  'Thumbs.db'
])

export type Entree = { nom: string; dossier: boolean; ignore: boolean }

export function trierEntrees(entrees: Entree[]): Entree[] {
  return [...entrees].sort((a, b) =>
    a.dossier === b.dossier ? a.nom.localeCompare(b.nom) : a.dossier ? -1 : 1
  )
}

export type GenreGit = 'conflit' | 'supprime' | 'modifie' | 'ajoute' | 'renomme' | 'nonSuivi'

// Couleurs de VS Code, de la plus importante à la moins importante (un
// dossier prend la couleur du changement le plus important de son contenu).
const GENRES: [GenreGit, string, string][] = [
  ['conflit', '!', '#e4676b'],
  ['supprime', 'D', '#c74e39'],
  ['modifie', 'M', '#e2c08d'],
  ['ajoute', 'A', '#81b88b'],
  ['renomme', 'R', '#73c991'],
  ['nonSuivi', 'U', '#73c991']
]
const RANG = new Map(GENRES.map(([g], i) => [g, i]))
const CONFLITS = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'])
const PAR_LETTRE: Record<string, GenreGit> = {
  M: 'modifie',
  T: 'modifie',
  A: 'ajoute',
  D: 'supprime',
  R: 'renomme',
  C: 'ajoute'
}

function genreDe(xy: string): GenreGit {
  if (xy === '??') return 'nonSuivi'
  if (CONFLITS.has(xy)) return 'conflit'
  // L'arbre de travail gagne sur l'index, comme dans VS Code.
  const c = xy[1] !== ' ' ? xy[1] : xy[0]
  return PAR_LETTRE[c] ?? 'modifie'
}

// Sortie de `git status --porcelain -z` : [chemin relatif au dépôt, genre].
// Un chemin qui finit par « / » est un dossier non suivi entier.
export function lireStatutGit(sortie: string): [string, GenreGit][] {
  const parts = sortie.split('\0')
  const r: [string, GenreGit][] = []
  for (let i = 0; i < parts.length; i++) {
    const e = parts[i]
    if (e.length < 4) continue
    const xy = e.slice(0, 2)
    r.push([e.slice(3), genreDe(xy)])
    if (xy[0] === 'R' || xy[0] === 'C') i++ // l'ancien chemin suit
  }
  return r
}

export type Decoration = { genre: GenreGit; lettre: string; couleur: string }

// La décoration d'un chemin relatif au dépôt (« » : le dépôt lui-même), ou null.
export function decoration(
  statut: [string, GenreGit][],
  relatif: string,
  dossier: boolean
): Decoration | null {
  let meilleur: GenreGit | null = null
  for (const [p, genre] of statut) {
    const finDossier = p.endsWith('/')
    const touche =
      p === relatif ||
      (finDossier && (relatif + '/').startsWith(p)) ||
      (dossier && (relatif === '' || p.startsWith(relatif + '/')))
    if (touche && (meilleur === null || RANG.get(genre)! < RANG.get(meilleur)!)) meilleur = genre
  }
  if (meilleur === null) return null
  const [, lettre, couleur] = GENRES[RANG.get(meilleur)!]
  return { genre: meilleur, lettre: dossier ? '•' : lettre, couleur }
}

// Le nom que prend un élément collé dans un dossier qui contient déjà `pris` :
// « a.txt », puis « a copie.txt », « a copie 2.txt »… comme le Finder.
export function nomDeCopie(nom: string, dossier: boolean, pris: Set<string>): string {
  if (!pris.has(nom)) return nom
  const point = dossier ? -1 : nom.lastIndexOf('.')
  const [base, ext] = point > 0 ? [nom.slice(0, point), nom.slice(point)] : [nom, '']
  for (let n = 1; ; n++) {
    const essai = `${base} copie${n > 1 ? ` ${n}` : ''}${ext}`
    if (!pris.has(essai)) return essai
  }
}

const parent = (chemin: string): string => chemin.slice(0, chemin.lastIndexOf('/')) || '/'

// Le dossier où l'on colle : le dossier choisi, ou celui du fichier choisi.
export function dossierDeCollage(choisi: { chemin: string; dossier: boolean }): string {
  return choisi.dossier ? choisi.chemin : parent(choisi.chemin)
}

// Un dossier ne va ni dans lui-même ni dans un de ses sous-dossiers.
export function peutDeposer(source: string, dossierCible: string): boolean {
  return dossierCible !== source && !dossierCible.startsWith(source + '/')
}

// Les dossiers affichés à relire après ces changements du disque : le parent
// de chaque chemin, et le chemin lui-même quand c'est un dossier affiché.
// Ce qui change dans .git ne touche jamais la liste.
export function dossiersAPerimer(changes: string[], affiches: string[]): string[] {
  const vus = new Set(affiches)
  const r = new Set<string>()
  for (const c of changes) {
    if (c.includes('/.git/') || c.endsWith('/.git')) continue
    const p = parent(c)
    if (vus.has(p)) r.add(p)
    if (vus.has(c)) r.add(c)
  }
  return [...r]
}
