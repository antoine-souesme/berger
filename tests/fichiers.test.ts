import { expect, test } from 'vitest'
import { langageDe } from '../src/shared/fichiers'

test('langageDe reconnaît le Markdown et retombe sur plaintext', () => {
  expect(langageDe('NOTES.MD')).toBe('markdown')
  expect(langageDe('x.inconnu')).toBe('plaintext')
  expect(langageDe('src/a.ts')).toBe('typescript')
})
