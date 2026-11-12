// Règles pures du thème de l'éditeur : les couleurs du thème Monokai de VS Code
// pour la coloration sémantique, résolues comme VS Code le fait. Repris de VS
// Code (MIT) : `tokenClassificationRegistry.ts` (table de repli des jetons
// sémantiques) et `colorThemeData.ts` (`resolveScopes`, `nameMatcher`,
// `getTokenStyle`).

export type ReglesTextMate = {
  scope?: string | string[]
  settings: { foreground?: string; fontStyle?: string }
}[]
export type ThemeVsCode = { colors: Record<string, string>; tokenColors: ReglesTextMate }
export type Style = { foreground?: string; fontStyle?: string }

// Sélecteur sémantique (type puis modificateurs) → portées TextMate essayées dans
// l'ordre (`registerTokenType` et `registerTokenStyleDefault` de VS Code 1.146).
export const PORTEES_SEMANTIQUES: Record<string, string[]> = {
  comment: ['comment'],
  string: ['string'],
  keyword: ['keyword.control'],
  number: ['constant.numeric'],
  regexp: ['constant.regexp'],
  operator: ['keyword.operator'],
  namespace: ['entity.name.namespace'],
  type: ['entity.name.type', 'support.type'],
  struct: ['entity.name.type.struct'],
  class: ['entity.name.type.class', 'support.class'],
  interface: ['entity.name.type.interface'],
  enum: ['entity.name.type.enum'],
  typeParameter: ['entity.name.type.parameter'],
  function: ['entity.name.function', 'support.function'],
  method: ['entity.name.function.member', 'support.function'],
  macro: ['entity.name.function.preprocessor'],
  variable: ['variable.other.readwrite', 'entity.name.variable'],
  parameter: ['variable.parameter'],
  property: ['variable.other.property'],
  enumMember: ['variable.other.enummember'],
  event: ['variable.other.event'],
  decorator: ['entity.name.decorator', 'entity.name.function'],
  'variable.readonly': ['variable.other.constant'],
  'property.readonly': ['variable.other.constant.property'],
  'type.defaultLibrary': ['support.type'],
  'class.defaultLibrary': ['support.class'],
  'interface.defaultLibrary': ['support.class'],
  'variable.defaultLibrary': ['support.variable', 'support.other.variable'],
  'variable.defaultLibrary.readonly': ['support.constant'],
  'property.defaultLibrary': ['support.variable.property'],
  'property.defaultLibrary.readonly': ['support.constant.property'],
  'function.defaultLibrary': ['support.function'],
  'member.defaultLibrary': ['support.function']
}

// Types dépréciés de VS Code : `member` est un sous-type de `method`.
const SUR_TYPES: Record<string, string> = { member: 'method' }
const hierarchie = (type: string): string[] =>
  SUR_TYPES[type] ? [type, ...hierarchie(SUR_TYPES[type])] : [type]

// Les seuls modificateurs qui changent un style.
const MODIFICATEURS_UTILES = ['defaultLibrary', 'readonly']

// --- resolveScopes de VS Code ---

function memesPortees(celle: string, motif: string): boolean {
  if (!celle) return false
  if (celle === motif) return true
  return celle.length > motif.length && celle.startsWith(motif) && celle[motif.length] === '.'
}

function nameMatcher(identifiants: string[], portees: string[]): number {
  if (portees.length < identifiants.length) return -1
  let score: number | undefined
  const tous = identifiants.every((id) => {
    for (let i = portees.length - 1; i >= 0; i--)
      if (memesPortees(portees[i], id)) {
        score = (i + 1) * 0x10000 + id.length
        return true
      }
    return false
  })
  return tous && score !== undefined ? score : -1
}

// Un sélecteur TextMate simple : « a b, c - d ».
function correspondance(selecteur: string): (portees: string[]) => number {
  const choix = selecteur
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [oui, ...non] = s.split(/\s+-\s+/)
      const ids = oui.trim().split(/\s+/)
      const exclus = non.map((n) => n.trim().split(/\s+/))
      return (p: string[]): number =>
        exclus.some((e) => nameMatcher(e, p) >= 0) ? -1 : nameMatcher(ids, p)
    })
  return (p) => Math.max(-1, ...choix.map((c) => c(p)))
}

function correspondances(regles: ReglesTextMate): ((p: string[]) => number)[] {
  return regles.map((r) => {
    if (!r.scope || !r.settings) return () => -1
    const liste = (Array.isArray(r.scope) ? r.scope : [r.scope]).map(correspondance)
    return (p) => Math.max(-1, ...liste.map((c) => c(p)))
  })
}

const cache = new WeakMap<ThemeVsCode, ((p: string[]) => number)[]>()
const correspondancesDe = (t: ThemeVsCode): ((p: string[]) => number)[] => {
  let c = cache.get(t)
  if (!c) cache.set(t, (c = correspondances(t.tokenColors)))
  return c
}

export function styleDePortees(theme: ThemeVsCode, portees: string[]): Style {
  const c = correspondancesDe(theme)
  let foreground: string | undefined
  let fontStyle: string | undefined
  let scoreCouleur = -1
  let scoreStyle = -1
  theme.tokenColors.forEach((r, i) => {
    const score = c[i](portees)
    if (score < 0) return
    if (score >= scoreCouleur && r.settings.foreground) {
      foreground = r.settings.foreground
      scoreCouleur = score
    }
    if (score >= scoreStyle && typeof r.settings.fontStyle === 'string') {
      fontStyle = r.settings.fontStyle
      scoreStyle = score
    }
  })
  const s: Style = {}
  if (foreground !== undefined) s.foreground = foreground
  if (fontStyle !== undefined) s.fontStyle = fontStyle
  return s
}

// La première portée de la liste qui trouve une règle (resolveScopes).
function resoudre(theme: ThemeVsCode, liste: string[]): Style | null {
  for (const p of liste) {
    const s = styleDePortees(theme, [p])
    if (s.foreground !== undefined || s.fontStyle !== undefined) return s
  }
  return null
}

// --- getTokenStyle de VS Code (thème sans semanticTokenColors) ---

const PROPRIETES = ['bold', 'underline', 'strikethrough', 'italic'] as const

function styleSemantique(theme: ThemeVsCode, type: string, modificateurs: string[]): Style | null {
  const h = hierarchie(type)
  let foreground: string | undefined
  let scoreCouleur = -1
  const props: Partial<Record<(typeof PROPRIETES)[number], boolean>> = {}
  const scores: Record<string, number> = {}
  for (const [selecteur, portees] of Object.entries(PORTEES_SEMANTIQUES)) {
    const [t, ...mods] = selecteur.split('.')
    const niveau = h.indexOf(t)
    if (niveau < 0 || !mods.every((m) => modificateurs.includes(m))) continue
    const score = 100 - niveau + mods.length * 100
    const s = resoudre(theme, portees)
    if (!s) continue
    if (s.foreground && scoreCouleur <= score) {
      scoreCouleur = score
      foreground = s.foreground
    }
    if (s.fontStyle !== undefined) {
      const mots = s.fontStyle.split(/\s+/)
      for (const p of PROPRIETES)
        if ((scores[p] ?? -1) <= score) {
          scores[p] = score
          props[p] = mots.includes(p)
        }
    }
  }
  if (foreground === undefined && Object.keys(props).length === 0) return null
  const r: Style = {}
  if (foreground !== undefined) r.foreground = foreground
  if (Object.keys(props).length) r.fontStyle = PROPRIETES.filter((p) => props[p]).join(' ')
  return r
}

// Le nom Monaco d'un jeton sémantique : type, puis les modificateurs utiles triés.
export function cleSemantique(type: string, modificateurs: string[]): string {
  const t = type === 'member' ? 'method' : type
  const mods = MODIFICATEURS_UTILES.filter((m) => modificateurs.includes(m))
  return [t, ...mods].join('.')
}

const parties = <T>(liste: T[]): T[][] =>
  liste.reduce<T[][]>((acc, x) => [...acc, ...acc.map((a) => [...a, x])], [[]])

// Une règle Monaco par clé sémantique qui a un style ; un jeton dont la clé n'a
// pas de règle garde la couleur TextMate (comme VS Code).
export function reglesSemantiques(
  theme: ThemeVsCode
): { token: string; foreground?: string; fontStyle?: string }[] {
  const types = [...new Set(Object.keys(PORTEES_SEMANTIQUES).map((s) => s.split('.')[0]))]
  const r: { token: string; foreground?: string; fontStyle?: string }[] = []
  for (const type of types.filter((t) => t !== 'member'))
    for (const mods of parties(MODIFICATEURS_UTILES)) {
      const s = styleSemantique(theme, type, mods)
      if (s) r.push({ token: cleSemantique(type, mods), ...s })
    }
  return r
}
