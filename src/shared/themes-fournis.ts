// Les thèmes livrés avec Berger (src/shared/themes/*.json), dans l'ordre de la
// maquette. L'id d'un thème est le nom de son fichier.
import { lireTheme, type ThemeConnu } from './themes'

const fichiers = import.meta.glob('./themes/*.json', { eager: true, import: 'default' })

const NOMS: [string, string][] = [
  ['antoine-monokai', 'antoine-monokai'],
  ['monokai', 'Monokai'],
  ['atom-one-dark', 'Atom One Dark'],
  ['graphite', 'Graphite'],
  ['ink', 'Ink'],
  ['moss', 'Moss'],
  ['paper', 'Paper (clair)']
]

export const THEME_PAR_DEFAUT = 'antoine-monokai'

export const THEMES_FOURNIS: ThemeConnu[] = NOMS.map(([id, nom]) => {
  const theme = lireTheme(fichiers[`./themes/${id}.json`])
  if (!theme) throw new Error(`thème fourni illisible : ${id}`)
  return { id, nom, theme, source: 'fourni' }
})

// Les thèmes de VS Code proposés pour l'éditeur seulement (copiés par
// scripts/copier-grammaires.mjs dans public/vscode/themes/).
export const THEMES_EDITEUR_VSCODE: {
  id: 'vscode-dark-modern' | 'vscode-light-modern'
  nom: string
  fichier: string
}[] = [
  { id: 'vscode-dark-modern', nom: 'Dark Modern (VS Code)', fichier: 'themes/dark-modern.json' },
  { id: 'vscode-light-modern', nom: 'Light Modern (VS Code)', fichier: 'themes/light-modern.json' }
]
