import { expect, test } from 'vitest'
import {
  COULEUR_ETAT,
  dossierAffiche,
  etatAgent,
  nomOnglet,
  programme
} from '../src/shared/libelles'
import type { TerminalCore } from '../src/shared/spaces'

const t = (plus: Partial<TerminalCore> = {}): TerminalCore => ({
  address: 't1',
  name: null,
  title: 'antoine@machine:~/x',
  cwd: '/x',
  state: 'live',
  status: null,
  foreground: null,
  labels: {},
  ...plus
})

test('claude devient Claude Code', () =>
  expect(programme({ foreground: { name: 'claude', argv: ['claude'] } })).toEqual({
    nom: 'Claude Code',
    icone: 'bot'
  }))

test('Claude Code dont le nom de processus est sa version', () =>
  expect(programme({ foreground: { name: '2.1.322', argv: ['claude'] } }).nom).toBe('Claude Code'))

test('codex devient Codex', () =>
  expect(programme({ foreground: { argv: ['/opt/bin/codex', 'x'] } })).toEqual({
    nom: 'Codex',
    icone: 'bot'
  }))

test('lazygit', () =>
  expect(programme({ foreground: { name: 'lazygit', argv: ['lazygit'] } })).toEqual({
    nom: 'lazygit',
    icone: 'git-branch'
  }))

test('zsh lancé en -l', () =>
  expect(
    programme({ argv: ['/bin/zsh', '-l'], foreground: { argv: ['/bin/zsh', '-l'] } }).nom
  ).toBe('zsh'))

test('shell de connexion « -zsh »', () =>
  expect(programme({ foreground: { argv: ['-zsh'] } })).toEqual({ nom: 'zsh', icone: 'terminal' }))

test('sans premier plan, le programme lancé', () =>
  expect(programme({ argv: ['/usr/bin/bash'] })).toEqual({ nom: 'bash', icone: 'terminal' }))

test('autre programme : son nom de base', () =>
  expect(programme({ foreground: { argv: ['/usr/local/bin/htop'] } })).toEqual({
    nom: 'htop',
    icone: 'square-terminal'
  }))

test('dossier affiché', () => {
  expect(dossierAffiche('/Users/a/dev/playground/berger', '/Users/a')).toBe(
    '~/dev/playground/berger'
  )
  expect(dossierAffiche('/Users/a', '/Users/a')).toBe('~')
  expect(dossierAffiche('/Users/ab/x', '/Users/a')).toBe('/Users/ab/x')
  expect(dossierAffiche('/tmp', '')).toBe('/tmp')
})

test('onglet sans nom', () => {
  expect(nomOnglet('', 2)).toBe('3')
  expect(nomOnglet(undefined, 0)).toBe('1')
  expect(nomOnglet('revue', 0)).toBe('revue')
})

test("état d'un agent", () => {
  expect(etatAgent(t({ status: { state: 'working' } }))).toBe('travail')
  expect(etatAgent(t({ status: { state: 'idle' } }))).toBe('attente')
  expect(etatAgent(t({ status: { state: 'blocked' } }))).toBe('attente')
  expect(etatAgent(t({ status: { state: 'done' } }))).toBe('fini')
  expect(etatAgent(t())).toBeNull()
  expect(etatAgent(t({ state: 'finished', status: { state: 'working' } }))).toBeNull()
})

test('couleurs des états', () =>
  expect(COULEUR_ETAT).toEqual({ travail: '#e6db74', attente: '#f92672', fini: '#a6e22e' }))
