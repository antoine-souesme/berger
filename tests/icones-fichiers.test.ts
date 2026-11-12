import { expect, test } from 'vitest'
import { iconeFichier } from '../src/shared/icones-fichiers'

test('iconeFichier : nom exact, extension double, dossier ouvert, repli', () => {
  expect(iconeFichier('package.json', false)).toBe('nodejs')
  expect(iconeFichier('index.d.ts', false)).toBe('typescript-def')
  expect(iconeFichier('src', true, true)).toBe('folder-src-open')
  expect(iconeFichier('zzz.inconnu', false)).toBe('file')
  expect(iconeFichier('inconnu', true)).toBe('folder')
})
