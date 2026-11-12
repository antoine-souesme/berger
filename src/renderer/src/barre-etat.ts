// La barre d'état en bas de la colonne de droite.
import { COULEUR_ETAT, plusPressant } from '../../shared/libelles'
import { etat, spaceAffiche, surChangement } from './etat'
import { icone } from './icones'

function morceau(...enfants: (Node | string)[]): HTMLElement {
  const m = document.createElement('span')
  m.className = 'morceau'
  m.append(...enfants)
  return m
}

function dessiner(): void {
  const e = etat()
  const barre = document.getElementById('barre-etat')!
  const vivants = Object.values(e.vue.terminaux).filter((t) => t.vivant && t.agent)
  const branche = spaceAffiche()?.branche
  const etatAgents = plusPressant(vivants.map((t) => t.agent))
  const point = document.createElement('span')
  point.className = 'point'
  point.style.background = etatAgents ? COULEUR_ETAT[etatAgents] : '#75715e'
  const droite = document.createElement('span')
  droite.className = 'morceau droite'
  droite.textContent = '⇧⌘P Commandes'
  barre.replaceChildren(
    morceau(icone('monitor', 'currentColor', 13), 'Cet ordinateur'),
    ...(branche ? [morceau(icone('git-branch', 'currentColor', 13), branche)] : []),
    morceau(point, vivants.length === 1 ? '1 agent' : `${vivants.length} agents`),
    droite
  )
}

export function initBarreEtat(): void {
  surChangement(dessiner)
}
