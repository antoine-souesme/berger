import { expect, test } from 'vitest'
import { filtrerFichiers, langageDe } from '../src/shared/fichiers'

const liste = ['src/main.ts', 'README.md', 'docs/vision.md']

test('filtre sur les lettres de la requête dans l’ordre', () => {
  expect(filtrerFichiers(liste, 'vis')).toEqual(['docs/vision.md'])
})

test('une requête vide rend toute la liste', () => {
  expect(filtrerFichiers(liste, '')).toEqual(liste)
})

test('sans tenir compte de la casse, le nom qui contient la requête d’un bloc passe en premier', () => {
  expect(filtrerFichiers(['a/readme.md', 'b/rdm.md'], 'RD')).toEqual(['b/rdm.md', 'a/readme.md'])
})

test('langageDe reconnaît le Markdown et retombe sur plaintext', () => {
  expect(langageDe('NOTES.MD')).toBe('markdown')
  expect(langageDe('x.inconnu')).toBe('plaintext')
  expect(langageDe('src/a.ts')).toBe('typescript')
})
