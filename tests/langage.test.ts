import { expect, test } from 'vitest'
import type { TextEdit } from 'vscode-languageserver-protocol'
import {
  appliquerEditions,
  editionsParFichier,
  graviteMonaco,
  idLsp,
  plageDeLsp,
  plageVersLsp,
  racineProjet,
  serveurDe,
  texteSurvol,
  tsserverDe,
  versLsp
} from '../src/shared/langage'

const ed = (l1: number, c1: number, l2: number, c2: number, newText: string): TextEdit => ({
  range: { start: { line: l1, character: c1 }, end: { line: l2, character: c2 } },
  newText
})

test('serveurDe et idLsp', () => {
  expect(serveurDe('/a/b.TSX')).toBe('typescript')
  expect(serveurDe('/a/ci.yml')).toBe('yaml')
  expect(serveurDe('/a/x.cjs')).toBe('typescript')
  expect(serveurDe('/a/package.json')).toBeNull()
  expect(idLsp('/a/b.tsx')).toBe('typescriptreact')
  expect(idLsp('/a/b.mjs')).toBe('javascript')
  expect(idLsp('/a/b.jsx')).toBe('javascriptreact')
  expect(idLsp('/a/b.ts')).toBe('typescript')
  expect(idLsp('/a/b.yaml')).toBe('yaml')
})

test('racineProjet', () => {
  expect(racineProjet('/p/node_modules/x/index.d.ts', () => false)).toBe('/p')
  const existe = (p: string): boolean => p === '/p/package.json'
  expect(racineProjet('/p/src/a/b.ts', existe)).toBe('/p')
  expect(racineProjet('/q/c.ts', () => false)).toBe('/q')
})

test('tsserverDe', () => {
  const depot = '/p/node_modules/typescript/lib/tsserver.js'
  expect(tsserverDe('/p', (p) => p === depot, '/berger/ts.js')).toBe(depot)
  expect(tsserverDe('/p', () => false, '/berger/ts.js')).toBe('/berger/ts.js')
})

test('appliquerEditions compte en UTF-16, dans le désordre', () => {
  const texte = 'const café = 1 // 🐑\nx'
  const a = ed(0, 6, 0, 10, 'thé')
  const b = ed(1, 0, 1, 1, 'y')
  expect(appliquerEditions(texte, [a, b])).toBe('const thé = 1 // 🐑\ny')
  expect(appliquerEditions(texte, [b, a])).toBe('const thé = 1 // 🐑\ny')
  // l'émoji commence en 18 et vaut 2 unités : la fin de ligne est en 20
  expect(appliquerEditions(texte, [ed(0, 20, 0, 20, '!')])).toBe('const café = 1 // 🐑!\nx')
})

test('positions et plages', () => {
  expect(versLsp({ lineNumber: 1, column: 1 })).toEqual({ line: 0, character: 0 })
  const p = { startLineNumber: 2, startColumn: 3, endLineNumber: 4, endColumn: 5 }
  expect(plageDeLsp(plageVersLsp(p))).toEqual(p)
  expect(plageVersLsp(p)).toEqual({
    start: { line: 1, character: 2 },
    end: { line: 3, character: 4 }
  })
})

test('graviteMonaco', () => {
  expect(graviteMonaco(1)).toBe(8)
  expect(graviteMonaco(2)).toBe(4)
  expect(graviteMonaco(3)).toBe(2)
  expect(graviteMonaco(4)).toBe(1)
  expect(graviteMonaco(undefined)).toBe(8)
})

test('texteSurvol', () => {
  expect(texteSurvol({ kind: 'markdown', value: 'x' })).toBe('x')
  expect(texteSurvol([{ language: 'ts', value: 'let a' }, 'doc'])).toBe('```ts\nlet a\n```\n\ndoc')
})

test('editionsParFichier', () => {
  const e = ed(0, 0, 0, 1, 'z')
  expect([...editionsParFichier({ changes: { 'file:///p/a%20b.ts': [e] } })]).toEqual([
    ['/p/a b.ts', [e]]
  ])
  expect([
    ...editionsParFichier({
      documentChanges: [{ textDocument: { uri: 'file:///p/c.ts', version: 1 }, edits: [e] }]
    })
  ]).toEqual([['/p/c.ts', [e]]])
})
