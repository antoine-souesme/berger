import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  contraste,
  couleursFenetre,
  couleursTerminal,
  estClair,
  lireTheme,
  themeEditeur,
  type ThemeHerdr
} from '../src/shared/themes'
import { THEMES_FOURNIS, THEME_PAR_DEFAUT } from '../src/shared/themes-fournis'
import { styleDePortees, type ThemeVsCode } from '../src/shared/theme'

const monokaiVsCode = JSON.parse(
  readFileSync(join(__dirname, '../src/renderer/public/vscode/monokai-color-theme.json'), 'utf8')
) as ThemeVsCode

// Recopié de ~/.config/herdr-app/themes/atom-one-dark.json.
const ATOM = {
  background: '#21252b',
  foreground: '#abb2bf',
  selection: '#323844',
  cursor: '#abb2bf',
  ansi: [
    '#454c59',
    '#e06c75',
    '#98c379',
    '#e5c07b',
    '#61afef',
    '#c678dd',
    '#56b6c2',
    '#abb2bf',
    '#767676',
    '#e06c75',
    '#98c379',
    '#e5c07b',
    '#61afef',
    '#c678dd',
    '#56b6c2',
    '#abb2bf'
  ]
}

const fourni = (id: string): ThemeHerdr => THEMES_FOURNIS.find((t) => t.id === id)!.theme

describe('lireTheme', () => {
  test('thème de Herdr lu', () => {
    const t = lireTheme(ATOM)
    expect(t?.background).toBe('#21252b')
    expect(t?.ansi).toHaveLength(16)
  })
  test('thèmes refusés', () => {
    expect(lireTheme({ ...ATOM, ansi: ATOM.ansi.slice(1) })).toBeNull()
    expect(lireTheme({ ...ATOM, background: undefined })).toBeNull()
    expect(lireTheme({ ...ATOM, foreground: 'rouge' })).toBeNull()
    expect(lireTheme(null)).toBeNull()
  })
})

describe('couleursFenetre', () => {
  test('antoine-monokai : fonds d’Atom One Dark, textes de Monokai', () => {
    expect(couleursFenetre(fourni('antoine-monokai'))).toEqual({
      fond: '#1a1d22',
      panneau: '#21252b',
      bord: '#32363d',
      texte: '#d0d0c8',
      vif: '#f8f8f2',
      gris: '#75715e',
      grisClair: '#a59f85',
      actif: '#373c43',
      clavier: '#66d9ef',
      survol: '#2f333a',
      popover: '#1a1d22',
      vert: '#a6e22e',
      rouge: '#f92672',
      jaune: '#e6db74'
    })
  })
  test('thème sans colors : couleurs dérivées', () => {
    const t = lireTheme(ATOM)!
    const c = couleursFenetre(t)
    expect(c.texte).toBe('#abb2bf')
    expect(c.panneau).toBe('#21252b')
    expect(contraste(c.fond, c.texte)).toBeGreaterThan(contraste(c.panneau, c.texte))
    expect(contraste(c.bord, c.texte)).toBeLessThan(contraste(c.panneau, c.texte))
    expect(contraste(c.bord, c.panneau)).toBeGreaterThan(1)
    expect(c.clavier).toBe('#56b6c2')
  })
  test('thème clair : le fond est plus loin du texte que le panneau', () => {
    const paper = fourni('paper')
    expect(estClair(paper.background)).toBe(true)
    const c = couleursFenetre({ ...paper, colors: undefined })
    expect(contraste(c.fond, c.texte)).toBeGreaterThan(contraste(c.panneau, c.texte))
  })
})

describe('lisibilité de chaque thème fourni', () => {
  for (const { id, theme } of THEMES_FOURNIS)
    test(id, () => {
      const c = couleursFenetre(theme)
      expect(contraste(c.texte, c.fond)).toBeGreaterThanOrEqual(4.5)
      expect(contraste(c.texte, c.panneau)).toBeGreaterThanOrEqual(4.5)
      expect(contraste(c.grisClair, c.panneau)).toBeGreaterThanOrEqual(3)
      expect(contraste(c.gris, c.panneau)).toBeGreaterThanOrEqual(2)
      const vscode = theme.editeur?.vscode ? monokaiVsCode : null
      const e = themeEditeur(theme, vscode)
      for (const portee of [
        'comment',
        'string',
        'keyword',
        'entity.name.function',
        'constant.numeric'
      ]) {
        const f = styleDePortees(e, [portee]).foreground
        expect(f, portee).toBeDefined()
        expect(contraste(f!, e.colors['editor.background']), portee).toBeGreaterThanOrEqual(3)
      }
    })
})

describe('themeEditeur', () => {
  test('sans champ editeur : déduit des 16 couleurs', () => {
    const t = lireTheme(ATOM)!
    const e = themeEditeur(t, null)
    const f = (p: string): string | undefined => styleDePortees(e, [p]).foreground
    expect(f('comment')).toBe(ATOM.ansi[8])
    expect(f('string')).toBe(ATOM.ansi[11])
    expect(f('keyword')).toBe(ATOM.ansi[9])
    expect(f('entity.name.function')).toBe(ATOM.ansi[10])
    expect(f('entity.name.type')).toBe(ATOM.ansi[14])
    expect(f('constant.numeric')).toBe(ATOM.ansi[13])
    expect(e.colors['editor.background']).toBe('#21252b')
    expect(e.type).toBe('dark')
  })
  test('antoine-monokai : le Monokai de VS Code, texte #f8f8f2 comme VS Code', () => {
    const e = themeEditeur(fourni('antoine-monokai'), monokaiVsCode)
    expect(e.tokenColors.slice(1)).toEqual(monokaiVsCode.tokenColors.slice(1))
    expect(e.colors['editor.foreground']).toBe('#f8f8f2')
    expect(e.tokenColors.find((r) => !r.scope)?.settings.foreground).toBe('#f8f8f2')
  })
  test('Monokai : garde #f8f8f2', () => {
    const e = themeEditeur(fourni('monokai'), monokaiVsCode)
    expect(e.colors['editor.foreground']).toBe('#f8f8f2')
    expect(e.tokenColors.find((r) => !r.scope)?.settings.foreground?.toLowerCase()).toBe('#f8f8f2')
  })
  test('Paper est clair', () => {
    expect(themeEditeur(fourni('paper'), null).type).toBe('light')
  })
})

test('thèmes fournis', () => {
  expect(THEME_PAR_DEFAUT).toBe('antoine-monokai')
  expect(THEMES_FOURNIS.map((t) => t.nom)).toEqual([
    'antoine-monokai',
    'Monokai',
    'Atom One Dark',
    'Graphite',
    'Ink',
    'Moss',
    'Paper (clair)'
  ])
  expect(couleursTerminal(fourni('antoine-monokai')).brightCyan).toBe('#66d9ef')
})
