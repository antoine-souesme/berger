import { expect, test } from 'vitest'
import { actionDe, type Touche } from '../src/shared/raccourcis'

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
  expect(actionDe(t('KeyC', { metaKey: true }), 'explorateur')).toEqual({ type: 'explorateur.copier' })
  expect(actionDe(t('KeyC', { metaKey: true }), 'terminal')).toBeNull()
  expect(actionDe(t('KeyV', { metaKey: true }), 'explorateur')).toEqual({ type: 'explorateur.coller' })
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
test("⌘S et ⌘F : au terminal dans un terminal, à Monaco dans l'éditeur", () => {
  expect(actionDe(t('KeyS', cmd), 'terminal')).toBeNull()
  expect(actionDe(t('KeyS', cmd), 'editeur')).toBeNull()
  expect(actionDe(t('KeyS', cmd), 'autre')).toEqual({ type: 'fichier.enregistrer' })
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
