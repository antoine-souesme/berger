import { expect, test } from 'vitest'
import doc from './fixtures/herdr-app.json'
import { agentVoisin, duree, listeAgents, type LigneAgent } from '../src/shared/agents'
import { construireVue, type TerminalCore } from '../src/shared/spaces'

// Le document de test : sp1 (tb1 : t2b | t2c ; tb2 : t99), sp2 « Front » (tb3 : t3).
const t = (address: string, plus: Partial<TerminalCore> = {}): TerminalCore => ({
  address,
  name: null,
  title: '',
  cwd: '/x/oovrage',
  state: 'live',
  status: null,
  foreground: null,
  labels: {},
  ...plus
})
const claude = (state: string, plus: Partial<TerminalCore> = {}): Partial<TerminalCore> => ({
  status: { state, app: 'claude' },
  ...plus
})
const vue = (terminaux: TerminalCore[]): ReturnType<typeof construireVue> =>
  construireVue(doc, terminaux, '')
const cles = (l: LigneAgent[]): [string, string[]][] => l.map((x) => [x.cle, x.traits])

test('ancienne règle : agents dans l’ordre des spaces puis des onglets', () => {
  const v = vue([
    t('t2b', claude('working')),
    t('t2c'),
    t('t99', claude('idle')),
    t('t3', claude('done'))
  ])
  const l = listeAgents(v, ['sp1', 'sp2'], 'spaces')
  expect(l.map((x) => x.adresse)).toEqual(['t2b', 't99', 't3'])
  expect(l[1].place).toEqual({ space: 'sp1', onglet: 'tb2', panneau: 'p3', adresse: 't99' })
  expect(l[2]).toMatchObject({
    space: 'sp2',
    nomSpace: 'Front',
    agent: 'fini',
    traits: []
  })
})

test('un sous-agent hc run se range sous son parent, avec ses traits', () => {
  // t2b (Claude, au travail) ; t5 (parent t2b, t'attend) et t6 (parent t5), sans panneau.
  const v = vue([
    t('t2b', claude('working')),
    t('t5', claude('idle', { parent: 't2b', labels: { 'herdr.space': 'sp1' } })),
    t('t6', { parent: 't5' })
  ])
  const l = listeAgents(v, ['sp1'], 'spaces')
  expect(cles(l)).toEqual([
    ['t2b', []],
    ['t5', ['└']],
    ['t6', ['', '└']]
  ])
  expect(l[2].place).toEqual(l[0].place)
  // Au repos : un agent sans point, comme dans Herdr.
  expect(l[1]).toMatchObject({ agent: null, space: 'sp1' })
})

test('un enfant avec son propre panneau garde sa place, sans ligne de premier niveau', () => {
  const v = vue([t('t2b', claude('working')), t('t99', claude('idle', { parent: 't2b' }))])
  const l = listeAgents(v, ['sp1'], 'spaces')
  expect(cles(l)).toEqual([
    ['t2b', []],
    ['t99', ['└']]
  ])
  expect(l[1].place).toEqual({ space: 'sp1', onglet: 'tb2', panneau: 'p3', adresse: 't99' })
})

test('petits-enfants rangés en profondeur, avec leurs traits', () => {
  const v = vue([
    t('t2b', claude('working')),
    t('t5', { parent: 't2b' }),
    t('t6', { parent: 't5' })
  ])
  expect(cles(listeAgents(v, ['sp1'], 'spaces'))).toEqual([
    ['t2b', []],
    ['t5', ['└']],
    ['t6', ['', '└']]
  ])
})

test('un enfant dont le parent n’est pas visible garde sa propre ligne', () => {
  const v = vue([t('t3', claude('done')), t('t99', claude('idle', { parent: 't3' }))])
  expect(cles(listeAgents(v, ['sp1'], 'spaces'))).toEqual([['t99', []]])
  expect(cles(listeAgents(v, ['sp1', 'sp2'], 'spaces'))).toEqual([
    ['t3', []],
    ['t99', ['└']]
  ])
})

test('un enfant mort ne s’affiche pas', () => {
  const v = vue([t('t2b', claude('working')), t('t5', { parent: 't2b', state: 'finished' })])
  expect(cles(listeAgents(v, ['sp1'], 'spaces'))).toEqual([['t2b', []]])
})

test('filtre sur les spaces visibles, dans leur ordre', () => {
  const v = vue([t('t2b', claude('working')), t('t99', claude('idle')), t('t3', claude('done'))])
  expect(listeAgents(v, ['sp2', 'sp1'], 'spaces').map((x) => x.cle)).toEqual(['t3', 't2b', 't99'])
  expect(listeAgents(v, ['sp2'], 'spaces').map((x) => x.cle)).toEqual(['t3'])
  expect(listeAgents(v, [], 'spaces')).toEqual([])
})

test('tri urgence : t’attend, fini, au travail ; plus récent d’abord', () => {
  const v = vue([
    t('t2b', claude('working', { status_ms: 5000 })),
    t('t2c', claude('working', { status_ms: 8000 })),
    t('t99', claude('done', { status_ms: 1000 })),
    t('t3', claude('blocked', { status_ms: 2000 }))
  ])
  expect(listeAgents(v, ['sp1', 'sp2'], 'urgence').map((x) => x.cle)).toEqual([
    't3',
    't99',
    't2c',
    't2b'
  ])
})

test('tri urgence : un parent prend l’urgence de son sous-agent, qui le suit', () => {
  const v = vue([
    t('t2b', claude('working')),
    t('t5', claude('blocked', { parent: 't2b' })),
    t('t3', claude('done'))
  ])
  expect(listeAgents(v, ['sp1', 'sp2'], 'urgence').map((x) => x.cle)).toEqual(['t2b', 't5', 't3'])
})

test('agentVoisin saute les sous-agents sans panneau et boucle', () => {
  const v = vue([
    t('t2b', claude('working')),
    t('t5', { parent: 't2b' }),
    t('t99', claude('idle')),
    t('t3', claude('done'))
  ])
  const l = listeAgents(v, ['sp1', 'sp2'], 'spaces')
  expect(l.map((x) => x.cle)).toEqual(['t2b', 't5', 't99', 't3'])
  expect(agentVoisin(l, 't2b', 1)?.adresse).toBe('t99') // t5 n'a pas de panneau à lui
  expect(agentVoisin(l, 't3', 1)?.adresse).toBe('t2b')
  expect(agentVoisin(l, 't2b', -1)?.adresse).toBe('t3')
  expect(agentVoisin(l, null, 1)?.adresse).toBe('t2b')
  expect(agentVoisin(l, null, -1)?.adresse).toBe('t3')
  expect(agentVoisin([], null, 1)).toBeNull()
})

test('duree', () => {
  expect(duree(30_000)).toBe('<1m')
  expect(duree(12 * 60_000)).toBe('12m')
  expect(duree(3 * 3_600_000)).toBe('3h')
  expect(duree(50 * 3_600_000)).toBe('2j')
  expect(duree(-5)).toBe('<1m')
})
