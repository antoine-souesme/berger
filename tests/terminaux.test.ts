import { expect, test } from 'vitest'
import { appliquerEvenement, evenementNeuf } from '../src/shared/terminaux'
import type { TerminalCore } from '../src/shared/spaces'

const t = (address: string): TerminalCore => ({
  address,
  name: null,
  title: '',
  cwd: '/x',
  state: 'live',
  status: null,
  foreground: null,
  labels: {}
})

test('created ajoute, removed retire', () => {
  const table = new Map<string, TerminalCore>()
  appliquerEvenement(table, { type: 'created', terminal: 't5', data: t('t5') })
  expect(table.has('t5')).toBe(true)
  appliquerEvenement(table, { type: 'removed', terminal: 't5', data: {} })
  expect(table.has('t5')).toBe(false)
})

test('title, foreground et finished mettent à jour le terminal', () => {
  const table = new Map([['t5', t('t5')]])
  appliquerEvenement(table, { type: 'title', terminal: 't5', data: { title: 'claude' } })
  appliquerEvenement(table, {
    type: 'foreground',
    terminal: 't5',
    data: { cwd: '/y', name: 'zsh' }
  })
  expect(table.get('t5')!.title).toBe('claude')
  expect(table.get('t5')!.foreground?.cwd).toBe('/y')
  appliquerEvenement(table, { type: 'finished', terminal: 't5', data: { exit_code: 0 } })
  expect(table.get('t5')!.state).toBe('finished')
})

test('status remplace le statut, avec ou sans enveloppe', () => {
  const table = new Map([['t5', t('t5')]])
  appliquerEvenement(table, {
    type: 'status',
    terminal: 't5',
    data: { status: { state: 'working' } }
  })
  expect(table.get('t5')!.status?.state).toBe('working')
  appliquerEvenement(table, { type: 'status', terminal: 't5', data: { state: 'idle' } })
  expect(table.get('t5')!.status?.state).toBe('idle')
})

test('un événement sur un terminal inconnu ne plante pas', () => {
  const table = new Map<string, TerminalCore>()
  expect(() =>
    appliquerEvenement(table, { type: 'title', terminal: 'tx', data: { title: 'a' } })
  ).not.toThrow()
})

test('evenementNeuf ignore les événements déjà couverts par un instantané', () => {
  expect(evenementNeuf(null, 3)).toBe(true)
  expect(evenementNeuf(5, 6)).toBe(true)
  expect(evenementNeuf(5, 5)).toBe(false)
  expect(evenementNeuf(5, 2)).toBe(false)
  expect(evenementNeuf(5, undefined)).toBe(true)
})

// Trame réelle du core (hc events) : `turn` porte l'état du statut qu'on vient
// de quitter, pas l'état du terminal.
test('turn ne change que le tour, le terminal reste vivant', () => {
  const table = new Map([['t5', { ...t('t5'), status: { state: 'working' } }]])
  appliquerEvenement(table, {
    type: 'turn',
    terminal: 't5',
    data: { state: 'idle', turn: 1 },
    seq: 8958
  })
  expect(table.get('t5')!.state).toBe('live')
  expect(table.get('t5')!.status?.state).toBe('working')
  expect(table.get('t5')!.turn).toBe(1)
})
