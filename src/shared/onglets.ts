// Règles pures de la barre d'onglets : terminaux du space puis fichiers,
// onglet voisin, onglets de fichiers.
// Les règles des onglets de fichiers s'inspirent de `files.js` du mod
// `antoine`.
import type { VueOnglet } from './spaces'

export type RefOnglet = { type: 'terminal'; id: string } | { type: 'fichier'; chemin: string }

export function memeOnglet(a: RefOnglet | null, b: RefOnglet | null): boolean {
  if (!a || !b) return a === b
  if (a.type === 'terminal') return b.type === 'terminal' && a.id === b.id
  return b.type === 'fichier' && a.chemin === b.chemin
}

export function barre(onglets: VueOnglet[], fichiers: string[]): RefOnglet[] {
  return [
    ...onglets.map((o): RefOnglet => ({ type: 'terminal', id: o.id })),
    ...fichiers.map((chemin): RefOnglet => ({ type: 'fichier', chemin }))
  ]
}

const indexDe = (liste: RefOnglet[], o: RefOnglet | null): number =>
  liste.findIndex((x) => memeOnglet(x, o))

export function ongletVoisin(
  liste: RefOnglet[],
  actif: RefOnglet | null,
  pas: 1 | -1
): RefOnglet | null {
  if (liste.length === 0) return null
  const i = indexDe(liste, actif)
  if (i < 0) return pas === 1 ? liste[0] : liste[liste.length - 1]
  return liste[(i + pas + liste.length) % liste.length]
}

export function ongletN(liste: RefOnglet[], n: number): RefOnglet | null {
  return n >= 1 && n <= liste.length ? liste[n - 1] : null
}

export function apresFermeture(liste: RefOnglet[], ferme: RefOnglet): RefOnglet | null {
  const i = indexDe(liste, ferme)
  if (i < 0) return liste[0] ?? null
  return liste[i + 1] ?? liste[i - 1] ?? null
}

export function ouvrirFichier(fichiers: string[], chemin: string): string[] {
  return fichiers.includes(chemin) ? fichiers : [...fichiers, chemin]
}

export function fermerFichier(fichiers: string[], chemin: string): string[] {
  return fichiers.filter((f) => f !== chemin)
}

export type PlaceAgent = { space: string; onglet: string; panneau: string; adresse: string }
