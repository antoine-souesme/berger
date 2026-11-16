import { expect, test } from 'vitest'
import { candidatsFichiers, cibleLienFichier, resoudreChemin } from '../src/shared/liens-fichiers'

const chemins = (t: string) => candidatsFichiers(t).map((c) => c.chemin)

test('les chemins écrits par Claude Code sont repérés, avec leur place', () => {
  const t = '⏺ Update(src/renderer/src/terminal.ts)'
  const [c] = candidatsFichiers(t)
  expect(c).toEqual({ chemin: 'src/renderer/src/terminal.ts', debut: 9, fin: 37 })
  expect(t.slice(c.debut, c.fin)).toBe('src/renderer/src/terminal.ts')
})

test('la ligne et la colonne suivent le chemin', () => {
  expect(candidatsFichiers('voir src/main/index.ts:195.')[0]).toMatchObject({
    chemin: 'src/main/index.ts',
    ligne: 195,
    fin: 26
  })
  expect(candidatsFichiers('a.ts:12:5 erreur')[0]).toMatchObject({ ligne: 12, colonne: 5, fin: 9 })
  expect(candidatsFichiers('a.ts:12-20')[0]).toMatchObject({ ligne: 12, fin: 10 })
  expect(candidatsFichiers('docs/a.md#L4')[0]).toMatchObject({ chemin: 'docs/a.md', ligne: 4 })
})

test('chemins absolus, relatifs et de la maison', () => {
  expect(chemins('/Users/a/b.txt ./c.ts ../d/e ~/f/g.json README.md')).toEqual([
    '/Users/a/b.txt',
    './c.ts',
    '../d/e',
    '~/f/g.json',
    'README.md'
  ])
})

test('pas de chemin dans les mots ordinaires ni dans les adresses web', () => {
  expect(chemins('Bonjour, voici 3.5 fois https://a.fr/b.ts et rien')).toEqual([])
  expect(chemins('Erreur:a.ts / . ~ ..')).toEqual([])
})

test('le chemin est résolu depuis le dossier du terminal', () => {
  expect(resoudreChemin('src/a.ts', '/p/berger', '/Users/x')).toBe('/p/berger/src/a.ts')
  expect(resoudreChemin('../a/./b.ts', '/p/berger/', '/Users/x')).toBe('/p/a/b.ts')
  expect(resoudreChemin('~/c.md', '/p', '/Users/x')).toBe('/Users/x/c.md')
  expect(resoudreChemin('/etc/hosts', '/p', '/Users/x')).toBe('/etc/hosts')
})

test('un lien file:// posé par le programme', () => {
  expect(cibleLienFichier('file:///Users/x/a%20b.ts#L12')).toEqual({
    chemin: '/Users/x/a b.ts',
    ligne: 12
  })
  expect(cibleLienFichier('file://localhost/a.ts')).toEqual({ chemin: '/a.ts' })
  expect(cibleLienFichier('https://a.fr/b.ts')).toBeNull()
  expect(cibleLienFichier('file://autre-machine/a.ts')).toBeNull()
})
