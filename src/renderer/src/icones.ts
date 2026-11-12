// Icônes de l'interface, tirées du paquet `lucide` (ISC, voir docs/COPIES.md).
import {
  ArrowUp,
  Bot,
  Check,
  ChevronRight,
  Clock,
  Columns2,
  File,
  Files,
  Folder,
  GitBranch,
  LoaderCircle,
  Maximize2,
  Monitor,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Puzzle,
  Rows2,
  Save,
  Search,
  Smile,
  SquareTerminal,
  Terminal,
  Trash2,
  X,
  type IconNode
} from 'lucide'

const ICONES: Record<string, IconNode> = {
  'arrow-up': ArrowUp,
  bot: Bot,
  check: Check,
  'chevron-right': ChevronRight,
  clock: Clock,
  'columns-2': Columns2,
  file: File,
  files: Files,
  folder: Folder,
  'git-branch': GitBranch,
  'loader-circle': LoaderCircle,
  'maximize-2': Maximize2,
  monitor: Monitor,
  pencil: Pencil,
  pin: Pin,
  'pin-off': PinOff,
  plus: Plus,
  puzzle: Puzzle,
  'rows-2': Rows2,
  save: Save,
  search: Search,
  smile: Smile,
  'square-terminal': SquareTerminal,
  terminal: Terminal,
  'trash-2': Trash2,
  x: X
}

const SVG = 'http://www.w3.org/2000/svg'

export function icone(
  nom: string,
  couleur = 'currentColor',
  taille = 14,
  epaisseur = 2
): SVGElement {
  const svg = document.createElementNS(SVG, 'svg')
  const attributs: Record<string, string> = {
    width: String(taille),
    height: String(taille),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: couleur,
    'stroke-width': String(epaisseur),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: 'icone'
  }
  for (const [k, v] of Object.entries(attributs)) svg.setAttribute(k, v)
  for (const [balise, attrs] of ICONES[nom] ?? ICONES['square-terminal']) {
    const el = document.createElementNS(SVG, balise)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
    svg.append(el)
  }
  return svg
}

// Une icône de fichier Material Icon Theme (MIT, voir public/material/LICENSE).
export function iconeMaterial(nom: string, taille = 16): HTMLImageElement {
  const img = document.createElement('img')
  img.className = 'icone-fichier'
  img.src = `./material/${nom}.svg`
  img.width = taille
  img.height = taille
  img.alt = ''
  img.draggable = false
  return img
}
