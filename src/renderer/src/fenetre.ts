// Les colonnes de la fenêtre : largeurs, séparateurs qu'on tire, colonne de
// gauche masquée ou non.
import { bornerLargeur } from '../../shared/etat-fenetre'
import { changer, etat, surChangement } from './etat'

function appliquer(): void {
  const e = etat()
  const gauche = document.getElementById('gauche')!
  gauche.hidden = e.colonneMasquee
  document.getElementById('explorateur')!.hidden = e.explorateurMasque
  document.querySelector<HTMLElement>('.separateur[data-largeur="explorateur"]')!.hidden =
    e.explorateurMasque
  document.getElementById('explorateur')!.style.width = `${e.largeurs.explorateur}px`
  document.getElementById('spaces')!.style.width = `${e.largeurs.spaces}px`
}

export function initFenetre(): void {
  surChangement(appliquer)
  for (const sep of document.querySelectorAll<HTMLElement>('.separateur')) {
    const cle = sep.dataset['largeur'] as 'explorateur' | 'spaces'
    sep.addEventListener('mousedown', (ev) => {
      ev.preventDefault()
      const depart = ev.clientX
      const largeur = etat().largeurs[cle]
      const bande = document.getElementById(cle)!
      sep.classList.add('tire')
      const bouger = (m: MouseEvent): void => {
        bande.style.width = `${bornerLargeur(largeur + m.clientX - depart)}px`
      }
      const lacher = (m: MouseEvent): void => {
        sep.classList.remove('tire')
        window.removeEventListener('mousemove', bouger)
        window.removeEventListener('mouseup', lacher)
        changer((e) => (e.largeurs[cle] = bornerLargeur(largeur + m.clientX - depart)))
      }
      window.addEventListener('mousemove', bouger)
      window.addEventListener('mouseup', lacher)
    })
  }
}

export function basculerColonne(): void {
  changer((e) => (e.colonneMasquee = !e.colonneMasquee))
}
