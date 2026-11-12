import { expect, test } from 'vitest'
import doc from './fixtures/herdr-app.json'
import {
  construireVue,
  dossierDuSpace,
  libelleEtat,
  terminauxDeLArbre,
  type TerminalCore
} from '../src/shared/spaces'

const vivant = (address: string, plus: Partial<TerminalCore> = {}): TerminalCore => ({
  address,
  name: null,
  title: '',
  cwd: '/x',
  state: 'live',
  status: null,
  foreground: null,
  labels: {},
  ...plus
})

test("terminauxDeLArbre rend les deux terminaux d'un onglet coupé en deux", () => {
  expect(terminauxDeLArbre(doc.spaces[0].tabs[0].root)).toEqual(['t2b', 't2c'])
})

test('un space sans nom prend le nom de son dossier, un space nommé garde son nom', () => {
  const vue = construireVue(doc, [vivant('t2b', { cwd: '/x/oovrage' }), vivant('t3')])
  expect(vue.spaces.map((s) => s.nom)).toEqual(['oovrage', 'Front'])
})

test('un terminal vivant rangé dans aucun space va dans « autres »', () => {
  const vue = construireVue(doc, [vivant('t2b'), vivant('t9', { name: 'berger-test' })])
  expect(vue.autres.map((t) => t.adresse)).toEqual(['t9'])
  expect(vue.autres[0].libelle).toBe('berger-test')
})

test("une adresse de l'arbre qui n'est plus vivante n'apparaît pas", () => {
  const vue = construireVue(doc, [vivant('t2b'), vivant('t2c')])
  expect(vue.spaces[0].terminaux.map((t) => t.adresse)).toEqual(['t2b', 't2c'])
})

test('libelleEtat traduit les états du core', () => {
  expect(libelleEtat(vivant('t1', { status: { state: 'working' } }))).toBe('au travail')
  expect(libelleEtat(vivant('t1', { status: { state: 'idle' } }))).toBe('en attente')
  expect(libelleEtat(vivant('t1', { status: { state: 'blocked' } }))).toBe('bloqué')
  expect(libelleEtat(vivant('t1'))).toBe('')
  expect(libelleEtat(vivant('t1', { state: 'finished' }))).toBe('terminé')
})

test('dossierDuSpace : foreground.cwd, puis cwd, puis folder', () => {
  const space = doc.spaces[0]
  const avec = (t: TerminalCore): Map<string, TerminalCore> => new Map([[t.address, t]])
  expect(dossierDuSpace(space, avec(vivant('t2b', { cwd: '/b', foreground: { cwd: '/a' } })))).toBe(
    '/a'
  )
  expect(dossierDuSpace(space, avec(vivant('t2b', { cwd: '/b' })))).toBe('/b')
  expect(dossierDuSpace(space, new Map())).toBe('/x/oovrage')
})

test('un space sans nom prend le nom du dossier où est son premier terminal maintenant', () => {
  const vue = construireVue(doc, [vivant('t2b', { cwd: '/x/claude-plugin' })])
  expect(vue.spaces[0].nom).toBe('claude-plugin')
})
