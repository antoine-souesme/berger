import { expect, test } from 'vitest'
import { schemaJson } from '../src/shared/schemas'

const s = (n: string): string => `https://json.schemastore.org/${n}.json`

test('table des fichiers connus', () => {
  expect(schemaJson('/p/package.json', '{}')).toBe(s('package'))
  expect(schemaJson('/p/tsconfig.json', '{}')).toBe(s('tsconfig'))
  expect(schemaJson('/p/tsconfig.node.json', '{}')).toBe(s('tsconfig'))
  expect(schemaJson('/p/jsconfig.json', '{}')).toBe(s('jsconfig'))
  expect(schemaJson('/p/.prettierrc', '{}')).toBe(s('prettierrc'))
  expect(schemaJson('/p/.prettierrc.json', '{}')).toBe(s('prettierrc'))
  expect(schemaJson('/p/.eslintrc', '{}')).toBe(s('eslintrc'))
  expect(schemaJson('/p/.eslintrc.json', '{}')).toBe(s('eslintrc'))
  expect(schemaJson('/p/.babelrc', '{}')).toBe(s('babelrc'))
  expect(schemaJson('/p/babel.config.json', '{}')).toBe(s('babelrc'))
  expect(schemaJson('/p/composer.json', '{}')).toBe(s('composer'))
})

test('le $schema déclaré passe avant la table', () => {
  expect(schemaJson('/p/x.json', '{ "$schema": "https://exemple.fr/s.json" }')).toBe(
    'https://exemple.fr/s.json'
  )
  expect(schemaJson('/p/package.json', '{ "$schema": "https://exemple.fr/s.json" }')).toBe(
    'https://exemple.fr/s.json'
  )
  expect(schemaJson('/p/x.json', '{}')).toBeNull()
})
