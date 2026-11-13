// Règles pures de l'arbre des découpages d'un onglet (format du document
// `herdr-app` de Herdr). Toutes les fonctions rendent un nouvel arbre et
// recopient les champs qu'elles ne connaissent pas.

export type Taille = { weight?: number; px?: number }
export type Bloc = {
  type: 'block'
  id: string
  content: { terminal?: string; mod?: string; props?: unknown }
  size?: Taille
  [cle: string]: unknown
}
export type Conteneur = {
  type: 'row' | 'column'
  id: string
  children: Noeud[]
  size?: Taille
  [cle: string]: unknown
}
export type Noeud = Bloc | Conteneur
export type Sens = 'right' | 'down'
export type Direction = 'left' | 'right' | 'up' | 'down'
export type Rect = { x: number; y: number; l: number; h: number }

const estBloc = (n: Noeud): n is Bloc => n.type === 'block'
const enfants = (n: Noeud): Noeud[] => (estBloc(n) ? [] : (n.children ?? []))
export const poidsDe = (n: Noeud): number =>
  typeof n.size?.weight === 'number' && n.size.weight > 0 ? n.size.weight : 1

export function feuilles(racine: Noeud): Bloc[] {
  return estBloc(racine) ? [racine] : enfants(racine).flatMap(feuilles)
}

function contient(racine: Noeud, id: string): boolean {
  return feuilles(racine).some((f) => f.id === id)
}

// Remplace chaque enfant d'un conteneur par ce que rend `f` (une liste,
// éventuellement vide ou de plusieurs nœuds), de haut en bas.
function transformer(n: Noeud, f: (enfant: Noeud, parent: Conteneur) => Noeud[] | null): Noeud {
  if (estBloc(n)) return n
  const nouveaux: Noeud[] = []
  for (const enfant of n.children ?? []) {
    const remplace = f(enfant, n)
    if (remplace) nouveaux.push(...remplace)
    else nouveaux.push(transformer(enfant, f))
  }
  return { ...n, children: nouveaux }
}

export function diviser(
  racine: Noeud,
  panneau: string,
  sens: Sens,
  nouveau: Bloc,
  idConteneur: string
): Noeud {
  if (!contient(racine, panneau)) return racine
  const type = sens === 'right' ? 'row' : 'column'
  if (estBloc(racine)) {
    return {
      type,
      id: idConteneur,
      children: [
        { ...racine, size: { weight: 0.5 } },
        { ...nouveau, size: { weight: 0.5 } }
      ]
    }
  }
  return transformer(racine, (enfant, parent) => {
    if (!estBloc(enfant) || enfant.id !== panneau) return null
    if (parent.type === type) {
      const moitie = poidsDe(enfant) / 2
      return [
        { ...enfant, size: { ...enfant.size, weight: moitie } },
        { ...nouveau, size: { weight: moitie } }
      ]
    }
    const conteneur: Conteneur = {
      type,
      id: idConteneur,
      children: [
        { ...enfant, size: { weight: 0.5 } },
        { ...nouveau, size: { weight: 0.5 } }
      ]
    }
    if (enfant.size) conteneur.size = enfant.size
    return [conteneur]
  })
}

export function fermerPanneau(racine: Noeud, panneau: string): Noeud | null {
  if (!contient(racine, panneau)) return racine
  if (estBloc(racine)) return null
  const retirer = (n: Conteneur): Conteneur => {
    const gardes: Noeud[] = []
    for (const enfant of n.children ?? []) {
      if (estBloc(enfant)) {
        if (enfant.id !== panneau) gardes.push(enfant)
        continue
      }
      if (!contient(enfant, panneau)) {
        gardes.push(enfant)
        continue
      }
      const reste = retirer(enfant)
      if (reste.children.length === 0) continue
      if (reste.children.length === 1) {
        const seul = { ...reste.children[0] }
        if (reste.size) seul.size = reste.size
        else delete seul.size
        gardes.push(seul)
      } else gardes.push(reste)
    }
    return { ...n, children: gardes }
  }
  const r = retirer(racine)
  return feuilles(r).length === 0 ? null : r
}

export function echanger(racine: Noeud, a: string, b: string): Noeud {
  if (a === b || !contient(racine, a) || !contient(racine, b)) return racine
  const blocs = new Map(feuilles(racine).map((f) => [f.id, f]))
  const place = (ancien: Bloc, arrivant: Bloc): Bloc => {
    const r: Bloc = { ...arrivant }
    if (ancien.size) r.size = ancien.size
    else delete r.size
    return r
  }
  const parcourir = (n: Noeud): Noeud => {
    if (estBloc(n)) {
      if (n.id === a) return place(n, blocs.get(b)!)
      if (n.id === b) return place(n, blocs.get(a)!)
      return n
    }
    return { ...n, children: (n.children ?? []).map(parcourir) }
  }
  return parcourir(racine)
}

export function changerPoids(racine: Noeud, conteneur: string, poids: number[]): Noeud {
  const parcourir = (n: Noeud): Noeud => {
    if (estBloc(n)) return n
    if (n.id === conteneur) {
      return {
        ...n,
        children: n.children.map((c, i) =>
          typeof poids[i] === 'number' ? { ...c, size: { ...c.size, weight: poids[i] } } : c
        )
      }
    }
    return { ...n, children: (n.children ?? []).map(parcourir) }
  }
  return parcourir(racine)
}

// Le double clic sur la coupure entre les enfants i et i+1 d'un conteneur leur
// rend la même taille, en gardant la place qu'ils occupent à eux deux.
export function egaliserCoupure(conteneur: Conteneur, i: number): number[] {
  const poids = (conteneur.children ?? []).map(poidsDe)
  if (i < 0 || i + 1 >= poids.length) return poids
  const moitie = (poids[i] + poids[i + 1]) / 2
  poids[i] = moitie
  poids[i + 1] = moitie
  return poids
}

export function rectangles(racine: Noeud): Map<string, Rect> {
  const r = new Map<string, Rect>()
  const placer = (n: Noeud, rect: Rect): void => {
    if (estBloc(n)) {
      r.set(n.id, rect)
      return
    }
    const liste = n.children ?? []
    const total = liste.reduce((s, c) => s + poidsDe(c), 0) || 1
    let debut = 0
    for (const c of liste) {
      const part = poidsDe(c) / total
      placer(
        c,
        n.type === 'row'
          ? { x: rect.x + rect.l * debut, y: rect.y, l: rect.l * part, h: rect.h }
          : { x: rect.x, y: rect.y + rect.h * debut, l: rect.l, h: rect.h * part }
      )
      debut += part
    }
  }
  placer(racine, { x: 0, y: 0, l: 1, h: 1 })
  return r
}

const EPS = 1e-6

export function voisin(racine: Noeud, panneau: string, direction: Direction): string | null {
  const rects = rectangles(racine)
  const ici = rects.get(panneau)
  if (!ici) return null
  const horizontal = direction === 'left' || direction === 'right'
  let meilleur: string | null = null
  let recouvrement = 0
  for (const f of feuilles(racine)) {
    if (f.id === panneau) continue
    const r = rects.get(f.id)!
    const touche =
      direction === 'right'
        ? Math.abs(r.x - (ici.x + ici.l)) < EPS
        : direction === 'left'
          ? Math.abs(r.x + r.l - ici.x) < EPS
          : direction === 'down'
            ? Math.abs(r.y - (ici.y + ici.h)) < EPS
            : Math.abs(r.y + r.h - ici.y) < EPS
    if (!touche) continue
    const commun = horizontal
      ? Math.min(r.y + r.h, ici.y + ici.h) - Math.max(r.y, ici.y)
      : Math.min(r.x + r.l, ici.x + ici.l) - Math.max(r.x, ici.x)
    if (commun > recouvrement + EPS) {
      recouvrement = commun
      meilleur = f.id
    }
  }
  return meilleur
}
