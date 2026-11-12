// Les menus du clic droit.
import { icone } from './icones'

export type Entree =
  | {
      libelle: string
      raccourci?: string
      icone?: string
      coche?: boolean
      /** En rose (action qui détruit). */
      danger?: boolean
      /** Grisé et sans effet. */
      inactif?: boolean
      faire: () => void
    }
  | 'separateur'

let ouvert: HTMLElement | null = null
// Ce qui avait le clavier avant le menu : il le retrouve à la fermeture. Le
// clic droit sur un onglet fait perdre le clavier à l'éditeur avant l'ouverture
// du menu : on retient donc le dernier élément qui l'a eu.
let avant: HTMLElement | null = null
let dernierClavier: HTMLElement | null = null
window.addEventListener('focusin', (e) => {
  const el = e.target
  if (el instanceof HTMLElement && !el.closest('.menu')) dernierClavier = el
})

export function fermerMenu(): void {
  if (!ouvert) return
  ouvert.remove()
  ouvert = null
  if (avant?.isConnected && document.activeElement === document.body) {
    // Dans l'éditeur, le clavier revient à sa zone de saisie (pas à une bulle de survol).
    const saisie = avant
      .closest('.monaco-editor')
      ?.querySelector<HTMLElement>('.native-edit-context, textarea.inputarea')
    ;(saisie ?? avant).focus()
  }
  avant = null
}

const entreesActives = (): HTMLElement[] =>
  ouvert ? [...ouvert.querySelectorAll<HTMLElement>('.entree:not(.inactif)')] : []

function designer(el: HTMLElement | undefined): void {
  for (const e of entreesActives()) e.classList.toggle('designee', e === el)
  el?.focus()
}

export function menuOuvert(): boolean {
  return ouvert !== null
}

export function ouvrirMenu(x: number, y: number, entrees: Entree[], nom = ''): void {
  fermerMenu()
  const menu = document.createElement('div')
  menu.className = 'menu'
  menu.setAttribute('role', 'menu')
  if (nom) menu.setAttribute('aria-label', nom)
  for (const entree of entrees) {
    if (entree === 'separateur') {
      const t = document.createElement('div')
      t.className = 'trait'
      menu.append(t)
      continue
    }
    const ligne = document.createElement('div')
    ligne.className =
      'entree' + (entree.danger ? ' danger' : '') + (entree.inactif ? ' inactif' : '')
    ligne.setAttribute('role', 'menuitem')
    ligne.tabIndex = -1
    ligne.addEventListener('mouseenter', () => {
      if (!entree.inactif) designer(ligne)
    })
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
      if (entree.inactif) return
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
  avant = dernierClavier
  ouvert = menu
  // Le menu prend le clavier : l'éditeur ou le terminal ne reçoit plus les touches.
  menu.tabIndex = -1
  menu.focus()
}

// `pointerdown` et non `mousedown` : l'éditeur et le terminal annulent le
// `pointerdown`, et le navigateur n'envoie alors plus de `mousedown`.
window.addEventListener(
  'pointerdown',
  (e) => {
    if (ouvert && !ouvert.contains(e.target as Node)) fermerMenu()
  },
  true
)
window.addEventListener(
  'keydown',
  (e) => {
    if (!ouvert) return
    const liste = entreesActives()
    const i = liste.findIndex((el) => el.classList.contains('designee'))
    if (e.key === 'Escape') fermerMenu()
    else if (e.key === 'ArrowDown') designer(liste[(i + 1) % liste.length])
    else if (e.key === 'ArrowUp') designer(liste[(i - 1 + liste.length) % liste.length])
    else if (e.key === 'Enter' || e.key === ' ') liste[i]?.click()
    else if (e.key !== 'Tab') return
    // Toutes les touches restent au menu tant qu'il est ouvert.
    e.preventDefault()
    e.stopImmediatePropagation()
  },
  true
)
window.addEventListener('blur', fermerMenu)
