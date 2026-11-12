// Règles pures : du document `herdr-app` et des terminaux du core à la vue
// affichée dans la colonne de Berger.

export type TerminalCore = {
  address: string
  name: string | null
  title: string
  cwd: string
  state: string
  status?: { state: string } | null
  foreground?: { cwd: string } | null
  labels: Record<string, string>
}

export type VueTerminal = { adresse: string; libelle: string; etat: string }
export type VueSpace = { id: string; nom: string; dossier: string; terminaux: VueTerminal[] }
export type Vue = { spaces: VueSpace[]; autres: VueTerminal[] }

type SpaceDoc = { id: string; name?: string; folder?: string; tabs?: { root?: unknown }[] }

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

function vueTerminal(t: TerminalCore): VueTerminal {
  return { adresse: t.address, libelle: t.name || t.title || t.address, etat: libelleEtat(t) }
}

function dernierSegment(chemin: string): string {
  return chemin.split('/').filter(Boolean).pop() ?? chemin
}

export function construireVue(doc: unknown, terminaux: TerminalCore[]): Vue {
  const parAdresse = new Map(terminaux.map((t) => [t.address, t]))
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
      terminaux: adresses.map((a) => vueTerminal(parAdresse.get(a)!))
    }
  })
  const autres = terminaux
    .filter((t) => t.state === 'live' && !ranges.has(t.address))
    .map(vueTerminal)
  return { spaces, autres }
}
