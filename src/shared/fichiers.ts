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

export function langageDe(chemin: string): string {
  const point = chemin.lastIndexOf('.')
  if (point < 0) return 'plaintext'
  return LANGAGES[chemin.slice(point + 1).toLowerCase()] ?? 'plaintext'
}
