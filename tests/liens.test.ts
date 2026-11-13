import { expect, test } from 'vitest'
import { lienWeb } from '../src/shared/liens'

test('une adresse web est gardée', () => {
  expect(lienWeb('https://github.com/a/b/pull/12')).toBe('https://github.com/a/b/pull/12')
  expect(lienWeb('http://localhost:5173/')).toBe('http://localhost:5173/')
})

test('les autres adresses sont refusées', () => {
  expect(lienWeb('file:///etc/passwd')).toBeNull()
  expect(lienWeb('javascript:alert(1)')).toBeNull()
  expect(lienWeb('vscode://file/a')).toBeNull()
  expect(lienWeb('pas une adresse')).toBeNull()
})
