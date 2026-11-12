// La coloration de VS Code dans Monaco : les grammaires TextMate de VS Code
// (copiées par scripts/copier-grammaires.mjs dans public/vscode/), lues par
// vscode-textmate et vscode-oniguruma, et le thème Monokai de VS Code tel quel.
import * as monaco from 'monaco-editor'
import { INITIAL, parseRawGrammar, Registry, type IGrammar, type StateStack } from 'vscode-textmate'
import { createOnigScanner, createOnigString, loadWASM } from 'vscode-oniguruma'
import urlOnig from 'vscode-oniguruma/release/onig.wasm?url'
import type { LangageVsCode } from '../../shared/fichiers'
import { reglesSemantiques, type ThemeVsCode } from '../../shared/theme'

type Grammaire = {
  language?: string
  scopeName: string
  fichier: string
  embeddedLanguages?: Record<string, string>
  tokenTypes?: Record<string, string>
  injectTo?: string[]
}
type LangageCopie = LangageVsCode & { aliases?: string[]; configuration?: string }
type Registre = { version: string; langages: LangageCopie[]; grammaires: Grammaire[] }

const BASE = './vscode/'
// Comme VS Code (`editor.maxTokenizationLineLength`).
const LIGNE_MAX = 20_000

// fetch ne lit pas les fichiers file:// dans Electron : on passe par XHR.
function lire(chemin: string, type: 'text' | 'arraybuffer'): Promise<string | ArrayBuffer> {
  return new Promise((ok, ko) => {
    const x = new XMLHttpRequest()
    x.open('GET', chemin)
    x.responseType = type
    x.onload = () => (x.status === 200 || x.status === 0 ? ok(x.response) : ko(new Error(chemin)))
    x.onerror = () => ko(new Error(chemin))
    x.send()
  })
}
const lireTexte = async (chemin: string): Promise<string> => (await lire(chemin, 'text')) as string

// Le service JSON de Monaco ne connaît que `json` : `jsonc` y est rangé.
const idMonaco = (id: string): string => (id === 'jsonc' ? 'json' : id)

let theme: ThemeVsCode | null = null
let registre: Registry | null = null
let selection = '#878b9180'

const TYPES_STANDARD: Record<string, number> = { other: 0, comment: 1, string: 2, regex: 3 }
const SUFFIXES_TYPE = ['', '.comment', '.string', '.regex']

// Le nom Monaco d'un jeton TextMate : sa couleur, son style, son type standard
// (Monaco reconnaît « comment », « string », « regex » dans le nom).
function nomJeton(meta: number): string {
  const type = (meta >>> 8) & 0b11
  const style = (meta >>> 11) & 0b1111
  const couleur = (meta >>> 15) & 0b111111111
  return (
    `c${couleur}` +
    (style & 1 ? '-i' : '') +
    (style & 2 ? '-b' : '') +
    (style & 4 ? '-u' : '') +
    (style & 8 ? '-s' : '') +
    SUFFIXES_TYPE[type]
  )
}

class Etat implements monaco.languages.IState {
  constructor(readonly pile: StateStack) {}
  clone(): Etat {
    return new Etat(this.pile.clone())
  }
  equals(autre: monaco.languages.IState): boolean {
    return autre instanceof Etat && autre.pile.equals(this.pile)
  }
}

function fournisseur(g: IGrammar): monaco.languages.TokensProvider {
  return {
    getInitialState: () => new Etat(INITIAL),
    tokenize(ligne, etat) {
      const pile = (etat as Etat).pile
      if (ligne.length > LIGNE_MAX)
        return { tokens: [{ startIndex: 0, scopes: '' }], endState: etat }
      const r = g.tokenizeLine2(ligne, pile, 500)
      const tokens: monaco.languages.IToken[] = []
      for (let i = 0; i < r.tokens.length; i += 2)
        tokens.push({ startIndex: r.tokens[i], scopes: nomJeton(r.tokens[i + 1]) })
      return { tokens, endState: r.stoppedEarly ? etat : new Etat(r.ruleStack) }
    }
  }
}

const expr = (x: unknown): RegExp | undefined => {
  if (typeof x === 'string') return new RegExp(x)
  if (x && typeof x === 'object' && typeof (x as { pattern?: unknown }).pattern === 'string') {
    const o = x as { pattern: string; flags?: string }
    return new RegExp(o.pattern, o.flags)
  }
  return undefined
}

const ACTIONS: Record<string, monaco.languages.IndentAction> = {
  none: monaco.languages.IndentAction.None,
  indent: monaco.languages.IndentAction.Indent,
  indentOutdent: monaco.languages.IndentAction.IndentOutdent,
  outdent: monaco.languages.IndentAction.Outdent
}

const paires = (liste: unknown): monaco.languages.IAutoClosingPairConditional[] | undefined =>
  Array.isArray(liste)
    ? liste.map((p) => (Array.isArray(p) ? { open: p[0], close: p[1] } : p))
    : undefined

// Le language-configuration.json de VS Code, converti pour Monaco.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- format JSON de VS Code
function configurationMonaco(c: any): monaco.languages.LanguageConfiguration {
  const r: monaco.languages.LanguageConfiguration = {}
  if (c.comments) r.comments = c.comments
  if (c.brackets) r.brackets = c.brackets
  if (c.colorizedBracketPairs) r.colorizedBracketPairs = c.colorizedBracketPairs
  if (c.autoClosingPairs) r.autoClosingPairs = paires(c.autoClosingPairs)
  if (c.surroundingPairs) r.surroundingPairs = paires(c.surroundingPairs)
  if (c.autoCloseBefore) r.autoCloseBefore = c.autoCloseBefore
  const mot = expr(c.wordPattern)
  if (mot) r.wordPattern = mot
  if (c.folding)
    r.folding = {
      offSide: c.folding.offSide,
      markers:
        c.folding.markers && expr(c.folding.markers.start) && expr(c.folding.markers.end)
          ? { start: expr(c.folding.markers.start)!, end: expr(c.folding.markers.end)! }
          : undefined
    }
  if (c.indentationRules && expr(c.indentationRules.increaseIndentPattern))
    r.indentationRules = {
      increaseIndentPattern: expr(c.indentationRules.increaseIndentPattern)!,
      decreaseIndentPattern: expr(c.indentationRules.decreaseIndentPattern) ?? /^\b$/,
      indentNextLinePattern: expr(c.indentationRules.indentNextLinePattern),
      unIndentedLinePattern: expr(c.indentationRules.unIndentedLinePattern)
    }
  if (Array.isArray(c.onEnterRules))
    r.onEnterRules = c.onEnterRules
      .filter((x: { beforeText?: unknown }) => expr(x.beforeText))
      .map(
        (x: {
          beforeText: unknown
          afterText?: unknown
          previousLineText?: unknown
          action: { indent: string; appendText?: string; removeText?: number }
        }) => ({
          beforeText: expr(x.beforeText)!,
          afterText: expr(x.afterText),
          previousLineText: expr(x.previousLineText),
          action: {
            indentAction: ACTIONS[x.action.indent] ?? monaco.languages.IndentAction.None,
            appendText: x.action.appendText,
            removeText: x.action.removeText
          }
        })
      )
  return r
}

export async function initColoration(): Promise<LangageVsCode[]> {
  const [reg, th] = await Promise.all([
    lireTexte(BASE + 'langages.json').then((t) => JSON.parse(t) as Registre),
    lireTexte(BASE + 'monokai-color-theme.json').then((t) => JSON.parse(t) as ThemeVsCode)
  ])
  theme = th
  await loadWASM((await lire(urlOnig, 'arraybuffer')) as ArrayBuffer)
  const parPortee = new Map<string, Grammaire>()
  for (const g of reg.grammaires) if (!parPortee.has(g.scopeName)) parPortee.set(g.scopeName, g)
  const injections = new Map<string, string[]>()
  for (const g of reg.grammaires)
    for (const cible of g.injectTo ?? [])
      injections.set(cible, [...(injections.get(cible) ?? []), g.scopeName])
  registre = new Registry({
    onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
    loadGrammar: async (portee) => {
      const g = parPortee.get(portee)
      if (!g) return null
      return parseRawGrammar(await lireTexte(BASE + 'grammaires/' + g.fichier), g.fichier)
    },
    getInjections: (portee) => injections.get(portee),
    theme: { name: 'Monokai', settings: th.tokenColors }
  })

  // Les numéros de langage des grammaires imbriquées (seulement pour vscode-textmate).
  const numeros = new Map<string, number>()
  const numero = (id: string): number => {
    if (!numeros.has(id)) numeros.set(id, numeros.size + 1)
    return numeros.get(id)!
  }
  const connus = new Set(monaco.languages.getLanguages().map((l) => l.id))
  for (const l of reg.langages) {
    const id = idMonaco(l.id)
    if (!connus.has(id)) {
      monaco.languages.register({
        id,
        extensions: l.extensions,
        filenames: l.filenames,
        aliases: l.aliases
      })
      connus.add(id)
      if (l.configuration)
        void lireTexte(BASE + 'configurations/' + l.configuration)
          .then((t) =>
            monaco.languages.setLanguageConfiguration(id, configurationMonaco(JSON.parse(t)))
          )
          .catch(() => {})
    }
  }
  // `json` est colorié avec la grammaire JSON avec commentaires (tsconfig.json).
  const grammaireDe = (id: string): Grammaire | undefined =>
    id === 'json'
      ? reg.grammaires.find((g) => g.language === 'jsonc')
      : reg.grammaires.find((g) => g.language === id)
  for (const id of connus) {
    const g = grammaireDe(id)
    if (!g) continue
    // Remplace la fabrique Monarch de Monaco : chargé à la première utilisation.
    monaco.languages.registerTokensProviderFactory(id, {
      create: async () => {
        const grammaire = await registre!.loadGrammarWithConfiguration(g.scopeName, numero(id), {
          embeddedLanguages: Object.fromEntries(
            Object.entries(g.embeddedLanguages ?? {}).map(([p, l]) => [p, numero(l)])
          ),
          tokenTypes: Object.fromEntries(
            Object.entries(g.tokenTypes ?? {}).map(([p, t]) => [p, TYPES_STANDARD[t] ?? 0])
          )
        })
        if (!grammaire) return null as unknown as monaco.languages.TokensProvider
        return fournisseur(grammaire)
      }
    })
  }
  definirTheme(selection)
  return reg.langages
}

const sansDiese = (c: string): string => c.replace(/^#/, '')

// Le thème Monaco « vscode-monokai » : couleurs et jetons du thème de VS Code.
export function definirTheme(couleurSelection: string): void {
  selection = couleurSelection
  if (!theme || !registre) return
  const couleurs = registre.getColorMap()
  // Le fond vient des couleurs de l'éditeur (les règles TextMate n'en donnent pas).
  const rules: monaco.editor.ITokenThemeRule[] = [
    {
      token: '',
      foreground: sansDiese(couleurs[1] ?? theme.colors['editor.foreground']),
      background: sansDiese(theme.colors['editor.background'])
    }
  ]
  const styles = ['', '-i', '-b', '-u', '-s']
  couleurs.forEach((c, i) => {
    if (!c) return
    // Toutes les combinaisons de styles (italique, gras, souligné, barré).
    for (let s = 0; s < 16; s++) {
      const suffixe = [1, 2, 4, 8].map((b, k) => (s & b ? styles[k + 1] : '')).join('')
      const mots = [
        s & 1 ? 'italic' : '',
        s & 2 ? 'bold' : '',
        s & 4 ? 'underline' : '',
        s & 8 ? 'strikethrough' : ''
      ].filter(Boolean)
      rules.push({ token: `c${i}${suffixe}`, foreground: sansDiese(c), fontStyle: mots.join(' ') })
    }
  })
  for (const r of reglesSemantiques(theme))
    rules.push({
      token: r.token,
      ...(r.foreground ? { foreground: sansDiese(r.foreground) } : {}),
      ...(r.fontStyle !== undefined ? { fontStyle: r.fontStyle } : {})
    })
  monaco.editor.defineTheme('vscode-monokai', {
    base: 'vs-dark',
    inherit: false,
    rules,
    colors: { ...theme.colors, 'editor.selectionBackground': couleurSelection }
  })
  monaco.editor.setTheme('vscode-monokai')
}

// Les noms Monaco des jetons sémantiques qui ont un style (les autres gardent la
// couleur TextMate, comme dans VS Code).
export function clesSemantiques(): Set<string> {
  return new Set(theme ? reglesSemantiques(theme).map((r) => r.token) : [])
}
