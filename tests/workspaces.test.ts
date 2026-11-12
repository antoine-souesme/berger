import { expect, test } from 'vitest'
import {
  changerEmoji,
  creer,
  deplacer,
  deplacerSpace,
  etatDuWorkspace,
  etatInitial,
  lireEtatWorkspaces,
  ouvrir,
  premierEmoji,
  rapprocher,
  renommer,
  reprendreDeHerdr,
  spacesVisibles,
  spaceVu,
  supprimer,
  workspaceDe,
  type EtatWorkspaces,
  type Workspace
} from '../src/shared/workspaces'

const ws = (id: string, spaces: string[], dernierSpace: string | null = null): Workspace => ({
  id,
  nom: id,
  emoji: '📁',
  spaces,
  dernierSpace
})

test('reprise : workspaces de Herdr, ordre, ouvert et dernier space gardés', () => {
  const e = reprendreDeHerdr(
    {
      list: [
        { id: 'pro', name: 'Pro', emoji: '🖥️', spaces: ['a', 'x'], lastSpace: 'a' },
        { id: 'perso', name: 'Perso', emoji: '🐑', spaces: ['b'], lastSpace: null }
      ],
      active: 'perso'
    },
    ['a', 'b', 'c']
  )
  expect(e.ouvert).toBe('perso')
  expect(e.liste.map((w) => w.spaces)).toEqual([['a'], ['b', 'c']]) // x fermé, c rejoint l'ouvert
  expect(e.liste[0]).toMatchObject({ nom: 'Pro', emoji: '🖥️', dernierSpace: 'a' })
})

test('reprise sans clé : un seul workspace Pro 💼 avec tous les spaces', () => {
  expect(reprendreDeHerdr(undefined, ['a', 'b']).liste).toEqual([
    expect.objectContaining({ nom: 'Pro', emoji: '💼', spaces: ['a', 'b'] })
  ])
})

test('reprise : entrées mal formées ignorées, ouvert inconnu → le premier', () => {
  const e = reprendreDeHerdr(
    {
      list: [
        { id: 3, name: 'X', spaces: [] },
        { id: 'ok', name: 'Ok', emoji: '🐑', spaces: ['a'] },
        { id: 'sans', name: 'Sans', spaces: 'a' }
      ],
      active: 'inconnu'
    },
    ['a']
  )
  expect(e.liste.map((w) => w.id)).toEqual(['ok'])
  expect(e.ouvert).toBe('ok')
  expect(reprendreDeHerdr({ list: [{ id: 1 }] }, ['a']).liste[0].nom).toBe('Pro')
})

test('rapprocher : un space nouveau va à la fin du workspace ouvert', () => {
  const e: EtatWorkspaces = { liste: [ws('pro', ['a']), ws('perso', ['b'])], ouvert: 'perso' }
  const r = rapprocher(e, ['a', 'b', 'c'])
  expect(r.liste.map((w) => w.spaces)).toEqual([['a'], ['b', 'c']])
  expect(e.liste[1].spaces).toEqual(['b']) // entrée intacte
})

test('rapprocher : un space fermé disparaît, le dernier space oublié', () => {
  const e: EtatWorkspaces = { liste: [ws('pro', ['a', 'b'], 'b')], ouvert: 'pro' }
  const r = rapprocher(e, ['a'])
  expect(r.liste[0]).toMatchObject({ spaces: ['a'], dernierSpace: null })
})

test('rapprocher : un space rangé nulle part (fermeture ratée) rejoint le workspace ouvert', () => {
  const e: EtatWorkspaces = { liste: [ws('pro', ['a']), ws('perso', [])], ouvert: 'pro' }
  expect(rapprocher(e, ['a', 'z']).liste[0].spaces).toEqual(['a', 'z'])
})

test('rapprocher : rien de changé rend le même objet', () => {
  const e: EtatWorkspaces = { liste: [ws('pro', ['a'], 'a'), ws('perso', ['b'])], ouvert: 'pro' }
  expect(rapprocher(e, ['a', 'b'])).toBe(e)
})

test('rapprocher : ouvert inconnu → le premier', () => {
  const e: EtatWorkspaces = { liste: [ws('pro', ['a'])], ouvert: 'parti' }
  expect(rapprocher(e, ['a']).ouvert).toBe('pro')
})

test('ouvrir rend le dernier space, sinon le premier, sinon null', () => {
  const e: EtatWorkspaces = {
    liste: [ws('pro', ['a', 'b'], 'b'), ws('perso', ['c'], 'parti'), ws('vide', [])],
    ouvert: 'pro'
  }
  expect(ouvrir(e, 'pro').afficher).toBe('b')
  expect(ouvrir(e, 'perso')).toMatchObject({ afficher: 'c', etat: { ouvert: 'perso' } })
  expect(ouvrir(e, 'vide').afficher).toBeNull()
  expect(ouvrir(e, 'inconnu')).toEqual({ etat: e, afficher: null })
})

test('creer : vide, nom coupé, devient l’ouvert, id unique', () => {
  const e: EtatWorkspaces = { liste: [ws('pro', ['a'])], ouvert: 'pro' }
  const r = creer(e, '  Labo ', '🧪')
  expect(r.liste).toHaveLength(2)
  expect(r.liste[1]).toMatchObject({ nom: 'Labo', emoji: '🧪', spaces: [], dernierSpace: null })
  expect(r.ouvert).toBe(r.liste[1].id)
  expect(r.liste[1].id.startsWith('ws-')).toBe(true)
  const deux = creer(r, 'Deux', '🐑')
  expect(new Set(deux.liste.map((w) => w.id)).size).toBe(3)
  expect(creer(e, 'X', '🐑', 'ws-fixe').liste[1].id).toBe('ws-fixe')
})

test('renommer et changerEmoji ne touchent que ce workspace', () => {
  const e: EtatWorkspaces = { liste: [ws('pro', ['a']), ws('perso', [])], ouvert: 'pro' }
  const r = renommer(e, 'perso', ' Maison ')
  expect(r.liste.map((w) => w.nom)).toEqual(['pro', 'Maison'])
  expect(renommer(e, 'perso', '   ')).toBe(e)
  expect(changerEmoji(e, 'pro', '🏢').liste.map((w) => w.emoji)).toEqual(['🏢', '📁'])
})

test('supprimer : liste figée des spaces à fermer, voisin de droite ouvert', () => {
  const e: EtatWorkspaces = {
    liste: [ws('a', ['s1']), ws('b', ['s2', 's3']), ws('c', ['s4', 's5'], 's5')],
    ouvert: 'b'
  }
  const r = supprimer(e, 'b')
  expect(r.fermer).toEqual(['s2', 's3'])
  expect(r.etat.ouvert).toBe('c')
  expect(r.afficher).toBe('s5')
  expect(r.etat.liste.map((w) => w.id)).toEqual(['a', 'c'])
  r.fermer.push('x')
  expect(e.liste[1].spaces).toEqual(['s2', 's3'])
  // Le dernier de la liste : le voisin de gauche.
  expect(supprimer(e, 'c').etat.ouvert).toBe('b')
  const g = supprimer({ ...e, ouvert: 'c' }, 'c')
  expect(g.etat.ouvert).toBe('b')
  expect(g.afficher).toBe('s2')
  // Supprimer un workspace qui n'est pas l'ouvert ne change pas l'ouvert.
  expect(supprimer(e, 'a')).toMatchObject({ etat: { ouvert: 'b' }, afficher: null })
})

test('supprimer refuse le dernier workspace', () => {
  const e: EtatWorkspaces = { liste: [ws('a', ['s1'])], ouvert: 'a' }
  expect(supprimer(e, 'a')).toEqual({ etat: e, fermer: [], afficher: null })
  expect(supprimer(e, 'inconnu').fermer).toEqual([])
})

test('deplacer et deplacerSpace bornent l’index', () => {
  const e: EtatWorkspaces = {
    liste: [ws('a', ['s1', 's2', 's3']), ws('b', []), ws('c', ['s4'])],
    ouvert: 'a'
  }
  expect(deplacer(e, 'c', -1).liste.map((w) => w.id)).toEqual(['c', 'a', 'b'])
  expect(deplacer(e, 'a', 99).liste.map((w) => w.id)).toEqual(['b', 'c', 'a'])
  expect(deplacer(e, 'a', 1).liste.map((w) => w.id)).toEqual(['b', 'a', 'c'])
  expect(deplacerSpace(e, 's3', -1).liste[0].spaces).toEqual(['s3', 's1', 's2'])
  expect(deplacerSpace(e, 's1', 99).liste[0].spaces).toEqual(['s2', 's3', 's1'])
  expect(deplacerSpace(e, 'inconnu', 0)).toBe(e)
})

test('spaceVu : retient le dernier space du workspace ouvert', () => {
  const e: EtatWorkspaces = { liste: [ws('a', ['s1', 's2'], 's1'), ws('b', ['s3'])], ouvert: 'a' }
  expect(spaceVu(e, 's2').liste[0].dernierSpace).toBe('s2')
  expect(spaceVu(e, 's1')).toBe(e)
  expect(spaceVu(e, 's3')).toBe(e) // pas dans l'ouvert (orphelin ou autre workspace)
})

test('spacesVisibles : ceux du workspace dans son ordre, puis les orphelins', () => {
  const e = { liste: [ws('pro', ['a']), ws('perso', ['c', 'b'])], ouvert: 'perso' }
  expect(spacesVisibles(e, ['a', 'b', 'c', 'z'])).toEqual(['c', 'b', 'z'])
})

test('workspaceDe', () => {
  const e = { liste: [ws('pro', ['a']), ws('perso', ['c', 'b'])], ouvert: 'perso' }
  expect(workspaceDe(e, 'b')).toBe('perso')
  expect(workspaceDe(e, 'z')).toBeNull()
})

test('etatDuWorkspace : t’attend > fini > au travail, orphelins compris', () => {
  const e = { liste: [ws('pro', ['a', 'b']), ws('perso', ['c'])], ouvert: 'pro' }
  expect(etatDuWorkspace(e, 'pro', { a: 'travail', b: 'fini', c: 'attente' })).toBe('fini')
  expect(etatDuWorkspace(e, 'pro', { a: 'travail', b: null })).toBe('travail')
  expect(etatDuWorkspace(e, 'perso', { a: 'travail', c: null, z: 'attente' })).toBe('attente')
  expect(etatDuWorkspace(e, 'perso', { a: 'attente' })).toBeNull()
})

test('premierEmoji garde un emoji composé entier', () => {
  expect(premierEmoji('🧑‍💻 dev')).toBe('🧑‍💻')
  expect(premierEmoji('  ')).toBe('')
  expect(premierEmoji(' 🐑')).toBe('🐑')
})

test('lireEtatWorkspaces refuse une forme invalide', () => {
  expect(lireEtatWorkspaces(null)).toBeNull()
  expect(lireEtatWorkspaces({})).toBeNull()
  expect(lireEtatWorkspaces({ liste: [] })).toBeNull()
  expect(
    lireEtatWorkspaces({ liste: [{ id: 'a', nom: 'A', emoji: '🐑', spaces: 'x' }], ouvert: 'a' })
  ).toBeNull()
  const bon = { liste: [ws('a', ['s1'], 's1')], ouvert: 'a' }
  expect(lireEtatWorkspaces(JSON.parse(JSON.stringify(bon)))).toEqual(bon)
})

test('etatInitial : Pro 💼 avec tous les spaces', () => {
  const e = etatInitial(['a', 'b'])
  expect(e.liste).toHaveLength(1)
  expect(e.liste[0]).toMatchObject({ nom: 'Pro', emoji: '💼', spaces: ['a', 'b'] })
  expect(e.ouvert).toBe(e.liste[0].id)
})
