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
  | { type: 'rien' }

export type Touche = {
  key: string
  code: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}
export type Cible = 'terminal' | 'editeur' | 'autre'

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

// La table entière, sans tenir compte de qui a le clavier.
function table(t: Touche): ActionClavier | null {
  const mods =
    (t.ctrlKey ? 'c' : '') +
    (t.altKey ? 'a' : '') +
    (t.shiftKey ? 's' : '') +
    (t.metaKey ? 'm' : '')
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
        case 'KeyP':
        case 'KeyF':
        case 'KeyE':
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
  'zoom',
  'rien'
])

export function actionDe(touche: Touche, cible: Cible): ActionClavier | null {
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
