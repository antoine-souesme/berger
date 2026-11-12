// Règles pures des fichiers : dossiers sautés hors git, limite de ⌘P, langage de l'éditeur.

export const DOSSIERS_IGNORES = [
  '.git',
  'node_modules',
  'out',
  'dist',
  'build',
  '.next',
  'target',
  '.venv'
]
// Au plus 50 000 fichiers par racine pour ⌘P.
export const LIMITE_FICHIERS = 50_000

export type ListeFichiers = { fichiers: string[]; tronquee: boolean }

const LANGAGES: Record<string, string> = {
  md: 'markdown',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  html: 'html',
  py: 'python',
  rs: 'rust',
  sh: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
  php: 'php',
  sql: 'sql'
}

// Une entrée du registre des langages de VS Code (`langages.json`, Tâche 3).
export type LangageVsCode = {
  id: string
  extensions?: string[]
  filenames?: string[]
  filenamePatterns?: string[]
}

// Fichiers de réglages que VS Code ne range pas lui-même (une extension le fait).
const NOMS_EN_PLUS: Record<string, string> = { '.prettierrc': 'json' }

// Le service JSON de Monaco ne connaît que `json` : `jsonc` y est rangé.
const idMonaco = (id: string): string => (id === 'jsonc' ? 'json' : id)

const motif = (m: string): RegExp =>
  new RegExp(
    (m.startsWith('**/') ? '(^|/)' : '^') +
      m
        .replace(/^\*\*\//, '')
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '§§')
        .replace(/\*/g, '[^/]*')
        .replace(/§§/g, '.*') +
      '$',
    'i'
  )

// Comme VS Code : nom exact, puis motif de nom, puis l'extension la plus longue.
function langageVsCode(chemin: string, langages: LangageVsCode[]): string {
  const nom = chemin.slice(chemin.lastIndexOf('/') + 1)
  const bas = nom.toLowerCase()
  const parNom = langages.find((l) => l.filenames?.some((f) => f.toLowerCase() === bas))
  if (parNom) return idMonaco(parNom.id)
  if (NOMS_EN_PLUS[nom]) return NOMS_EN_PLUS[nom]
  const parMotif = langages.find((l) =>
    l.filenamePatterns?.some((m) => motif(m).test(m.includes('/') ? chemin : nom))
  )
  if (parMotif) return idMonaco(parMotif.id)
  let meilleur: { id: string; longueur: number } | null = null
  for (const l of langages)
    for (const e of l.extensions ?? [])
      if (bas.endsWith(e.toLowerCase()) && (!meilleur || e.length > meilleur.longueur))
        meilleur = { id: l.id, longueur: e.length }
  return meilleur ? idMonaco(meilleur.id) : 'plaintext'
}

export function langageDe(chemin: string, langages?: LangageVsCode[]): string {
  if (langages) return langageVsCode(chemin, langages)
  const point = chemin.lastIndexOf('.')
  if (point < 0) return 'plaintext'
  return LANGAGES[chemin.slice(point + 1).toLowerCase()] ?? 'plaintext'
}

// Le fichier a changé sur le disque : le recharger s'il n'est pas modifié dans
// Berger ; modifié des deux côtés, le garder (⌘S posera la question). Un fichier
// supprimé (texte null) ne change rien ici.
export function quoiFaire(
  modifie: boolean,
  texteCharge: string,
  texteDisque: string | null
): 'rien' | 'recharger' | 'garder' {
  if (texteDisque === null || texteDisque === texteCharge) return 'rien'
  return modifie ? 'garder' : 'recharger'
}
