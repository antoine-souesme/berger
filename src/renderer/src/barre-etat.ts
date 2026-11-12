// La barre d'état en bas de la colonne de droite.
import { COULEUR_ETAT, plusPressant } from '../../shared/libelles'
import { spaceAffiche, spacesVisiblesUi, surChangement } from './etat'
import { icone } from './icones'

function morceau(...enfants: (Node | string)[]): HTMLElement {
  const m = document.createElement('span')
  m.className = 'morceau'
  m.append(...enfants)
  return m
}

function dessiner(): void {
  const barre = document.getElementById('barre-etat')!
  // Les agents des spaces visibles (workspace ouvert et spaces rangés nulle part).
  const vivants = spacesVisiblesUi()
    .flatMap((s) => s.terminaux)
    .filter((t) => t.vivant && t.agent)
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
    vivants.length
      ? morceau(point, vivants.length === 1 ? '1 agent' : `${vivants.length} agents`)
      : morceau('Aucun agent'),
    droite
  )
}

export function initBarreEtat(): void {
  surChangement(dessiner)
}
