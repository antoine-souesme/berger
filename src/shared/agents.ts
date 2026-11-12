// Règles pures de la liste des agents : les agents des spaces visibles, leurs
// sous-agents lancés par `hc run`, en arbre,
// le tri, l'agent voisin et la durée affichée. L'arbre et le tri s'inspirent
// de `main.js` du mod `antoine-agents` (voir docs/COPIES.md).
import { feuilles } from './arbre'
import type { EtatAgent, Icone } from './libelles'
import type { PlaceAgent } from './onglets'
import type { Vue, VueTerminal } from './spaces'

export type TriAgents = 'spaces' | 'urgence'
export type Trait = '├' | '└' | '│' | ''
export type LigneAgent = {
  cle: string
  adresse: string
  /** Où mène un clic : sa place, sinon celle de son parent ; null si aucune. */
  place: PlaceAgent | null
  space: string
  nomSpace: string
  titre: string
  programme: { nom: string; icone: Icone }
  agent: EtatAgent
  depuis: number | null
  /** Vide pour un agent de premier niveau. */
  traits: Trait[]
}

export const URGENCE: Record<'attente' | 'fini' | 'travail', number> = {
  attente: 3,
  fini: 2,
  travail: 1
}
const urgence = (e: EtatAgent): number => (e ? URGENCE[e] : 0)

// La place de chaque terminal rangé dans un onglet, dans l'ordre des spaces,
// des onglets puis des panneaux.
function places(vue: Vue): PlaceAgent[] {
  const r: PlaceAgent[] = []
  for (const space of vue.spaces)
    for (const onglet of space.onglets)
      for (const bloc of feuilles(onglet.racine)) {
        const adresse = bloc.content?.terminal
        if (adresse && vue.terminaux[adresse])
          r.push({ space: space.id, onglet: onglet.id, panneau: bloc.id, adresse })
      }
  return r
}

export function listeAgents(vue: Vue, visibles: string[], tri: TriAgents): LigneAgent[] {
  const placeDe = new Map<string, PlaceAgent>()
  for (const p of places(vue)) if (!placeDe.has(p.adresse)) placeDe.set(p.adresse, p)
  const rangSpace = new Map(visibles.map((id, i) => [id, i]))
  const nomSpace = new Map(vue.spaces.map((s) => [s.id, s.nom]))
  const tous = Object.values(vue.terminaux)

  const premiers = [...placeDe.values()].filter(
    (p) => rangSpace.has(p.space) && vue.terminaux[p.adresse].agent
  )
  const listes = new Set(premiers.map((p) => p.adresse))

  // Un agent dont un ancêtre est un agent listé est rangé sous lui.
  const sousUnListe = (t: VueTerminal): boolean => {
    const vus = new Set<string>([t.adresse])
    let parent = t.parent
    while (parent && !vus.has(parent)) {
      if (listes.has(parent)) return true
      vus.add(parent)
      parent = vue.terminaux[parent]?.parent ?? null
    }
    return false
  }

  const ligne = (
    t: VueTerminal,
    place: PlaceAgent | null,
    traits: Trait[],
    secours: { space: string }
  ): LigneAgent => {
    const space = place?.space ?? secours.space
    return {
      cle: t.adresse,
      adresse: t.adresse,
      place,
      space,
      nomSpace: nomSpace.get(space) ?? '',
      titre: t.titre,
      programme: t.programme,
      agent: t.agent,
      depuis: t.depuis,
      traits
    }
  }

  // Les enfants vivants, en profondeur, avec les traits devant eux.
  const arbre = (
    adresse: string,
    place: PlaceAgent,
    avant: Trait[],
    vus: Set<string>
  ): LigneAgent[] => {
    const enfants = tous.filter((k) => k.parent === adresse && k.vivant && !vus.has(k.adresse))
    return enfants.flatMap((k, i) => {
      const dernier = i === enfants.length - 1
      vus.add(k.adresse)
      const sienne = placeDe.get(k.adresse) ?? null
      return [
        ligne(k, sienne ?? place, [...avant, dernier ? '└' : '├'], place),
        ...arbre(k.adresse, sienne ?? place, [...avant, dernier ? '' : '│'], vus)
      ]
    })
  }

  const groupes = premiers
    .filter((p) => !sousUnListe(vue.terminaux[p.adresse]))
    .map((p, ordre) => {
      const t = vue.terminaux[p.adresse]
      const enfants = arbre(p.adresse, p, [], new Set([p.adresse]))
      const lignes = [ligne(t, p, [], p), ...enfants]
      return {
        lignes,
        ordre,
        rangSpace: rangSpace.get(p.space)!,
        urgence: Math.max(...lignes.map((l) => urgence(l.agent))),
        depuis: t.depuis
      }
    })

  if (tri === 'spaces') groupes.sort((a, b) => a.rangSpace - b.rangSpace || a.ordre - b.ordre)
  else
    groupes.sort(
      (a, b) =>
        b.urgence - a.urgence ||
        (b.depuis ?? -Infinity) - (a.depuis ?? -Infinity) ||
        a.rangSpace - b.rangSpace ||
        a.ordre - b.ordre
    )
  return groupes.flatMap((g) => g.lignes)
}

// L'agent suivant ou précédent : seulement les lignes qui ont leur propre
// panneau (pas un sous-agent sans panneau), en boucle.
export function agentVoisin(
  lignes: LigneAgent[],
  actuel: string | null,
  pas: 1 | -1
): PlaceAgent | null {
  const liste = lignes.flatMap((l) => (l.place && l.place.adresse === l.adresse ? [l.place] : []))
  if (liste.length === 0) return null
  const i = liste.findIndex((p) => p.adresse === actuel)
  if (i < 0) return pas === 1 ? liste[0] : liste[liste.length - 1]
  return liste[(i + pas + liste.length) % liste.length]
}

export function duree(ms: number): string {
  const m = Math.floor(ms / 60000)
  if (m < 1) return '<1m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}j`
}
