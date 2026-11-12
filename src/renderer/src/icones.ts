// Icônes de l'interface, tirées du paquet `lucide` (ISC, voir docs/COPIES.md).
import {
  Bot,
  ChevronRight,
  Columns2,
  File,
  GitBranch,
  Maximize2,
  Monitor,
  Pencil,
  Plus,
  Puzzle,
  Rows2,
  SquareTerminal,
  Terminal,
  X,
  type IconNode
} from 'lucide'

const ICONES: Record<string, IconNode> = {
  bot: Bot,
  'chevron-right': ChevronRight,
  'columns-2': Columns2,
  file: File,
  'git-branch': GitBranch,
  'maximize-2': Maximize2,
  monitor: Monitor,
  pencil: Pencil,
  plus: Plus,
  puzzle: Puzzle,
  'rows-2': Rows2,
  'square-terminal': SquareTerminal,
  terminal: Terminal,
  x: X
}

const SVG = 'http://www.w3.org/2000/svg'

export function icone(nom: string, couleur = 'currentColor', taille = 14): SVGElement {
  const svg = document.createElementNS(SVG, 'svg')
  const attributs: Record<string, string> = {
    width: String(taille),
    height: String(taille),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: couleur,
    'stroke-width': '2',
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
