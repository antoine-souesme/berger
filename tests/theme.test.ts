import { expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  cleSemantique,
  reglesSemantiques,
  styleDePortees,
  type ThemeVsCode
} from '../src/shared/theme'

const t = JSON.parse(
  readFileSync(join(__dirname, '../src/renderer/public/vscode/monokai-color-theme.json'), 'utf8')
) as ThemeVsCode

test('styleDePortees comme VS Code', () => {
  expect(styleDePortees(t, ['source.ts', 'meta.var.expr.ts', 'storage.type.ts'])).toEqual({
    foreground: '#66D9EF',
    fontStyle: 'italic'
  })
  expect(styleDePortees(t, ['source.ts', 'entity.name.function.ts']).foreground).toBe('#A6E22E')
  expect(styleDePortees(t, ['source.ts', 'comment.line.double-slash.ts']).foreground).toBe(
    '#88846f'
  )
  expect(
    styleDePortees(t, [
      'source.json',
      'meta.structure.dictionary.json',
      'string.quoted.double.json'
    ]).foreground
  ).toBe('#CFCFC2')
  // exclusion « - match »
  expect(styleDePortees(t, ['constant.numeric.line-number.find-in-files']).foreground).toBe(
    '#AE81FFA0'
  )
  expect(
    styleDePortees(t, ['constant.numeric.line-number.find-in-files', 'match']).foreground
  ).toBe('#AE81FF')
})

test('reglesSemantiques', () => {
  const r = reglesSemantiques(t)
  expect(r).toContainEqual({ token: 'parameter', foreground: '#FD971F', fontStyle: 'italic' })
  expect(r).toContainEqual({ token: 'function', foreground: '#A6E22E', fontStyle: '' })
  // function.defaultLibrary → support.function (bleu)
  expect(r).toContainEqual({
    token: 'function.defaultLibrary',
    foreground: '#66D9EF',
    fontStyle: ''
  })
  // variable.readonly → variable.other.constant : aucune règle propre, celle de « variable »
  // vient de variable.other.readwrite par le type « variable »
  expect(r.find((x) => x.token === 'variable.readonly')?.foreground).toBe('#F8F8F2')
})

test('cleSemantique garde seulement les modificateurs utiles', () => {
  expect(cleSemantique('variable', ['declaration', 'readonly', 'local'])).toBe('variable.readonly')
  expect(cleSemantique('function', ['readonly', 'defaultLibrary'])).toBe(
    'function.defaultLibrary.readonly'
  )
  expect(cleSemantique('member', [])).toBe('method')
})
