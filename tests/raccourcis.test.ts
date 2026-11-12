import { expect, test } from 'vitest'
import {
  actionDe,
  COMMANDES,
  conflitDe,
  libelleTouches,
  tableRaccourcis,
  touchesDe,
  touchesEffectives,
  TOUCHES_REFUSEES,
  type Touche
} from '../src/shared/raccourcis'

const t = (code: string, mods: Partial<Touche> = {}, key = ''): Touche => ({
  key,
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods
})
const cmd = { metaKey: true }

test('⌘D divise à droite dans un terminal', () =>
  expect(actionDe(t('KeyD', cmd), 'terminal')).toEqual({ type: 'panneau.diviser', sens: 'right' }))
test('⇧⌘D divise en bas', () =>
  expect(actionDe(t('KeyD', { metaKey: true, shiftKey: true }), 'autre')).toEqual({
    type: 'panneau.diviser',
    sens: 'down'
  }))
test("⌘D reste à Monaco dans l'éditeur", () =>
  expect(actionDe(t('KeyD', cmd), 'editeur')).toBeNull())
test("⌘] change d'agent même dans l'éditeur", () =>
  expect(actionDe(t('BracketRight', cmd), 'editeur')).toEqual({ type: 'agent.voisin', pas: 1 }))
test('⇧⌘] onglet suivant', () =>
  expect(actionDe(t('BracketRight', { metaKey: true, shiftKey: true }), 'terminal')).toEqual({
    type: 'onglet.voisin',
    pas: 1
  }))
test('⌃Tab et ⌃⇧Tab', () => {
  expect(actionDe(t('Tab', { ctrlKey: true }), 'editeur')).toEqual({
    type: 'onglet.voisin',
    pas: 1
  })
  expect(actionDe(t('Tab', { ctrlKey: true, shiftKey: true }), 'terminal')).toEqual({
    type: 'onglet.voisin',
    pas: -1
  })
})
test('⌥⌘[ space précédent', () =>
  expect(actionDe(t('BracketLeft', { metaKey: true, altKey: true }), 'editeur')).toEqual({
    type: 'space.voisin',
    pas: -1
  }))
test("⌥⌘← va au panneau de gauche, pas dans l'éditeur", () => {
  expect(actionDe(t('ArrowLeft', { metaKey: true, altKey: true }), 'terminal')).toEqual({
    type: 'panneau.aller',
    direction: 'left'
  })
  expect(actionDe(t('ArrowLeft', { metaKey: true, altKey: true }), 'editeur')).toBeNull()
})
test('⌥⇧⌘← échange à gauche', () =>
  expect(
    actionDe(t('ArrowLeft', { metaKey: true, altKey: true, shiftKey: true }), 'terminal')
  ).toEqual({ type: 'panneau.echanger', direction: 'left' }))
test("F2 renomme l'onglet dans un terminal, pas dans l'éditeur", () => {
  expect(actionDe(t('F2'), 'terminal')).toEqual({ type: 'onglet.renommer' })
  expect(actionDe(t('F2'), 'editeur')).toBeNull()
  expect(actionDe(t('F2', { shiftKey: true }), 'autre')).toEqual({ type: 'space.renommer' })
})
test("⌘P ouvre la recherche de fichiers, même dans l'éditeur", () =>
  expect(actionDe(t('KeyP', cmd), 'editeur')).toEqual({ type: 'fichier.rechercher' }))
test('⇧⌘E et ⌘P partout, même dans l’éditeur et le terminal', () => {
  for (const c of ['editeur', 'terminal', 'autre', 'explorateur'] as const) {
    expect(actionDe(t('KeyE', { metaKey: true, shiftKey: true }), c)).toEqual({
      type: 'explorateur.basculer'
    })
    expect(actionDe(t('KeyP', { metaKey: true }), c)).toEqual({ type: 'fichier.rechercher' })
  }
})
test('les touches de l’explorateur seulement quand il a le clavier', () => {
  expect(actionDe(t('F2'), 'explorateur')).toEqual({ type: 'explorateur.renommer' })
  expect(actionDe(t('F2'), 'autre')).toEqual({ type: 'onglet.renommer' })
  expect(actionDe(t('KeyC', { metaKey: true }), 'explorateur')).toEqual({
    type: 'explorateur.copier'
  })
  expect(actionDe(t('KeyC', { metaKey: true }), 'terminal')).toBeNull()
  expect(actionDe(t('KeyV', { metaKey: true }), 'explorateur')).toEqual({
    type: 'explorateur.coller'
  })
  expect(actionDe(t('KeyC', { metaKey: true, altKey: true }), 'explorateur')).toEqual({
    type: 'explorateur.copierChemin'
  })
  expect(actionDe(t('Backspace', { metaKey: true }), 'explorateur')).toEqual({
    type: 'explorateur.corbeille'
  })
  expect(actionDe(t('Backspace', { metaKey: true }), 'autre')).toBeNull()
  // Le reste de la table reste valable dans l'explorateur.
  expect(actionDe(t('KeyT', cmd), 'explorateur')).toEqual({ type: 'onglet.nouveau' })
})
test('⇧⌘W ferme le panneau, ⇧⌘↵ agrandit', () => {
  expect(actionDe(t('KeyW', { metaKey: true, shiftKey: true }), 'terminal')).toEqual({
    type: 'panneau.fermer'
  })
  expect(actionDe(t('Enter', { metaKey: true, shiftKey: true }), 'terminal')).toEqual({
    type: 'panneau.agrandir'
  })
})
test("⌘T, ⌘W et ⌘3 passent aussi depuis l'éditeur", () => {
  expect(actionDe(t('KeyT', cmd), 'editeur')).toEqual({ type: 'onglet.nouveau' })
  expect(actionDe(t('KeyW', cmd), 'editeur')).toEqual({ type: 'onglet.fermer' })
  expect(actionDe(t('Digit3', cmd), 'editeur')).toEqual({ type: 'onglet.n', n: 3 })
})
test("⌘S et ⌘F : au terminal dans un terminal ; ⌘S pris à l'éditeur, ⌘F à Monaco", () => {
  expect(actionDe(t('KeyS', cmd), 'terminal')).toBeNull()
  expect(actionDe(t('KeyS', cmd), 'editeur')).toEqual({ type: 'fichier.enregistrer' })
  expect(actionDe(t('KeyS', cmd), 'autre')).toEqual({ type: 'fichier.enregistrer' })
  expect(actionDe(t('KeyF', cmd), 'terminal')).toBeNull()
  expect(actionDe(t('KeyF', cmd), 'editeur')).toBeNull()
  expect(actionDe(t('KeyF', cmd), 'autre')).toEqual({ type: 'fichier.chercher' })
})
test('zoom', () => {
  expect(actionDe(t('Equal', cmd), 'editeur')).toEqual({ type: 'zoom', pas: 1 })
  expect(actionDe(t('Minus', cmd), 'terminal')).toEqual({ type: 'zoom', pas: -1 })
  expect(actionDe(t('Digit0', cmd), 'terminal')).toEqual({ type: 'zoom', pas: 0 })
})
test('⌘B masque la colonne', () =>
  expect(actionDe(t('KeyB', cmd), 'editeur')).toEqual({ type: 'colonne.basculer' }))
test('une lettre seule part au terminal', () =>
  expect(actionDe(t('KeyA', {}, 'a'), 'terminal')).toBeNull())
test('⌃3 choisit le space 3', () =>
  expect(actionDe(t('Digit3', { ctrlKey: true }), 'terminal')).toEqual({ type: 'space.n', n: 3 }))
test('⌃C part au terminal', () =>
  expect(actionDe(t('KeyC', { ctrlKey: true }), 'terminal')).toBeNull())

test('⌘N crée un space, même depuis l’éditeur', () => {
  expect(actionDe(t('KeyN', cmd), 'terminal')).toEqual({ type: 'space.nouveau' })
  expect(actionDe(t('KeyN', cmd), 'editeur')).toEqual({ type: 'space.nouveau' })
})

test("⌥Z bascule le retour à la ligne dans l'éditeur et l'explorateur seulement", () => {
  const z = t('KeyZ', { altKey: true })
  expect(actionDe(z, 'editeur')).toEqual({ type: 'editeur.retourLigne' })
  expect(actionDe(z, 'explorateur')).toEqual({ type: 'editeur.retourLigne' })
  expect(actionDe(z, 'terminal')).toBeNull()
  expect(actionDe(z, 'autre')).toBeNull()
})

test("les touches du langage restent à Monaco dans l'éditeur", () => {
  for (const k of [
    t('F12'),
    t('F12', { shiftKey: true }),
    t('F2'),
    t('KeyD', cmd),
    t('ArrowUp', { altKey: true, metaKey: true }),
    t('ArrowDown', { altKey: true, metaKey: true }),
    t('KeyO', { shiftKey: true, altKey: true })
  ])
    expect(actionDe(k, 'editeur')).toBeNull()
})

test('touchesDe', () => {
  expect(touchesDe(t('KeyD', { metaKey: true, shiftKey: true }))).toBe('cmd-shift-d')
  expect(touchesDe(t('Tab', { ctrlKey: true }))).toBe('ctrl-tab')
  expect(touchesDe(t('BracketRight', { metaKey: true, altKey: true }))).toBe('cmd-alt-]')
  expect(touchesDe(t('F2', { shiftKey: true }))).toBe('shift-f2')
  expect(touchesDe(t('KeyZ', { altKey: true }))).toBe('alt-z')
  expect(touchesDe(t('Comma', cmd))).toBe('cmd-,')
  expect(touchesDe(t('Digit3', { ctrlKey: true }))).toBe('ctrl-3')
  expect(touchesDe(t('MetaLeft', cmd))).toBeNull()
  expect(touchesDe(t('ShiftRight', { shiftKey: true }))).toBeNull()
})

test('libelleTouches', () => {
  expect(libelleTouches('cmd-shift-d')).toBe('⇧⌘D')
  expect(libelleTouches('ctrl-tab')).toBe('⌃Tab')
  expect(libelleTouches('cmd-alt-left')).toBe('⌥⌘←')
  expect(libelleTouches('cmd-,')).toBe('⌘,')
  expect(libelleTouches('f2')).toBe('F2')
  expect(libelleTouches('cmd-shift-enter')).toBe('⇧⌘↵')
})

test('COMMANDES : libellés de la maquette, aucun id en double', () => {
  const libelle = (id: string): string | undefined => COMMANDES.find((c) => c.id === id)?.libelle
  expect(libelle('onglet.nouveau')).toBe('Nouvel onglet')
  expect(libelle('onglet.fermer')).toBe('Fermer')
  expect(libelle('panneau.diviserDroite')).toBe('Diviser à droite')
  expect(libelle('panneau.diviserBas')).toBe('Diviser en bas')
  expect(libelle('fichier.rechercher')).toBe('Rechercher un fichier')
  expect(libelle('explorateur.basculer')).toBe("Afficher l'explorateur")
  expect(libelle('onglet.renommer')).toBe("Renommer l'onglet")
  expect(libelle('fichier.enregistrer')).toBe('Enregistrer')
  expect(libelle('reglages.ouvrir')).toBe('Ouvrir les réglages')
  expect(COMMANDES.find((c) => c.id === 'reglages.ouvrir')?.touches).toEqual(['cmd-,'])
  expect(new Set(COMMANDES.map((c) => c.id)).size).toBe(COMMANDES.length)
  // Aucune touche d'origine en double.
  const toutes = COMMANDES.flatMap((c) => c.touches)
  expect(new Set(toutes).size).toBe(toutes.length)
  expect(TOUCHES_REFUSEES).toEqual(['cmd-q', 'cmd-h', 'cmd-alt-h', 'cmd-o'])
})

test('touches personnelles', () => {
  const perso = { 'panneau.diviserBas': ['cmd-alt-d'] }
  expect(touchesEffectives(perso)['panneau.diviserBas']).toEqual(['cmd-alt-d'])
  expect(touchesEffectives(perso)['panneau.diviserDroite']).toEqual(['cmd-d'])
  const table = tableRaccourcis(perso)
  expect(actionDe(t('KeyD', { metaKey: true, altKey: true }), 'terminal', table)).toEqual({
    type: 'panneau.diviser',
    sens: 'down'
  })
  expect(actionDe(t('KeyD', { metaKey: true, shiftKey: true }), 'terminal', table)).toBeNull()
  // Aucune touche : la commande ne part plus.
  expect(actionDe(t('KeyT', cmd), 'terminal', tableRaccourcis({ 'onglet.nouveau': [] }))).toBeNull()
})

test('conflits', () => {
  expect(conflitDe({}, 'panneau.diviserBas', 'cmd-d')?.libelle).toBe('Diviser à droite')
  expect(conflitDe({}, 'panneau.diviserBas', 'cmd-shift-d')).toBeNull()
  expect(conflitDe({}, 'panneau.diviserBas', 'cmd-alt-d')).toBeNull()
  // Une touche libérée par une touche personnelle n'est plus en conflit.
  expect(
    conflitDe({ 'panneau.diviserDroite': ['cmd-alt-d'] }, 'panneau.diviserBas', 'cmd-d')
  ).toBeNull()
  expect(
    conflitDe({ 'panneau.diviserDroite': ['cmd-alt-d'] }, 'panneau.diviserBas', 'cmd-alt-d')
      ?.libelle
  ).toBe('Diviser à droite')
  // Les touches fixes de Berger aussi.
  expect(conflitDe({}, 'panneau.diviserBas', 'cmd-shift-f')?.libelle).toBe(
    'Rechercher dans le projet'
  )
})

test("⌘, ouvre les réglages, même dans l'éditeur", () => {
  expect(actionDe(t('Comma', cmd), 'editeur')).toEqual({ type: 'reglages.ouvrir' })
  expect(actionDe(t('Comma', cmd), 'terminal')).toEqual({ type: 'reglages.ouvrir' })
})
