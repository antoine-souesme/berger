// Règles pures de l'aide du langage : quel serveur pour quel fichier, la racine
// du projet, le `tsserver` à utiliser, et les conversions entre le protocole des
// serveurs de langage (LSP) et Monaco. Les deux comptent les colonnes en unités
// UTF-16 : aucune conversion d'octets.
import type {
  DiagnosticSeverity,
  Hover,
  MarkedString,
  MarkupContent,
  Position,
  Range,
  TextEdit,
  WorkspaceEdit
} from 'vscode-languageserver-protocol'

export type Serveur = 'typescript' | 'yaml'

const extension = (chemin: string): string => {
  const nom = chemin.slice(chemin.lastIndexOf('/') + 1)
  const point = nom.lastIndexOf('.')
  return point < 0 ? '' : nom.slice(point + 1).toLowerCase()
}

const ID_LSP: Record<string, string> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'typescriptreact',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascriptreact',
  yaml: 'yaml',
  yml: 'yaml'
}

export function serveurDe(chemin: string): Serveur | null {
  const id = ID_LSP[extension(chemin)]
  if (!id) return null
  return id === 'yaml' ? 'yaml' : 'typescript'
}

export function idLsp(chemin: string): string {
  return ID_LSP[extension(chemin)] ?? 'plaintext'
}

const dossier = (p: string): string => {
  const i = p.lastIndexOf('/')
  return i <= 0 ? '/' : p.slice(0, i)
}

const MARQUEURS = ['tsconfig.json', 'jsconfig.json', 'package.json']

export function racineProjet(chemin: string, existe: (p: string) => boolean): string {
  const nm = chemin.indexOf('/node_modules/')
  if (nm >= 0) return chemin.slice(0, nm) || '/'
  let d = dossier(chemin)
  for (;;) {
    if (MARQUEURS.some((m) => existe(`${d === '/' ? '' : d}/${m}`))) return d
    if (d === '/') break
    d = dossier(d)
  }
  return dossier(chemin)
}

export function tsserverDe(
  racine: string,
  existe: (p: string) => boolean,
  deBerger: string
): string {
  const p = `${racine}/node_modules/typescript/lib/tsserver.js`
  return existe(p) ? p : deBerger
}

type PlageMonaco = {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export const versLsp = (p: { lineNumber: number; column: number }): Position => ({
  line: p.lineNumber - 1,
  character: p.column - 1
})

export const plageDeLsp = (r: Range): PlageMonaco => ({
  startLineNumber: r.start.line + 1,
  startColumn: r.start.character + 1,
  endLineNumber: r.end.line + 1,
  endColumn: r.end.character + 1
})

export const plageVersLsp = (r: PlageMonaco): Range => ({
  start: { line: r.startLineNumber - 1, character: r.startColumn - 1 },
  end: { line: r.endLineNumber - 1, character: r.endColumn - 1 }
})

// Les valeurs de MarkerSeverity de Monaco.
export function graviteMonaco(s: DiagnosticSeverity | undefined): 8 | 4 | 2 | 1 {
  switch (s) {
    case 2:
      return 4
    case 3:
      return 2
    case 4:
      return 1
    default:
      return 8
  }
}

// Le décalage (en unités UTF-16) d'une position dans le texte.
function decalage(debuts: number[], texte: string, p: Position): number {
  if (p.line >= debuts.length) return texte.length
  const debut = debuts[p.line]
  const fin = p.line + 1 < debuts.length ? debuts[p.line + 1] : texte.length
  return Math.min(debut + p.character, fin)
}

export function appliquerEditions(texte: string, editions: TextEdit[]): string {
  const debuts = [0]
  for (let i = 0; i < texte.length; i++) if (texte[i] === '\n') debuts.push(i + 1)
  const parDecalage = editions
    .map((e, i) => ({
      debut: decalage(debuts, texte, e.range.start),
      fin: decalage(debuts, texte, e.range.end),
      texte: e.newText,
      i
    }))
    .sort((a, b) => b.debut - a.debut || b.i - a.i)
  let r = texte
  for (const e of parDecalage) r = r.slice(0, e.debut) + e.texte + r.slice(e.fin)
  return r
}

function morceau(m: MarkedString | MarkupContent): string {
  if (typeof m === 'string') return m
  if ('kind' in m) return m.value
  return '```' + m.language + '\n' + m.value + '\n```'
}

export function texteSurvol(c: Hover['contents']): string {
  return (Array.isArray(c) ? c : [c]).map(morceau).join('\n\n')
}

const cheminDeUri = (uri: string): string => decodeURIComponent(new URL(uri).pathname)

export function editionsParFichier(e: WorkspaceEdit): Map<string, TextEdit[]> {
  const r = new Map<string, TextEdit[]>()
  const ajouter = (uri: string, ed: TextEdit[]): void => {
    if (!uri.startsWith('file:')) return
    const c = cheminDeUri(uri)
    r.set(c, [...(r.get(c) ?? []), ...ed])
  }
  for (const [uri, ed] of Object.entries(e.changes ?? {})) ajouter(uri, ed)
  for (const d of e.documentChanges ?? [])
    if ('edits' in d)
      ajouter(
        d.textDocument.uri,
        d.edits.filter((x): x is TextEdit => 'range' in x)
      )
  return r
}
