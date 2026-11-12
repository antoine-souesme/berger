// Règles pures du clavier : la table des commandes de Berger avec leurs touches
// d'origine (celles de Herdr, `~/.config/herdr-app/keys.json`), les touches
// personnelles des réglages, et le partage des touches entre Berger, le
// terminal et l'éditeur. Les touches sont reconnues par `code`, pour ne pas
// dépendre de la disposition du clavier, et écrites comme `cmd-shift-d`.
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
  | { type: 'editeur.retourLigne' }
  | { type: 'reglages.ouvrir' }
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

export type Commande = { id: string; libelle: string; action: ActionClavier; touches: string[] }

const cmd = (
  id: string,
  libelle: string,
  action: ActionClavier,
  ...touches: string[]
): Commande => ({ id, libelle, action, touches })

const NOMS_DIRECTION: [Direction, string, string, string][] = [
  ['left', 'gauche', 'de gauche', 'left'],
  ['right', 'droite', 'de droite', 'right'],
  ['up', 'haut', 'du haut', 'up'],
  ['down', 'bas', 'du bas', 'down']
]
const chiffres = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Les commandes modifiables, dans l'ordre de la fenêtre des réglages.
export const COMMANDES: Commande[] = [
  cmd('onglet.nouveau', 'Nouvel onglet', { type: 'onglet.nouveau' }, 'cmd-t'),
  cmd('onglet.fermer', 'Fermer', { type: 'onglet.fermer' }, 'cmd-w'),
  cmd(
    'panneau.diviserDroite',
    'Diviser à droite',
    { type: 'panneau.diviser', sens: 'right' },
    'cmd-d'
  ),
  cmd(
    'panneau.diviserBas',
    'Diviser en bas',
    { type: 'panneau.diviser', sens: 'down' },
    'cmd-shift-d'
  ),
  cmd('fichier.rechercher', 'Rechercher un fichier', { type: 'fichier.rechercher' }, 'cmd-p'),
  cmd(
    'explorateur.basculer',
    "Afficher l'explorateur",
    { type: 'explorateur.basculer' },
    'cmd-shift-e'
  ),
  cmd('onglet.renommer', "Renommer l'onglet", { type: 'onglet.renommer' }, 'f2'),
  cmd('fichier.enregistrer', 'Enregistrer', { type: 'fichier.enregistrer' }, 'cmd-s'),
  cmd('reglages.ouvrir', 'Ouvrir les réglages', { type: 'reglages.ouvrir' }, 'cmd-,'),
  cmd(
    'onglet.suivant',
    'Onglet suivant',
    { type: 'onglet.voisin', pas: 1 },
    'ctrl-tab',
    'cmd-shift-]'
  ),
  cmd(
    'onglet.precedent',
    'Onglet précédent',
    { type: 'onglet.voisin', pas: -1 },
    'ctrl-shift-tab',
    'cmd-shift-['
  ),
  ...chiffres.map((n) =>
    cmd(`onglet.${n}`, `Aller à l'onglet ${n}`, { type: 'onglet.n', n }, `cmd-${n}`)
  ),
  cmd('space.nouveau', 'Nouveau space', { type: 'space.nouveau' }, 'cmd-n'),
  cmd('space.renommer', 'Renommer le space', { type: 'space.renommer' }, 'shift-f2'),
  ...chiffres.map((n) =>
    cmd(`space.${n}`, `Aller au space ${n}`, { type: 'space.n', n }, `ctrl-${n}`)
  ),
  cmd('space.suivant', 'Space suivant', { type: 'space.voisin', pas: 1 }, 'cmd-alt-]'),
  cmd('space.precedent', 'Space précédent', { type: 'space.voisin', pas: -1 }, 'cmd-alt-['),
  cmd('agent.suivant', 'Agent suivant', { type: 'agent.voisin', pas: 1 }, 'cmd-]'),
  cmd('agent.precedent', 'Agent précédent', { type: 'agent.voisin', pas: -1 }, 'cmd-['),
  cmd('panneau.fermer', 'Fermer le panneau', { type: 'panneau.fermer' }, 'cmd-shift-w'),
  cmd('panneau.agrandir', 'Agrandir le panneau', { type: 'panneau.agrandir' }, 'cmd-shift-enter'),
  ...NOMS_DIRECTION.map(([direction, nom, de, touche]) =>
    cmd(
      `panneau.aller.${nom}`,
      `Aller au panneau ${de}`,
      { type: 'panneau.aller', direction },
      `cmd-alt-${touche}`
    )
  ),
  ...NOMS_DIRECTION.map(([direction, nom, de, touche]) =>
    cmd(
      `panneau.echanger.${nom}`,
      `Échanger avec le panneau ${de}`,
      { type: 'panneau.echanger', direction },
      `cmd-alt-shift-${touche}`
    )
  ),
  cmd('colonne.basculer', 'Masquer la colonne', { type: 'colonne.basculer' }, 'cmd-b'),
  cmd('zoom.plus', 'Zoom avant', { type: 'zoom', pas: 1 }, 'cmd-='),
  cmd('zoom.moins', 'Zoom arrière', { type: 'zoom', pas: -1 }, 'cmd--'),
  cmd('zoom.normal', 'Taille réelle', { type: 'zoom', pas: 0 }, 'cmd-0'),
  cmd('editeur.retourLigne', 'Retour à la ligne', { type: 'editeur.retourLigne' }, 'alt-z')
]

// Touches de Berger hors de la table modifiable : ⌘F (recherche dans le
// fichier) et les touches réservées aux outils à venir.
const COMMANDES_FIXES: Commande[] = [
  cmd('fichier.chercher', 'Rechercher dans le fichier', { type: 'fichier.chercher' }, 'cmd-f'),
  cmd('projet.rechercher', 'Rechercher dans le projet', { type: 'rien' }, 'cmd-shift-f'),
  cmd('commandes', 'Commandes', { type: 'rien' }, 'cmd-shift-p')
]

// Les touches du menu de l'application (Quitter, Masquer, Ouvrir un fichier).
export const TOUCHES_REFUSEES = ['cmd-q', 'cmd-h', 'cmd-alt-h', 'cmd-o']

// Les touches d'édition (copier, coller…) du terminal, de l'éditeur et des champs.
const TOUCHES_EDITION = ['cmd-c', 'cmd-v', 'cmd-x', 'cmd-z', 'cmd-shift-z', 'cmd-a']

// Pourquoi ces touches ne peuvent pas devenir un raccourci (null : elles peuvent).
// Une touche sans ⌘, ⌃ ni ⌥ (sauf F1 à F12) partirait à la place d'une lettre
// ou de Tab dans les terminaux.
export function refusTouches(touches: string): string | null {
  if (TOUCHES_REFUSEES.includes(touches)) return 'Touches réservées à macOS.'
  if (TOUCHES_EDITION.includes(touches))
    return "Touches réservées à l'édition (copier, coller, annuler…)."
  const mods = touches.split('-').slice(0, -1)
  const touche = touches.endsWith('--') ? '-' : touches.split('-').pop()!
  const fonction = /^f([1-9]|1[0-2])$/.test(touche)
  if (!fonction && !mods.some((m) => m === 'cmd' || m === 'ctrl' || m === 'alt'))
    return 'Ajoute ⌘, ⌃ ou ⌥ à la touche.'
  return null
}

const NOMS_CODE: Record<string, string> = {
  Tab: 'tab',
  Enter: 'enter',
  NumpadEnter: 'enter',
  Escape: 'escape',
  Space: 'space',
  Backspace: 'backspace',
  Delete: 'delete',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Home: 'home',
  End: 'end',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  IntlBackslash: '<'
}

// `cmd-shift-d` : les modificateurs (cmd, ctrl, alt, shift) puis la touche ;
// null pour une touche de modification seule ou une touche inconnue.
export function touchesDe(t: Touche): string | null {
  let nom: string | undefined
  const m = /^(?:Key([A-Z])|Digit([0-9])|(F[0-9]{1,2}))$/.exec(t.code)
  if (m) nom = (m[1] ?? m[2] ?? m[3]).toLowerCase()
  else nom = NOMS_CODE[t.code]
  if (!nom) return null
  return [
    t.metaKey ? 'cmd' : '',
    t.ctrlKey ? 'ctrl' : '',
    t.altKey ? 'alt' : '',
    t.shiftKey ? 'shift' : '',
    nom
  ]
    .filter(Boolean)
    .join('-')
}

const SYMBOLES: Record<string, string> = {
  tab: 'Tab',
  enter: '↵',
  escape: 'Esc',
  space: 'Espace',
  backspace: '⌫',
  delete: '⌦',
  left: '←',
  right: '→',
  up: '↑',
  down: '↓',
  home: '↖',
  end: '↘',
  pageup: '⇞',
  pagedown: '⇟'
}

// `cmd-shift-d` → `⇧⌘D` (ordre de macOS : ⌃ ⌥ ⇧ ⌘).
export function libelleTouches(touches: string): string {
  const parties = touches.split('-')
  // La touche « - » s'écrit `cmd--` : la dernière partie vide est le tiret.
  let touche = parties.pop() ?? ''
  if (touche === '' && parties[parties.length - 1] === '') {
    parties.pop()
    touche = '-'
  }
  const mods = new Set(parties)
  return (
    (mods.has('ctrl') ? '⌃' : '') +
    (mods.has('alt') ? '⌥' : '') +
    (mods.has('shift') ? '⇧' : '') +
    (mods.has('cmd') ? '⌘' : '') +
    (SYMBOLES[touche] ?? touche.toUpperCase())
  )
}

export type TableRaccourcis = Map<string, ActionClavier>

// Les touches de chaque commande : la touche personnelle remplace toutes
// celles d'origine de sa commande.
export function touchesEffectives(perso: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(COMMANDES.map((c) => [c.id, perso[c.id] ?? c.touches]))
}

export function tableRaccourcis(perso: Record<string, string[]>): TableRaccourcis {
  const table: TableRaccourcis = new Map()
  for (const c of COMMANDES_FIXES) for (const t of c.touches) table.set(t, c.action)
  const effectives = touchesEffectives(perso)
  for (const c of COMMANDES)
    for (const t of effectives[c.id]) if (!table.has(t)) table.set(t, c.action)
  return table
}

const TABLE_ORIGINE = tableRaccourcis({})

// La commande qui a déjà ces touches (autre que `id`), ou null.
export function conflitDe(
  perso: Record<string, string[]>,
  id: string,
  touches: string
): Commande | null {
  const fixe = COMMANDES_FIXES.find((c) => c.touches.includes(touches))
  if (fixe) return fixe
  const effectives = touchesEffectives(perso)
  return COMMANDES.find((c) => c.id !== id && effectives[c.id].includes(touches)) ?? null
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
  'rien',
  'editeur.retourLigne',
  'reglages.ouvrir',
  'fichier.enregistrer'
])

export function actionDe(
  touche: Touche,
  cible: Cible,
  table: TableRaccourcis = TABLE_ORIGINE
): ActionClavier | null {
  if (cible === 'explorateur') {
    const a = toucheExplorateur(touche)
    if (a) return a
  }
  const touches = touchesDe(touche)
  const action = touches ? table.get(touches) : undefined
  if (!action) return null
  if (cible === 'editeur') return PRIS_A_L_EDITEUR.has(action.type) ? action : null
  // ⌥Z : seulement quand l'éditeur ou l'explorateur a le clavier.
  if (action.type === 'editeur.retourLigne') return cible === 'explorateur' ? action : null
  if (
    cible === 'terminal' &&
    (action.type === 'fichier.enregistrer' || action.type === 'fichier.chercher')
  )
    return null
  return action
}
