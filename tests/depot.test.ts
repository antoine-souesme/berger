import { expect, test } from 'vitest'
import { echapperChemin, texteDepot } from '../src/shared/depot'

test('un chemin simple reste tel quel', () =>
  expect(echapperChemin('/Users/a/dev/src/a.ts')).toBe('/Users/a/dev/src/a.ts'))

test('les espaces et caractères du shell sont échappés', () => {
  expect(echapperChemin('/Users/a/Mes documents/l’été (2).pdf')).toBe(
    '/Users/a/Mes\\ documents/l’été\\ \\(2\\).pdf'
  )
  expect(echapperChemin("/tmp/it's $HOME&co")).toBe("/tmp/it\\'s\\ \\$HOME\\&co")
})

test('plusieurs chemins se suivent, avec une espace à la fin', () => {
  expect(texteDepot(['/a b', '/c'])).toBe('/a\\ b /c ')
  expect(texteDepot([])).toBe('')
  expect(texteDepot([''])).toBe('')
})
