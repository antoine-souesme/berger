// Icônes de l'interface, tirées du paquet `lucide` (ISC).
import {
  ArrowUp,
  Bot,
  Check,
  Circle,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  Clock,
  Columns2,
  File,
  Files,
  Folder,
  FolderPlus,
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
  ClipboardPaste,
  Code,
  Copy,
  FilePlus,
  FolderMinus,
  FolderOpen,
  Link,
  Settings,
  Palette,
  Keyboard,
  Bell,
  FileCog,
  RotateCcw,
  TriangleAlert,
  type IconNode
} from 'lucide'

const ICONES: Record<string, IconNode> = {
  'arrow-up': ArrowUp,
  bot: Bot,
  check: Check,
  circle: Circle,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevrons-down-up': ChevronsDownUp,
  clock: Clock,
  'columns-2': Columns2,
  file: File,
  files: Files,
  folder: Folder,
  'folder-plus': FolderPlus,
  'git-branch': GitBranch,
  'loader-circle': LoaderCircle,
  'maximize-2': Maximize2,
  monitor: Monitor,
  settings: Settings,
  palette: Palette,
  keyboard: Keyboard,
  bell: Bell,
  'file-cog': FileCog,
  'rotate-ccw': RotateCcw,
  'triangle-alert': TriangleAlert,
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
  'clipboard-paste': ClipboardPaste,
  code: Code,
  copy: Copy,
  'file-plus': FilePlus,
  'folder-minus': FolderMinus,
  'folder-open': FolderOpen,
  link: Link,
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
    // Une variable CSS ne se lit pas dans un attribut SVG : elle passe par `color`.
    stroke: couleur.startsWith('var(') ? 'currentColor' : couleur,
    'stroke-width': String(epaisseur),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: 'icone'
  }
  for (const [k, v] of Object.entries(attributs)) svg.setAttribute(k, v)
  if (couleur.startsWith('var(')) svg.style.color = couleur
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

// L'anneau qui tourne d'un agent au travail (comme Herdr), pour la liste des
// agents et la barre des workspaces ; il tourne avec la classe `tourne`.
export const ANNEAU_TRAVAIL =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.4" stroke-opacity="0.24"/><path d="M12 2.6a9.4 9.4 0 0 1 9.4 9.4"/></svg>'
