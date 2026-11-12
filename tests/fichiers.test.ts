import { expect, test } from 'vitest'
import { langageDe, quoiFaire, type LangageVsCode } from '../src/shared/fichiers'

test('langageDe reconnaît le Markdown et retombe sur plaintext', () => {
  expect(langageDe('NOTES.MD')).toBe('markdown')
  expect(langageDe('x.inconnu')).toBe('plaintext')
  expect(langageDe('src/a.ts')).toBe('typescript')
})

// Extrait du langages.json tiré de VS Code.
const L: LangageVsCode[] = [
  {
    id: 'dockerfile',
    extensions: ['.dockerfile'],
    filenames: ['Dockerfile'],
    filenamePatterns: ['Dockerfile.*']
  },
  { id: 'go', extensions: ['.go'] },
  { id: 'json', extensions: ['.json'] },
  {
    id: 'jsonc',
    extensions: ['.jsonc', '.eslintrc.json'],
    filenames: ['tsconfig.json'],
    filenamePatterns: ['tsconfig.*.json']
  },
  { id: 'typescript', extensions: ['.ts', '.cts', '.mts'] }
]

test('langageDe avec le registre de VS Code', () => {
  expect(langageDe('/p/Dockerfile', L)).toBe('dockerfile')
  expect(langageDe('/p/Dockerfile.prod', L)).toBe('dockerfile')
  expect(langageDe('/p/.prettierrc', L)).toBe('json')
  expect(langageDe('/p/tsconfig.json', L)).toBe('json')
  expect(langageDe('/p/tsconfig.node.json', L)).toBe('json')
  expect(langageDe('/p/.eslintrc.json', L)).toBe('json')
  expect(langageDe('/p/a.go', L)).toBe('go')
  expect(langageDe('/p/a.TS', L)).toBe('typescript')
  expect(langageDe('/p/a.inconnu', L)).toBe('plaintext')
})

test('quoiFaire quand le disque change', () => {
  expect(quoiFaire(false, 'a', 'b')).toBe('recharger')
  expect(quoiFaire(false, 'a', 'a')).toBe('rien')
  expect(quoiFaire(true, 'a', 'b')).toBe('garder')
  expect(quoiFaire(false, 'a', null)).toBe('rien')
})
