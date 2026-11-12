// Règles pures des thèmes de Berger. Un thème est au format de Herdr
// (`{ background, foreground, selection, cursor?, ansi: [16], colors? }`) avec
// un champ facultatif `editeur` (couleurs du code par type de mot, ou le nom
// d'un thème de VS Code copié dans Berger). Berger en dérive les couleurs de
// la fenêtre, des terminaux et de l'éditeur.
import type { ReglesTextMate, ThemeVsCode } from './theme'

export type TypeMot =
  | 'commentaire'
  | 'chaine'
  | 'motCle'
  | 'fonction'
  | 'type'
  | 'nombre'
  | 'constante'
  | 'variable'
  | 'balise'
  | 'attribut'
  | 'operateur'
export type ChampEditeur = Partial<Record<TypeMot, string>> & { vscode?: string }
export type ThemeHerdr = {
  background: string
  foreground: string
  selection: string
  cursor?: string
  ansi: string[]
  colors?: Record<string, string>
  editeur?: ChampEditeur
}
export type ThemeConnu = { id: string; nom: string; theme: ThemeHerdr; source: 'fourni' | 'perso' }
export type CleFenetre =
  | 'fond'
  | 'panneau'
  | 'bord'
  | 'texte'
  | 'vif'
  | 'gris'
  | 'grisClair'
  | 'actif'
  | 'survol'
  | 'popover'
  | 'clavier'
  | 'vert'
  | 'rouge'
  | 'jaune'

// Les portées TextMate coloriées par chaque type de mot.
export const PORTEES_MOTS: Record<TypeMot, string[]> = {
  commentaire: ['comment', 'punctuation.definition.comment'],
  chaine: ['string', 'punctuation.definition.string'],
  motCle: ['keyword', 'storage', 'keyword.control'],
  fonction: ['entity.name.function', 'support.function', 'meta.function-call.generic'],
  type: [
    'entity.name.type',
    'entity.name.class',
    'entity.other.inherited-class',
    'support.type',
    'support.class'
  ],
  nombre: ['constant.numeric'],
  constante: ['constant.language', 'constant.character', 'constant.other', 'support.constant'],
  variable: ['variable.parameter'],
  balise: ['entity.name.tag'],
  attribut: ['entity.other.attribute-name', 'support.type.property-name'],
  operateur: ['keyword.operator']
}

// Sans champ `editeur` : les couleurs d'une coloration de terminal.
const ANSI_MOTS: Partial<Record<TypeMot, number>> = {
  commentaire: 8,
  chaine: 11,
  motCle: 9,
  fonction: 10,
  type: 14,
  nombre: 13,
  constante: 13,
  balise: 9,
  attribut: 10
}

const COULEUR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const estCouleur = (x: unknown): x is string => typeof x === 'string' && COULEUR.test(x)
const objet = (x: unknown): Record<string, unknown> | null =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null

export function lireTheme(brut: unknown): ThemeHerdr | null {
  const o = objet(brut)
  if (!o) return null
  const { background, foreground, selection, cursor, ansi } = o
  if (!estCouleur(background) || !estCouleur(foreground) || !estCouleur(selection)) return null
  if (!Array.isArray(ansi) || ansi.length !== 16 || !ansi.every(estCouleur)) return null
  const t: ThemeHerdr = { background, foreground, selection, ansi: [...ansi] }
  if (estCouleur(cursor)) t.cursor = cursor
  const colors = objet(o['colors'])
  if (colors)
    t.colors = Object.fromEntries(
      Object.entries(colors).filter(([, v]) => estCouleur(v))
    ) as Record<string, string>
  const ed = objet(o['editeur'])
  if (ed) {
    const e: ChampEditeur = {}
    for (const k of Object.keys(PORTEES_MOTS) as TypeMot[]) if (estCouleur(ed[k])) e[k] = ed[k]
    if (typeof ed['vscode'] === 'string') e.vscode = ed['vscode']
    t.editeur = e
  }
  return t
}

// --- couleurs ---

function rvb(c: string): [number, number, number] {
  let h = c.replace('#', '')
  if (h.length === 3) h = [...h].map((x) => x + x).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}
const hex = (r: number[]): string =>
  '#' +
  r
    .map((x) =>
      Math.round(Math.min(255, Math.max(0, x)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')

// a mélangé à b : p = 0 donne a, p = 1 donne b.
export function melange(a: string, b: string, p: number): string {
  const x = rvb(a)
  const y = rvb(b)
  return hex(x.map((v, i) => v + (y[i] - v) * p))
}

function luminance(c: string): number {
  const [r, g, b] = rvb(c).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Le rapport de contraste WCAG, de 1 à 21.
export function contraste(a: string, b: string): number {
  const x = luminance(a)
  const y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export function estClair(couleur: string): boolean {
  return luminance(couleur) > 0.4
}

// Les couleurs de la fenêtre : celles de `colors` (noms de Herdr), sinon un
// mélange du fond et du texte (comme Herdr dérive ses panneaux).
export function couleursFenetre(t: ThemeHerdr): Record<CleFenetre, string> {
  const c = t.colors ?? {}
  const bg = t.background
  const fg = t.foreground
  const clair = estClair(bg)
  const loin = clair ? '#ffffff' : '#000000'
  const fond = c['canvas'] ?? melange(bg, loin, clair ? 0.45 : 0.22)
  return {
    fond,
    panneau: c['surface'] ?? bg,
    bord: c['border'] ?? melange(bg, fg, 0.12),
    texte: fg,
    vif: c['solid_foreground'] ?? melange(fg, clair ? '#000000' : '#ffffff', 0.5),
    gris: c['dim'] ?? melange(bg, fg, 0.45),
    grisClair: c['muted'] ?? melange(bg, fg, 0.68),
    actif: c['selected'] ?? melange(bg, fg, 0.16),
    survol: c['hover'] ?? melange(bg, fg, 0.1),
    popover: c['popover'] ?? fond,
    clavier: c['accent'] ?? t.ansi[14],
    vert: c['done'] ?? t.ansi[10],
    rouge: c['blocked'] ?? t.ansi[9],
    jaune: c['working'] ?? t.ansi[11]
  }
}

const NOMS_ANSI = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite'
] as const
export type CouleursTerminal = {
  background: string
  foreground: string
  cursor: string
  selectionBackground: string
} & Record<(typeof NOMS_ANSI)[number], string>

export function couleursTerminal(t: ThemeHerdr): CouleursTerminal {
  const r = {
    background: t.background,
    foreground: t.foreground,
    cursor: t.cursor ?? t.foreground,
    selectionBackground: t.selection
  } as CouleursTerminal
  NOMS_ANSI.forEach((n, i) => (r[n] = t.ansi[i]))
  return r
}

// Les couleurs données au core (il répond avec elles aux programmes qui les demandent).
export function affichageDe(t: ThemeHerdr): { bg: string; fg: string; cursor: string } {
  return { bg: t.background, fg: t.foreground, cursor: t.cursor ?? t.foreground }
}

// Le thème de l'éditeur : les règles du thème de VS Code donné (texte ordinaire
// remplacé par celui du thème), sinon celles du champ `editeur`, complétées par
// les 16 couleurs ; puis les couleurs de l'éditeur tirées du thème.
export function themeEditeur(
  t: ThemeHerdr,
  vscode: ThemeVsCode | null
): ThemeVsCode & { type: 'dark' | 'light' } {
  let tokenColors: ReglesTextMate
  if (vscode) {
    tokenColors = vscode.tokenColors.map((r) =>
      r.scope ? r : { ...r, settings: { ...r.settings, foreground: t.foreground } }
    )
    if (!tokenColors.some((r) => !r.scope))
      tokenColors = [{ settings: { foreground: t.foreground } }, ...tokenColors]
  } else {
    tokenColors = [{ settings: { foreground: t.foreground } }]
    for (const [mot, portees] of Object.entries(PORTEES_MOTS) as [TypeMot, string[]][]) {
      const n = ANSI_MOTS[mot]
      const couleur = t.editeur?.[mot] ?? (n === undefined ? undefined : t.ansi[n])
      if (couleur) tokenColors.push({ scope: portees, settings: { foreground: couleur } })
    }
  }
  const f = couleursFenetre(t)
  const colors: Record<string, string> = {
    ...(vscode?.colors ?? {}),
    'editor.background': t.background,
    'editor.foreground': t.foreground,
    'editor.selectionBackground': t.selection,
    'editorCursor.foreground': t.cursor ?? t.foreground,
    'editor.lineHighlightBackground': f.survol,
    'editorLineNumber.foreground': f.gris,
    'editorLineNumber.activeForeground': f.grisClair,
    'editorWidget.background': f.popover,
    'editorSuggestWidget.background': f.popover,
    'menu.background': f.popover,
    'menu.foreground': f.texte
  }
  return { type: estClair(t.background) ? 'light' : 'dark', colors, tokenColors }
}
