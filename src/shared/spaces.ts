// Règles pures : du document `herdr-app` et des terminaux du core à la vue
// affichée par Berger (spaces, onglets et leurs arbres, terminaux).
import { cleVu } from './vus'
import type { Noeud } from './arbre'
import {
  dossierAffiche,
  etatAgent,
  nomOnglet,
  plusPressant,
  programme,
  titreAgent,
  type EtatAgent,
  type Icone
} from './libelles'

export type TerminalCore = {
  address: string
  name: string | null
  title: string
  cwd: string
  state: string
  status?: { state: string; app?: string; title?: string } | null
  /** Quand le mot d'état a changé pour la dernière fois (ms). */
  status_ms?: number | null
  /** Monte chaque fois que le statut quitte `working`. */
  turn?: number
  /** Le terminal qui l'a lancé (`hc run`). */
  parent?: string | null
  foreground?: { cwd: string; name?: string; argv?: string[] } | null
  labels: Record<string, string>
  argv?: string[]
}

export type VueTerminal = {
  adresse: string
  libelle: string
  etat: string
  programme: { nom: string; icone: Icone }
  dossier: string
  /** Chemin complet du dossier actuel (pour lancer un terminal à côté). */
  cwd: string
  agent: EtatAgent
  /** Un programme qui donne son état (agent), même au repos. */
  estAgent: boolean
  vivant: boolean
  clicsDroitsAuProgramme: boolean
  parent: string | null
  /** Depuis quand il est dans son état (ms), null si inconnu. */
  depuis: number | null
  titre: string
}
export type VueOnglet = { id: string; nom: string; racine: Noeud; agent: EtatAgent }
export type VueSpace = {
  id: string
  nom: string
  dossier: string
  branche?: string
  /** Commits à pousser vers l'amont. */
  aPousser?: number
  onglets: VueOnglet[]
  terminaux: VueTerminal[]
}
export type Vue = {
  spaces: VueSpace[]
  autres: VueTerminal[]
  terminaux: Record<string, VueTerminal>
}

export const VUE_VIDE: Vue = { spaces: [], autres: [], terminaux: {} }

type OngletDoc = { id: string; name?: string; root?: unknown }
type SpaceDoc = { id: string; name?: string; folder?: string; tabs?: OngletDoc[] }

const ETATS: Record<string, string> = {
  working: 'au travail',
  idle: 'en attente',
  blocked: 'bloqué',
  done: 'fini',
  error: 'erreur'
}

export function terminauxDeLArbre(noeud: unknown): string[] {
  if (!noeud || typeof noeud !== 'object') return []
  const n = noeud as { type?: string; content?: { terminal?: string }; children?: unknown[] }
  if (n.type === 'block') return n.content?.terminal ? [n.content.terminal] : []
  return (n.children ?? []).flatMap(terminauxDeLArbre)
}

export function libelleEtat(t: TerminalCore): string {
  if (t.state === 'finished') return 'terminé'
  const etat = t.status?.state
  if (!etat) return ''
  return ETATS[etat] ?? etat
}

function adressesDuSpace(space: SpaceDoc): string[] {
  return (space.tabs ?? []).flatMap((onglet) => terminauxDeLArbre(onglet.root))
}

export function dossierDuSpace(space: SpaceDoc, terminaux: Map<string, TerminalCore>): string {
  const premier = adressesDuSpace(space)
    .map((a) => terminaux.get(a))
    .find((t) => t !== undefined)
  return premier?.foreground?.cwd || premier?.cwd || space.folder || ''
}

function vueTerminal(t: TerminalCore, maison: string, vu: boolean): VueTerminal {
  const prog = programme(t)
  const cwd = t.foreground?.cwd || t.cwd || ''
  const vivant = t.state === 'live'
  return {
    adresse: t.address,
    libelle: t.name || prog.nom,
    etat: libelleEtat(t),
    programme: prog,
    dossier: dossierAffiche(cwd, maison),
    cwd,
    agent: etatAgent(t, vu),
    estAgent: vivant && !!t.status?.state,
    vivant,
    clicsDroitsAuProgramme: t.labels?.['herdr.right-click'] === 'program',
    parent: t.parent ?? null,
    depuis: typeof t.status_ms === 'number' ? t.status_ms : null,
    titre: titreAgent(t)
  }
}

function dernierSegment(chemin: string): string {
  return chemin.split('/').filter(Boolean).pop() ?? chemin
}

export function construireVue(
  doc: unknown,
  terminaux: TerminalCore[],
  maison = '',
  vus: ReadonlySet<string> = new Set()
): Vue {
  const parAdresse = new Map(terminaux.map((t) => [t.address, t]))
  const vues: Record<string, VueTerminal> = {}
  for (const t of terminaux) {
    const cle = cleVu(t)
    vues[t.address] = vueTerminal(t, maison, cle !== null && vus.has(cle))
  }
  const spacesDoc = ((doc as { spaces?: SpaceDoc[] } | null)?.spaces ?? []) as SpaceDoc[]
  const ranges = new Set<string>()
  const spaces = spacesDoc.map((space) => {
    const adresses = adressesDuSpace(space).filter((a) => parAdresse.has(a))
    adresses.forEach((a) => ranges.add(a))
    const dossier = dossierDuSpace(space, parAdresse)
    return {
      id: space.id,
      nom: space.name || dernierSegment(dossier),
      dossier,
      onglets: (space.tabs ?? []).map((onglet, place) => ({
        id: onglet.id,
        nom: nomOnglet(onglet.name, place),
        racine: (onglet.root ?? { type: 'row', id: onglet.id, children: [] }) as Noeud,
        agent: plusPressant(terminauxDeLArbre(onglet.root).map((a) => vues[a]?.agent ?? null))
      })),
      terminaux: adresses.map((a) => vues[a])
    }
  })
  const autres = terminaux
    .filter((t) => t.state === 'live' && !ranges.has(t.address))
    .map((t) => vues[t.address])
  return { spaces, autres, terminaux: vues }
}
