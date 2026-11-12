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

test('la vue porte les onglets et leurs arbres', () => {
  const vue = construireVue(doc, [vivant('t2b'), vivant('t2c')], '/x')
  expect(vue.spaces[0].onglets.map((o) => o.nom)).toEqual(['1', '2'])
  expect(vue.spaces[0].onglets[0].racine).toBe(doc.spaces[0].tabs[0].root)
})

test("l'onglet prend l'état de son agent le plus pressant", () => {
  const vue = construireVue(doc, [
    vivant('t2b', { status: { state: 'working' } }),
    vivant('t2c', { status: { state: 'idle' } }),
    vivant('t99', { status: { state: 'done' } })
  ])
  expect(vue.spaces[0].onglets.map((o) => o.agent)).toEqual(['attente', 'fini'])
  expect(vue.spaces[1].onglets[0].agent).toBeNull()
})

test('un terminal de la vue : programme, dossier avec ~, clics droits', () => {
  const vue = construireVue(
    doc,
    [
      vivant('t2b', {
        cwd: '/Users/a/dev',
        foreground: { cwd: '/Users/a/dev/berger', name: 'zsh', argv: ['/bin/zsh'] },
        labels: { 'herdr.right-click': 'program' }
      })
    ],
    '/Users/a'
  )
  const t = vue.terminaux['t2b']
  expect(t.programme).toEqual({ nom: 'zsh', icone: 'terminal' })
  expect(t.dossier).toBe('~/dev/berger')
  expect(t.clicsDroitsAuProgramme).toBe(true)
  expect(t.vivant).toBe(true)
  expect(t.agent).toBeNull()
})

test('un space sans dossier garde un dossier vide', () => {
  const sansDossier = { spaces: [{ id: 'sp9', name: 'x', tabs: [] }] }
  expect(construireVue(sansDossier, []).spaces[0].dossier).toBe('')
})
