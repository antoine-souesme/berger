// Les menus du clic droit.
import { icone } from './icones'

export type Entree =
  | { libelle: string; raccourci?: string; icone?: string; coche?: boolean; faire: () => void }
  | 'separateur'

let ouvert: HTMLElement | null = null

export function fermerMenu(): void {
  ouvert?.remove()
  ouvert = null
}

export function menuOuvert(): boolean {
  return ouvert !== null
}

export function ouvrirMenu(x: number, y: number, entrees: Entree[]): void {
  fermerMenu()
  const menu = document.createElement('div')
  menu.className = 'menu'
  for (const entree of entrees) {
    if (entree === 'separateur') {
      const t = document.createElement('div')
      t.className = 'trait'
      menu.append(t)
      continue
    }
    const ligne = document.createElement('div')
    ligne.className = 'entree'
    ligne.append(icone(entree.icone ?? 'square-terminal', 'currentColor', 15))
    const libelle = document.createElement('span')
    libelle.className = 'libelle'
    libelle.textContent = entree.libelle
    ligne.append(libelle)
    if (entree.coche) {
      const c = document.createElement('span')
      c.className = 'coche'
      c.textContent = '✓'
      ligne.append(c)
    }
    if (entree.raccourci) {
      const r = document.createElement('span')
      r.className = 'raccourci'
      r.textContent = entree.raccourci
      ligne.append(r)
    }
    ligne.addEventListener('mousedown', (e) => e.preventDefault())
    ligne.addEventListener('click', () => {
      fermerMenu()
      entree.faire()
    })
    menu.append(ligne)
  }
  document.body.append(menu)
  // Reste dans la fenêtre.
  const l = menu.offsetWidth
  const h = menu.offsetHeight
  menu.style.left = `${Math.max(4, Math.min(x, window.innerWidth - l - 4))}px`
  menu.style.top = `${Math.max(4, Math.min(y, window.innerHeight - h - 4))}px`
  ouvert = menu
}

window.addEventListener(
  'mousedown',
  (e) => {
    if (ouvert && !ouvert.contains(e.target as Node)) fermerMenu()
  },
  true
)
window.addEventListener(
  'keydown',
  (e) => {
    if (ouvert && e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      fermerMenu()
    }
  },
  true
)
window.addEventListener('blur', fermerMenu)
