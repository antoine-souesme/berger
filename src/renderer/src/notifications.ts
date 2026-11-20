// Bulles discrètes en bas à droite de la fenêtre, comme les toasts de Herdr :
// pastille, titre, une ligne grise. Elles partent seules au bout de 2,5 s ou au
// clic ; trois au plus, la plus ancienne part la première. Une sorte éteinte
// dans les réglages (rubrique « Notifications ») ne s'affiche pas.
import type { SorteNotification } from '../../shared/notifications'
import { reglagesActuels } from './apparence'

const DUREE = 2500
const MAXIMUM = 3

let pile: HTMLElement | null = null

export function notifier(sorte: SorteNotification, titre: string, texte?: string): void {
  if (reglagesActuels()?.reglages.notifications[sorte] === false) return
  if (!pile) {
    pile = document.createElement('div')
    pile.className = 'notifications'
    document.body.append(pile)
  }
  const bulle = document.createElement('div')
  bulle.className = 'notification'
  bulle.setAttribute('role', 'status')
  const pastille = document.createElement('span')
  pastille.className = 'pastille-notification'
  const textes = document.createElement('div')
  textes.className = 'textes-notification'
  const t = document.createElement('div')
  t.className = 'titre-notification'
  t.textContent = titre
  textes.append(t)
  if (texte) {
    const l = document.createElement('div')
    l.className = 'ligne-notification'
    l.textContent = texte
    textes.append(l)
  }
  bulle.append(pastille, textes)
  const fermer = (): void => {
    clearTimeout(minuterie)
    bulle.remove()
  }
  const minuterie = setTimeout(fermer, DUREE)
  bulle.onclick = fermer
  // Le clic ferme la bulle sans retirer la main au terminal ou à l'éditeur.
  bulle.onmousedown = (e) => e.preventDefault()
  pile.append(bulle)
  while (pile.children.length > MAXIMUM) (pile.firstElementChild as HTMLElement).click()
}
