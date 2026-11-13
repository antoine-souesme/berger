import { expect, test } from 'vitest'
import {
  decoration,
  dossierDeCollage,
  dossiersAPerimer,
  lireStatutGit,
  MASQUES,
  nomDeCopie,
  peutDeposer,
  trierEntrees,
  type GenreGit
} from '../src/shared/explorateur'

// Cas repris de ~/dev/playground/herdr-app-mod/tests/git.test.mjs et clip.test.mjs.
const z = (...entrees: string[]): string => entrees.join('\0') + '\0'

test('lireStatutGit : non suivi, conflit, et le renommage saute l’ancien chemin', () => {
  const s = lireStatutGit('?? neuf.txt\0UU a.ts\0R  b.ts\0vieux.ts\0 M src/c.ts\0')
  expect(s).toEqual([
    ['neuf.txt', 'nonSuivi'],
    ['a.ts', 'conflit'],
    ['b.ts', 'renomme'],
    ['src/c.ts', 'modifie']
  ])
})

test('lireStatutGit lit toutes les sortes', () => {
  const s = lireStatutGit(
    z(
      ' M src/a.js',
      '?? new.txt',
      'A  b.js',
      ' D gone.md',
      'UU both.js',
      'R  to.js',
      'from.js',
      'MM c.js'
    )
  )
  expect(Object.fromEntries(s)).toEqual({
    'src/a.js': 'modifie',
    'new.txt': 'nonSuivi',
    'b.js': 'ajoute',
    'gone.md': 'supprime',
    'both.js': 'conflit',
    'to.js': 'renomme',
    'c.js': 'modifie'
  })
})

test('decoration : lettre sur le fichier, point de la couleur la plus importante sur le dossier', () => {
  const s: [string, GenreGit][] = [
    ['src/a.ts', 'modifie'],
    ['src/b.ts', 'conflit'],
    ['neuf/', 'nonSuivi']
  ]
  expect(decoration(s, 'src/a.ts', false)).toEqual({
    genre: 'modifie',
    lettre: 'M',
    couleur: '#e2c08d'
  })
  expect(decoration(s, 'src', true)).toEqual({ genre: 'conflit', lettre: '•', couleur: '#e4676b' })
  expect(decoration(s, 'neuf/x.txt', false)?.lettre).toBe('U')
  expect(decoration(s, 'docs', true)).toBeNull()
})

test('decoration : dossier voisin au nom proche, dossier non suivi entier, dépôt entier', () => {
  const s = lireStatutGit(z('?? src/new.js', ' M src/lib/a.js', '?? srcx/b.js'))
  expect(decoration(s, 'src/lib', true)?.couleur).toBe('#e2c08d')
  expect(decoration(s, 'srcx', true)).toEqual({
    genre: 'nonSuivi',
    lettre: '•',
    couleur: '#73c991'
  })
  const d = lireStatutGit(z('?? newdir/'))
  expect(decoration(d, 'newdir', true)?.lettre).toBe('•')
  expect(decoration(lireStatutGit(z('?? a.txt', ' M b/c.js')), '', true)?.genre).toBe('modifie')
  expect(decoration([], '', true)).toBeNull()
})

test('trierEntrees : dossiers d’abord', () => {
  expect(
    trierEntrees([
      { nom: 'b', dossier: false, ignore: false },
      { nom: 'a', dossier: false, ignore: false },
      { nom: 'z', dossier: true, ignore: false }
    ]).map((e) => e.nom)
  ).toEqual(['z', 'a', 'b'])
})

test('MASQUES comme files.exclude de VS Code', () => {
  for (const n of ['.git', '.svn', '.hg', 'CVS', '.DS_Store', 'Thumbs.db'])
    expect(MASQUES.has(n)).toBe(true)
  expect(MASQUES.has('node_modules')).toBe(false)
})

test('nomDeCopie comme le Finder', () => {
  expect(nomDeCopie('a.txt', false, new Set())).toBe('a.txt')
  expect(nomDeCopie('a.txt', false, new Set(['a.txt']))).toBe('a copie.txt')
  expect(nomDeCopie('a.txt', false, new Set(['a.txt', 'a copie.txt']))).toBe('a copie 2.txt')
  expect(nomDeCopie('v1.0', true, new Set(['v1.0']))).toBe('v1.0 copie')
  expect(nomDeCopie('.env', false, new Set(['.env']))).toBe('.env copie')
})

test('peutDeposer refuse un dossier dans lui-même ou un sous-dossier', () => {
  expect(peutDeposer('/p/src', '/p/src')).toBe(false)
  expect(peutDeposer('/p/src', '/p/src/a')).toBe(false)
  expect(peutDeposer('/p/src', '/p/src2')).toBe(true)
  expect(peutDeposer('/p/src', '/p')).toBe(true)
})

test('dossierDeCollage : le dossier choisi, ou celui du fichier choisi', () => {
  expect(dossierDeCollage({ chemin: '/p/src', dossier: true })).toBe('/p/src')
  expect(dossierDeCollage({ chemin: '/p/src/a.ts', dossier: false })).toBe('/p/src')
})

test('dossiersAPerimer : le parent affiché et le dossier lui-même, jamais .git', () => {
  expect(
    dossiersAPerimer(['/p/src/a.ts', '/p/.git/index', '/p/docs'], ['/p/src', '/p', '/p/docs'])
  ).toEqual(['/p/src', '/p', '/p/docs'])
})

test('nomDeCopie sans tenir compte des majuscules (disque de macOS)', () => {
  expect(nomDeCopie('Readme.md', false, new Set(['readme.md']), true)).toBe('Readme copie.md')
  expect(nomDeCopie('Readme.md', false, new Set(['readme.md']))).toBe('Readme.md')
})

test('plage : de l’ancre à la ligne cliquée, dans les deux sens', async () => {
  const { plage } = await import('../src/shared/explorateur')
  const c = ['/r', '/r/a', '/r/b', '/r/c', '/r/d']
  expect(plage(c, '/r/a', '/r/c')).toEqual(['/r/a', '/r/b', '/r/c'])
  expect(plage(c, '/r/d', '/r/b')).toEqual(['/r/b', '/r/c', '/r/d'])
  expect(plage(c, '/r/b', '/r/b')).toEqual(['/r/b'])
  expect(plage(c, '/ailleurs', '/r/b')).toEqual(['/r/b'])
  expect(plage(c, null, '/r/b')).toEqual(['/r/b'])
})
