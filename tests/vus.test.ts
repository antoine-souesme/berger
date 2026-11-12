import { expect, test } from 'vitest'
import { cleVu, vusAJour } from '../src/shared/vus'
import type { TerminalCore } from '../src/shared/spaces'

const t = (address: string, state: string, status_ms = 1): TerminalCore => ({
  address,
  name: null,
  title: '',
  cwd: '',
  state: 'live',
  status: { state },
  status_ms,
  labels: {}
})

test('cleVu : seulement un agent fini, avec le moment où il a fini', () => {
  expect(cleVu(t('t1', 'done', 42))).toBe('t1@42')
  expect(cleVu(t('t1', 'working'))).toBeNull()
})

test('vusAJour : ajoute les agents finis regardés, oublie ceux qui ont changé', () => {
  const tous = [t('t1', 'done', 5), t('t2', 'working'), t('t3', 'done', 9)]
  expect(vusAJour(['t3@9', 't1@2', 't4@1'], tous, ['t1', 't2'])).toEqual(['t3@9', 't1@5'])
})

test('un agent qui finit de nouveau reprend son point', () => {
  const vus = vusAJour([], [t('t1', 'done', 5)], ['t1'])
  expect(vusAJour(vus, [t('t1', 'done', 8)], [])).toEqual([])
})
