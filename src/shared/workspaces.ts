// Règles pures des workspaces : des groupes de spaces, choisis dans la barre
// de gauche. Reprises de `workspaces.js` du mod `antoine`,
// sans ce qui servait à suivre le space affiché par Herdr (`seen`, `hold`) :
// Berger choisit lui-même le space affiché.
import type { EtatAgent } from './libelles'

export type { EtatAgent }
export type Workspace = {
  id: string
  nom: string
  emoji: string
  spaces: string[]
  dernierSpace: string | null
}
export type EtatWorkspaces = { liste: Workspace[]; ouvert: string }

let compteur = 0
function nouvelId(liste: Workspace[]): string {
  let id: string
  do id = 'ws-' + Date.now().toString(36) + (compteur++ ? '-' + compteur : '')
  while (liste.some((w) => w.id === id))
  return id
}

const objet = (x: unknown): Record<string, unknown> | null =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null
const chaines = (x: unknown): string[] | null =>
  Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : null

const leOuvert = (e: EtatWorkspaces): Workspace =>
  e.liste.find((w) => w.id === e.ouvert) ?? e.liste[0]

// Le space à afficher en ouvrant un workspace.
const entree = (w: Workspace): string | null =>
  w.dernierSpace && w.spaces.includes(w.dernierSpace) ? w.dernierSpace : (w.spaces[0] ?? null)

export function etatInitial(spaces: string[]): EtatWorkspaces {
  const id = nouvelId([])
  return {
    liste: [{ id, nom: 'Pro', emoji: '💼', spaces: [...spaces], dernierSpace: null }],
    ouvert: id
  }
}

// `brut` : la valeur de la clé `antoine.workspaces` de Herdr
// ({ list: [{ id, name, emoji, spaces, lastSpace }], active }).
export function reprendreDeHerdr(brut: unknown, spaces: string[]): EtatWorkspaces {
  const o = objet(brut)
  const liste: Workspace[] = []
  for (const x of Array.isArray(o?.['list']) ? (o['list'] as unknown[]) : []) {
    const w = objet(x)
    const ids = chaines(w?.['spaces'])
    if (!w || typeof w['id'] !== 'string' || typeof w['name'] !== 'string' || !ids) continue
    if (liste.some((v) => v.id === w['id'])) continue
    liste.push({
      id: w['id'],
      nom: w['name'],
      emoji: typeof w['emoji'] === 'string' && w['emoji'] ? w['emoji'] : '📁',
      spaces: [...new Set(ids)],
      dernierSpace: typeof w['lastSpace'] === 'string' ? w['lastSpace'] : null
    })
  }
  if (!liste.length) return etatInitial(spaces)
  const actif = typeof o?.['active'] === 'string' ? o['active'] : ''
  return rapprocher(
    { liste, ouvert: liste.some((w) => w.id === actif) ? actif : liste[0].id },
    spaces
  )
}

// Le contenu de `workspaces.json` ; null s'il n'a pas la bonne forme.
export function lireEtatWorkspaces(brut: unknown): EtatWorkspaces | null {
  const o = objet(brut)
  if (!o || typeof o['ouvert'] !== 'string' || !Array.isArray(o['liste'])) return null
  const liste: Workspace[] = []
  for (const x of o['liste']) {
    const w = objet(x)
    if (!w) return null
    const { id, nom, emoji, spaces, dernierSpace } = w
    if (typeof id !== 'string' || typeof nom !== 'string' || typeof emoji !== 'string') return null
    if (!Array.isArray(spaces) || spaces.some((s) => typeof s !== 'string')) return null
    if (dernierSpace !== null && typeof dernierSpace !== 'string') return null
    liste.push({ id, nom, emoji, spaces: [...(spaces as string[])], dernierSpace })
  }
  if (!liste.length) return null
  return { liste, ouvert: o['ouvert'] }
}

const egaux = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

// Les workspaces face aux spaces du document : les spaces fermés partent, les
// spaces rangés nulle part rejoignent l'ouvert. Le même objet si rien ne change.
export function rapprocher(e: EtatWorkspaces, spaces: string[]): EtatWorkspaces {
  const vivants = new Set(spaces)
  const ouvert = e.liste.some((w) => w.id === e.ouvert) ? e.ouvert : e.liste[0].id
  const liste = e.liste.map((w) => {
    const gardes = w.spaces.filter((s) => vivants.has(s))
    return { ...w, spaces: gardes }
  })
  const ranges = new Set(liste.flatMap((w) => w.spaces))
  const ici = liste.find((w) => w.id === ouvert)!
  for (const s of spaces)
    if (!ranges.has(s)) {
      ici.spaces.push(s)
      ranges.add(s)
    }
  for (const w of liste)
    if (w.dernierSpace && !w.spaces.includes(w.dernierSpace)) w.dernierSpace = null
  const change =
    ouvert !== e.ouvert ||
    liste.some(
      (w, i) => !egaux(w.spaces, e.liste[i].spaces) || w.dernierSpace !== e.liste[i].dernierSpace
    )
  return change ? { liste, ouvert } : e
}

export function ouvrir(
  e: EtatWorkspaces,
  id: string
): { etat: EtatWorkspaces; afficher: string | null } {
  const w = e.liste.find((x) => x.id === id)
  if (!w) return { etat: e, afficher: null }
  return { etat: w.id === e.ouvert ? e : { ...e, ouvert: w.id }, afficher: entree(w) }
}

export function creer(e: EtatWorkspaces, nom: string, emoji: string, id?: string): EtatWorkspaces {
  const nouvel = id && !e.liste.some((w) => w.id === id) ? id : nouvelId(e.liste)
  return {
    liste: [...e.liste, { id: nouvel, nom: nom.trim(), emoji, spaces: [], dernierSpace: null }],
    ouvert: nouvel
  }
}

function changerWorkspace(
  e: EtatWorkspaces,
  id: string,
  f: (w: Workspace) => Workspace
): EtatWorkspaces {
  const i = e.liste.findIndex((w) => w.id === id)
  if (i < 0) return e
  const nouveau = f(e.liste[i])
  if (nouveau === e.liste[i]) return e
  const liste = [...e.liste]
  liste[i] = nouveau
  return { ...e, liste }
}

export function renommer(e: EtatWorkspaces, id: string, nom: string): EtatWorkspaces {
  const n = nom.trim()
  if (!n) return e
  return changerWorkspace(e, id, (w) => (w.nom === n ? w : { ...w, nom: n }))
}

export function changerEmoji(e: EtatWorkspaces, id: string, emoji: string): EtatWorkspaces {
  if (!emoji) return e
  return changerWorkspace(e, id, (w) => (w.emoji === emoji ? w : { ...w, emoji }))
}

// Retire un workspace ; `fermer` : ses spaces à ce moment (liste figée), que
// l'appelant ferme. Le dernier workspace ne se supprime pas.
export function supprimer(
  e: EtatWorkspaces,
  id: string
): { etat: EtatWorkspaces; fermer: string[]; afficher: string | null } {
  const i = e.liste.findIndex((w) => w.id === id)
  if (i < 0 || e.liste.length < 2) return { etat: e, fermer: [], afficher: null }
  const liste = e.liste.filter((w) => w.id !== id)
  const fermer = [...e.liste[i].spaces]
  if (e.ouvert !== id) return { etat: { liste, ouvert: e.ouvert }, fermer, afficher: null }
  const voisin = liste[i] ?? liste[i - 1]
  return { etat: { liste, ouvert: voisin.id }, fermer, afficher: entree(voisin) }
}

const borner = (index: number, n: number): number => Math.max(0, Math.min(index, n))

function deplacerDans<T>(liste: T[], i: number, index: number): T[] {
  const r = [...liste]
  const [x] = r.splice(i, 1)
  r.splice(borner(index, r.length), 0, x)
  return r
}

export function deplacer(e: EtatWorkspaces, id: string, index: number): EtatWorkspaces {
  const i = e.liste.findIndex((w) => w.id === id)
  if (i < 0) return e
  return { ...e, liste: deplacerDans(e.liste, i, index) }
}

// Déplace un space dans l'ordre de son workspace.
export function deplacerSpace(e: EtatWorkspaces, space: string, index: number): EtatWorkspaces {
  const id = workspaceDe(e, space)
  if (!id) return e
  return changerWorkspace(e, id, (w) => ({
    ...w,
    spaces: deplacerDans(w.spaces, w.spaces.indexOf(space), index)
  }))
}

export function spaceVu(e: EtatWorkspaces, space: string): EtatWorkspaces {
  const w = leOuvert(e)
  if (!w.spaces.includes(space) || w.dernierSpace === space) return e
  return changerWorkspace(e, w.id, (x) => ({ ...x, dernierSpace: space }))
}

// Les spaces à montrer : ceux du workspace ouvert dans son ordre, puis ceux
// rangés nulle part (pour ne jamais perdre un terminal), dans l'ordre de `spaces`.
export function spacesVisibles(e: EtatWorkspaces, spaces: string[]): string[] {
  const existants = new Set(spaces)
  const ranges = new Set(e.liste.flatMap((w) => w.spaces))
  return [
    ...leOuvert(e).spaces.filter((s) => existants.has(s)),
    ...spaces.filter((s) => !ranges.has(s))
  ]
}

export function workspaceDe(e: EtatWorkspaces, space: string): string | null {
  return e.liste.find((w) => w.spaces.includes(space))?.id ?? null
}

const RANG: Record<'attente' | 'fini' | 'travail', number> = { attente: 3, fini: 2, travail: 1 }

// L'état le plus urgent des spaces d'un workspace et des spaces rangés nulle part.
export function etatDuWorkspace(
  e: EtatWorkspaces,
  id: string,
  etatParSpace: Record<string, EtatAgent>
): EtatAgent {
  const w = e.liste.find((x) => x.id === id)
  if (!w) return null
  const ranges = new Set(e.liste.flatMap((x) => x.spaces))
  let meilleur: EtatAgent = null
  for (const [space, etat] of Object.entries(etatParSpace)) {
    if (!etat || !(w.spaces.includes(space) || !ranges.has(space))) continue
    if (!meilleur || RANG[etat] > RANG[meilleur]) meilleur = etat
  }
  return meilleur
}

export function premierEmoji(texte: string): string {
  const t = texte.trim()
  if (!t) return ''
  const [premier] = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)
  return premier?.segment ?? ''
}

// Les ids des spaces d'un document `herdr-app` ; null tant que le document n'a
// pas été lu (pas de tableau `spaces`) : rapprocher à ce moment viderait tout.
export function spacesDuDoc(doc: unknown): string[] | null {
  const spaces = objet(doc)?.['spaces']
  if (!Array.isArray(spaces)) return null
  return spaces.flatMap((s) => {
    const id = objet(s)?.['id']
    return typeof id === 'string' ? [id] : []
  })
}
