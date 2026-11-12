// Règles pures : modifier le document `herdr-app` comme le font les commandes
// de Herdr (tab.new, pane.split…), sans toucher à ce que Berger ne comprend
// pas. Une action en entrée, le nouveau document en sortie ; le même objet
// quand rien ne change.
import {
  changerPoids,
  diviser,
  echanger,
  feuilles,
  fermerPanneau,
  type Bloc,
  type Noeud,
  type Sens
} from './arbre'

export type Action =
  | { type: 'onglet.nouveau'; space: string; onglet: string; panneau: string; adresse: string }
  | { type: 'onglet.renommer'; space: string; onglet: string; nom: string }
  | { type: 'onglet.fermer'; space: string; onglet: string }
  | { type: 'space.renommer'; space: string; nom: string }
  | { type: 'space.nouveau'; space: string; onglet: string; panneau: string; adresse: string }
  | { type: 'space.fermer'; space: string }
  | {
      type: 'panneau.diviser'
      space: string
      onglet: string
      panneau: string
      sens: Sens
      nouveau: string
      conteneur: string
      adresse: string
    }
  | { type: 'panneau.fermer'; space: string; onglet: string; panneau: string }
  | { type: 'panneau.echanger'; space: string; onglet: string; a: string; b: string }
  | { type: 'panneau.poids'; space: string; onglet: string; conteneur: string; poids: number[] }

type OngletDoc = { id: string; name?: string; root?: Noeud; [cle: string]: unknown }
type SpaceDoc = { id: string; name?: string; tabs?: OngletDoc[]; [cle: string]: unknown }
type Doc = { spaces?: SpaceDoc[]; [cle: string]: unknown }

export function idHerdr(
  prefixe: 'sp' | 'tb' | 'p' | 's',
  hasard: () => string = () => {
    const octets = new Uint8Array(16)
    globalThis.crypto.getRandomValues(octets)
    return [...octets].map((o) => o.toString(16).padStart(2, '0')).join('')
  }
): string {
  return prefixe + hasard()
}

const terminauxDe = (racine: Noeud | undefined): string[] =>
  racine ? feuilles(racine).flatMap((f) => (f.content?.terminal ? [f.content.terminal] : [])) : []

function avecSpaces(doc: Doc, spaces: SpaceDoc[]): Doc {
  return { ...doc, spaces }
}

// Change un space ; `f` rend le nouveau space, `null` pour le retirer, ou le
// même objet pour ne rien changer.
function changerSpace(doc: Doc, id: string, f: (s: SpaceDoc) => SpaceDoc | null): Doc {
  const spaces = doc.spaces ?? []
  const i = spaces.findIndex((s) => s.id === id)
  if (i < 0) return doc
  const nouveau = f(spaces[i])
  if (nouveau === spaces[i]) return doc
  const liste = [...spaces]
  if (nouveau) liste[i] = nouveau
  else liste.splice(i, 1)
  return avecSpaces(doc, liste)
}

// Change un onglet ; `null` le retire (et retire le space s'il était le dernier).
function changerOnglet(
  doc: Doc,
  space: string,
  onglet: string,
  f: (o: OngletDoc) => OngletDoc | null
): Doc {
  return changerSpace(doc, space, (s) => {
    const onglets = s.tabs ?? []
    const i = onglets.findIndex((o) => o.id === onglet)
    if (i < 0) return s
    const nouveau = f(onglets[i])
    if (nouveau === onglets[i]) return s
    const liste = [...onglets]
    if (nouveau) liste[i] = nouveau
    else liste.splice(i, 1)
    if (liste.length === 0) return null
    return { ...s, tabs: liste }
  })
}

function changerRacine(
  doc: Doc,
  space: string,
  onglet: string,
  f: (racine: Noeud) => Noeud | null
): Doc {
  return changerOnglet(doc, space, onglet, (o) => {
    if (!o.root) return o
    const r = f(o.root)
    if (r === o.root) return o
    return r ? { ...o, root: r } : null
  })
}

// Le terminal est-il déjà rangé juste après le panneau, dans le bon sens ?
function dejaAcote(racine: Noeud, panneau: string, sens: Sens, adresse: string): boolean {
  const type = sens === 'right' ? 'row' : 'column'
  const chercher = (n: Noeud): boolean => {
    if (n.type === 'block') return false
    const liste = n.children ?? []
    for (let i = 0; i < liste.length - 1; i++) {
      const a = liste[i]
      const b = liste[i + 1]
      if (
        n.type === type &&
        a.type === 'block' &&
        a.id === panneau &&
        b.type === 'block' &&
        b.content?.terminal === adresse
      )
        return true
    }
    return liste.some(chercher)
  }
  return chercher(racine)
}

function blocDe(racine: Noeud, adresse: string): Bloc | undefined {
  return feuilles(racine).find((f) => f.content?.terminal === adresse)
}

// Un onglet neuf d'un seul panneau, comme `tab.new` de Herdr.
const ongletNeuf = (onglet: string, panneau: string, adresse: string): OngletDoc => ({
  id: onglet,
  name: '',
  root: {
    type: 'row',
    id: onglet,
    children: [{ type: 'block', id: panneau, content: { terminal: adresse }, size: { weight: 1 } }]
  }
})

const dejaRange = (doc: Doc, adresse: string): boolean =>
  (doc.spaces ?? []).some((s) => (s.tabs ?? []).some((o) => terminauxDe(o.root).includes(adresse)))

export function appliquer(docBrut: unknown, action: Action): unknown {
  if (!docBrut || typeof docBrut !== 'object') return docBrut
  const doc = docBrut as Doc
  switch (action.type) {
    case 'onglet.nouveau':
      if (dejaRange(doc, action.adresse)) return doc
      return changerSpace(doc, action.space, (s) => ({
        ...s,
        tabs: [...(s.tabs ?? []), ongletNeuf(action.onglet, action.panneau, action.adresse)]
      }))
    case 'space.nouveau':
      // Herdr a pu adopter le terminal avant nous : on ne le double pas.
      if (dejaRange(doc, action.adresse)) return doc
      if ((doc.spaces ?? []).some((s) => s.id === action.space)) return doc
      return avecSpaces(doc, [
        ...(doc.spaces ?? []),
        {
          id: action.space,
          name: '',
          tabs: [ongletNeuf(action.onglet, action.panneau, action.adresse)]
        }
      ])
    case 'space.fermer':
      return changerSpace(doc, action.space, () => null)
    case 'onglet.renommer':
      return changerOnglet(doc, action.space, action.onglet, (o) =>
        o.name === action.nom.trim() ? o : { ...o, name: action.nom.trim() }
      )
    case 'space.renommer':
      return changerSpace(doc, action.space, (s) =>
        s.name === action.nom.trim() ? s : { ...s, name: action.nom.trim() }
      )
    case 'onglet.fermer':
      return changerOnglet(doc, action.space, action.onglet, () => null)
    case 'panneau.fermer':
      return changerRacine(doc, action.space, action.onglet, (r) =>
        fermerPanneau(r, action.panneau)
      )
    case 'panneau.echanger':
      return changerRacine(doc, action.space, action.onglet, (r) => echanger(r, action.a, action.b))
    case 'panneau.poids':
      return changerRacine(doc, action.space, action.onglet, (r) => {
        const n = changerPoids(r, action.conteneur, action.poids)
        return JSON.stringify(n) === JSON.stringify(r) ? r : n
      })
    case 'panneau.diviser':
      return changerRacine(doc, action.space, action.onglet, (r) => {
        if (!feuilles(r).some((f) => f.id === action.panneau)) return r
        if (dejaAcote(r, action.panneau, action.sens, action.adresse)) return r
        let base = r
        const adopte = blocDe(r, action.adresse)
        if (adopte) {
          // Herdr a rangé le terminal avant nous : on le déplace au lieu de le doubler.
          if (adopte.id === action.panneau) return r
          base = fermerPanneau(r, adopte.id) ?? r
        }
        return diviser(
          base,
          action.panneau,
          action.sens,
          { type: 'block', id: action.nouveau, content: { terminal: action.adresse } },
          action.conteneur
        )
      })
  }
}

function tousLesTerminaux(docBrut: unknown): string[] {
  const doc = (docBrut ?? {}) as Doc
  return (doc.spaces ?? []).flatMap((s) => (s.tabs ?? []).flatMap((o) => terminauxDe(o.root)))
}

// Les terminaux présents avant et plus après : ceux qu'une fermeture retire
// vraiment (les seuls qu'on a le droit de tuer).
export function terminauxRetires(avant: unknown, apres: unknown): string[] {
  const restent = new Set(tousLesTerminaux(apres))
  return tousLesTerminaux(avant).filter((a) => !restent.has(a))
}

// Où est rangé un terminal (pour retrouver la place que Herdr lui a donnée).
export function placeDe(
  docBrut: unknown,
  adresse: string
): { space: string; onglet: string; panneau: string } | null {
  const doc = (docBrut ?? {}) as Doc
  for (const s of doc.spaces ?? [])
    for (const o of s.tabs ?? []) {
      const bloc = o.root ? blocDe(o.root, adresse) : undefined
      if (bloc) return { space: s.id, onglet: o.id, panneau: bloc.id }
    }
  return null
}
