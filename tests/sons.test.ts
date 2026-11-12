import { expect, test } from 'vitest'
import { sonAJouer } from '../src/shared/sons'

const aucun = new Set<string>()

test('un agent qui se met à attendre sonne, même regardé', () => {
  expect(sonAJouer({ t1: 'travail' }, { t1: 'attente' }, aucun)).toBe('attente')
  expect(sonAJouer({ t1: 'travail' }, { t1: 'attente' }, new Set(['t1']))).toBe('attente')
})

test('un agent qui finit sonne seulement s’il n’est pas regardé', () => {
  expect(sonAJouer({ t1: 'travail' }, { t1: 'fini' }, aucun)).toBe('fini')
  expect(sonAJouer({ t1: 'travail' }, { t1: 'fini' }, new Set(['t1']))).toBeNull()
})

test('l’attente passe avant la fin', () =>
  expect(sonAJouer({ a: 'travail', b: 'travail' }, { a: 'fini', b: 'attente' }, aucun)).toBe(
    'attente'
  ))

test('rien ne sonne sans changement, au lancement ou pour un nouveau terminal', () => {
  expect(sonAJouer({ t1: 'fini' }, { t1: 'fini' }, aucun)).toBeNull()
  expect(sonAJouer({}, { t1: 'attente', t2: 'fini' }, aucun)).toBeNull()
  expect(sonAJouer({ t1: 'fini' }, { t1: null }, aucun)).toBeNull()
  expect(sonAJouer({ t1: 'attente' }, { t1: 'travail' }, aucun)).toBeNull()
})
