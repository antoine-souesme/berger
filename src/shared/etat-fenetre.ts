// Règles pures de l'état que Berger retient d'une session à l'autre.
import type { TriAgents } from './agents'
import type { RefOnglet } from './onglets'

export type EtatFenetre = {
  largeurs: { explorateur: number; spaces: number }
  colonneMasquee: boolean
  space: string | null
  onglet: RefOnglet | null
  explorateurMasque: boolean
  triAgents: TriAgents
}

export const LARGEUR_MIN = 160
export const LARGEUR_MAX = 600

export const ETAT_PAR_DEFAUT: EtatFenetre = {
  largeurs: { explorateur: 274, spaces: 250 },
  colonneMasquee: false,
  space: null,
  onglet: null,
  explorateurMasque: false,
  triAgents: 'spaces'
}

export const bornerLargeur = (n: number): number =>
  Math.round(Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, n)))

const objet = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {}

function largeur(x: unknown, defaut: number): number {
  return typeof x === 'number' && Number.isFinite(x) ? bornerLargeur(x) : defaut
}

function onglet(x: unknown): RefOnglet | null {
  const o = objet(x)
  if (o['type'] === 'terminal' && typeof o['id'] === 'string')
    return { type: 'terminal', id: o['id'] }
  if (o['type'] === 'fichier' && typeof o['chemin'] === 'string')
    return { type: 'fichier', chemin: o['chemin'] }
  return null
}

export function lireEtatFenetre(brut: unknown): EtatFenetre {
  const e = objet(brut)
  const l = objet(e['largeurs'])
  const d = ETAT_PAR_DEFAUT
  return {
    largeurs: {
      explorateur: largeur(l['explorateur'], d.largeurs.explorateur),
      spaces: largeur(l['spaces'], d.largeurs.spaces)
    },
    colonneMasquee: typeof e['colonneMasquee'] === 'boolean' ? e['colonneMasquee'] : false,
    space: typeof e['space'] === 'string' ? e['space'] : null,
    onglet: onglet(e['onglet']),
    explorateurMasque: e['explorateurMasque'] === true,
    triAgents: e['triAgents'] === 'urgence' ? 'urgence' : 'spaces'
  }
}
