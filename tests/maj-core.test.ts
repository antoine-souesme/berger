import { expect, test } from 'vitest'
import { comparerVersions, versionDeHc, versionDisponible } from '../src/shared/maj-core'

test('les versions se comparent nombre par nombre', () => {
  expect(comparerVersions('0.1.9', '0.1.10')).toBeLessThan(0)
  expect(comparerVersions('0.1.21', '0.1.21')).toBe(0)
  expect(comparerVersions('0.2.0', '0.1.99')).toBeGreaterThan(0)
})

test('une version plus récente de la même génération est disponible', () =>
  expect(versionDisponible('0.1.20', { version: '0.1.21', generation: 1 })).toBe('0.1.21'))

test('rien de disponible pour une version égale, plus ancienne ou d’une autre génération', () => {
  expect(versionDisponible('0.1.21', { version: '0.1.21', generation: 1 })).toBeNull()
  expect(versionDisponible('0.1.22', { version: '0.1.21', generation: 1 })).toBeNull()
  expect(versionDisponible('0.1.20', { version: '0.2.0', generation: 2 })).toBeNull()
})

test('un fichier publié mal formé ne propose rien', () => {
  expect(versionDisponible('0.1.20', null)).toBeNull()
  expect(versionDisponible('0.1.20', {})).toBeNull()
  expect(versionDisponible('0.1.20', { version: 3, generation: 1 })).toBeNull()
  expect(versionDisponible('0.1.20', { version: 'bof', generation: 1 })).toBeNull()
})

test('la version se lit dans la sortie de hc --version', () => {
  expect(versionDeHc('hc 0.1.20\n')).toBe('0.1.20')
  expect(versionDeHc('bof')).toBeNull()
})
