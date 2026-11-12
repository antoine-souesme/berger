// Règles pures des schémas JSON : le `$schema` déclaré, sinon la table des
// fichiers connus (adresses de SchemaStore).
const SS = (n: string): string => `https://json.schemastore.org/${n}.json`

// Motif : un nom de fichier, `*` remplace n'importe quelle suite de caractères.
export const SCHEMAS_JSON: [motif: string, url: string][] = [
  ['package.json', SS('package')],
  ['tsconfig.json', SS('tsconfig')],
  ['tsconfig.*.json', SS('tsconfig')],
  ['jsconfig.json', SS('jsconfig')],
  ['.prettierrc', SS('prettierrc')],
  ['.prettierrc.json', SS('prettierrc')],
  ['.eslintrc', SS('eslintrc')],
  ['.eslintrc.json', SS('eslintrc')],
  ['.babelrc', SS('babelrc')],
  ['babel.config.json', SS('babelrc')],
  ['composer.json', SS('composer')]
]

const motifVersRegex = (m: string): RegExp =>
  new RegExp('^' + m.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')

function schemaDeclare(texte: string): string | null {
  try {
    const v = (JSON.parse(texte) as Record<string, unknown>)['$schema']
    if (typeof v === 'string' && v) return v
  } catch {
    // Fichier mal formé ou avec commentaires : on cherche la clé à la main.
  }
  const m = /"\$schema"\s*:\s*"([^"]+)"/.exec(texte)
  return m ? m[1] : null
}

export function schemaJson(chemin: string, texte: string): string | null {
  const declare = schemaDeclare(texte)
  if (declare) return declare
  const nom = chemin.slice(chemin.lastIndexOf('/') + 1)
  return SCHEMAS_JSON.find(([m]) => motifVersRegex(m).test(nom))?.[1] ?? null
}
