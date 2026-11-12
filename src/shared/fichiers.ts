// Règles pures du choix de fichier et de l'éditeur.

export const DOSSIERS_IGNORES = ['.git', 'node_modules', 'out', 'dist', 'build', '.next', 'target', '.venv']
export const LIMITE_FICHIERS = 5000

function contientDansLOrdre(texte: string, requete: string): boolean {
  let i = 0
  for (const c of texte) if (c === requete[i]) i++
  return i === requete.length
}

export function filtrerFichiers(chemins: string[], requete: string): string[] {
  const r = requete.toLowerCase()
  if (!r) return chemins
  const nom = (c: string): string => c.slice(c.lastIndexOf('/') + 1).toLowerCase()
  const trouves = chemins.filter((c) => contientDansLOrdre(c.toLowerCase(), r))
  const enBloc = trouves.filter((c) => nom(c).includes(r))
  return [...enBloc, ...trouves.filter((c) => !nom(c).includes(r))]
}

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
