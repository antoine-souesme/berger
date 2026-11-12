// Règles pures du clavier : la table des raccourcis de Herdr
// (`~/.config/herdr-app/keys.json`) et le partage des touches entre Berger,
// le terminal et l'éditeur. Les touches sont reconnues par `code`, pour ne
// pas dépendre de la disposition du clavier.
import type { Direction, Sens } from './arbre'

export type ActionClavier =
  | { type: 'onglet.nouveau' }
  | { type: 'onglet.fermer' }
  | { type: 'onglet.voisin'; pas: 1 | -1 }
  | { type: 'onglet.n'; n: number }
  | { type: 'space.n'; n: number }
  | { type: 'space.voisin'; pas: 1 | -1 }
  | { type: 'agent.voisin'; pas: 1 | -1 }
  | { type: 'panneau.diviser'; sens: Sens }
  | { type: 'panneau.fermer' }
  | { type: 'panneau.agrandir' }
  | { type: 'panneau.aller'; direction: Direction }
  | { type: 'panneau.echanger'; direction: Direction }
  | { type: 'onglet.renommer' }
  | { type: 'space.renommer' }
  | { type: 'space.nouveau' }
  | { type: 'colonne.basculer' }
  | { type: 'zoom'; pas: 1 | -1 | 0 }
  | { type: 'fichier.enregistrer' }
  | { type: 'fichier.chercher' }
  | { type: 'fichier.rechercher' }
  | { type: 'explorateur.basculer' }
  | { type: 'explorateur.renommer' }
  | { type: 'explorateur.copier' }
  | { type: 'explorateur.coller' }
  | { type: 'explorateur.copierChemin' }
  | { type: 'explorateur.corbeille' }
  | { type: 'rien' }

export type Touche = {
  key: string
  code: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}
export type Cible = 'terminal' | 'editeur' | 'explorateur' | 'autre'

const FLECHES: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down'
}

const chiffre = (code: string): number | null => {
  const m = /^Digit([1-9])$/.exec(code)
  return m ? Number(m[1]) : null
}

const modificateurs = (t: Touche): string =>
  (t.ctrlKey ? 'c' : '') + (t.altKey ? 'a' : '') + (t.shiftKey ? 's' : '') + (t.metaKey ? 'm' : '')

// Les touches de l'explorateur, quand il a le clavier (comme dans VS Code).
function toucheExplorateur(t: Touche): ActionClavier | null {
  const mods = modificateurs(t)
  if (mods === '' && t.code === 'F2') return { type: 'explorateur.renommer' }
  if (mods === 'm' && t.code === 'KeyC') return { type: 'explorateur.copier' }
  if (mods === 'm' && t.code === 'KeyV') return { type: 'explorateur.coller' }
  if (mods === 'am' && t.code === 'KeyC') return { type: 'explorateur.copierChemin' }
  if (mods === 'm' && t.code === 'Backspace') return { type: 'explorateur.corbeille' }
  return null
}

// La table entière, sans tenir compte de qui a le clavier.
function table(t: Touche): ActionClavier | null {
  const mods = modificateurs(t)
  const n = chiffre(t.code)
  switch (mods) {
    case '':
      if (t.code === 'F2') return { type: 'onglet.renommer' }
      return null
    case 's':
      if (t.code === 'F2') return { type: 'space.renommer' }
      return null
    case 'c':
      if (t.code === 'Tab') return { type: 'onglet.voisin', pas: 1 }
      if (n) return { type: 'space.n', n }
      return null
    case 'cs':
      if (t.code === 'Tab') return { type: 'onglet.voisin', pas: -1 }
      return null
    case 'm':
      if (n) return { type: 'onglet.n', n }
      switch (t.code) {
        case 'KeyT':
          return { type: 'onglet.nouveau' }
        case 'KeyN':
          return { type: 'space.nouveau' }
        case 'KeyW':
          return { type: 'onglet.fermer' }
        case 'BracketRight':
          return { type: 'agent.voisin', pas: 1 }
        case 'BracketLeft':
          return { type: 'agent.voisin', pas: -1 }
        case 'KeyD':
          return { type: 'panneau.diviser', sens: 'right' }
        case 'KeyB':
          return { type: 'colonne.basculer' }
        case 'Equal':
          return { type: 'zoom', pas: 1 }
        case 'Minus':
          return { type: 'zoom', pas: -1 }
        case 'Digit0':
          return { type: 'zoom', pas: 0 }
        case 'KeyS':
          return { type: 'fichier.enregistrer' }
        case 'KeyF':
          return { type: 'fichier.chercher' }
        case 'KeyP':
          return { type: 'fichier.rechercher' }
        case 'Comma':
          return { type: 'rien' }
      }
      return null
    case 'sm':
      switch (t.code) {
        case 'BracketRight':
          return { type: 'onglet.voisin', pas: 1 }
        case 'BracketLeft':
          return { type: 'onglet.voisin', pas: -1 }
        case 'KeyD':
          return { type: 'panneau.diviser', sens: 'down' }
        case 'KeyW':
          return { type: 'panneau.fermer' }
        case 'Enter':
          return { type: 'panneau.agrandir' }
        case 'KeyE':
          return { type: 'explorateur.basculer' }
        case 'KeyP':
        case 'KeyF':
          return { type: 'rien' }
      }
      return null
    case 'am':
      if (t.code === 'BracketRight') return { type: 'space.voisin', pas: 1 }
      if (t.code === 'BracketLeft') return { type: 'space.voisin', pas: -1 }
      if (FLECHES[t.code]) return { type: 'panneau.aller', direction: FLECHES[t.code] }
      return null
    case 'asm':
      if (FLECHES[t.code]) return { type: 'panneau.echanger', direction: FLECHES[t.code] }
      return null
  }
  return null
}

// Ce que Berger prend à l'éditeur : changer d'onglet, de space ou d'agent,
// ouvrir un outil de Berger, le zoom. Le reste appartient à Monaco.
const PRIS_A_L_EDITEUR = new Set<ActionClavier['type']>([
  'onglet.nouveau',
  'onglet.fermer',
  'onglet.n',
  'space.n',
  'onglet.voisin',
  'space.voisin',
  'space.nouveau',
  'agent.voisin',
  'colonne.basculer',
  'explorateur.basculer',
  'fichier.rechercher',
  'zoom',
  'rien'
])

export function actionDe(touche: Touche, cible: Cible): ActionClavier | null {
  if (cible === 'explorateur') {
    const a = toucheExplorateur(touche)
    if (a) return a
  }
  const action = table(touche)
  if (!action) return null
  if (cible === 'editeur') return PRIS_A_L_EDITEUR.has(action.type) ? action : null
  if (
    cible === 'terminal' &&
    (action.type === 'fichier.enregistrer' || action.type === 'fichier.chercher')
  )
    return null
  return action
}
