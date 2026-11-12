import { expect, test } from 'vitest'
import { cheminDe, chercher, correspondance, emplacement, fusionner } from '../src/shared/recherche'

// Cas repris et traduits de ~/dev/playground/herdr-app-mod/tests/quickopen.test.mjs.
const fichiers = [
  { racine: '/p/owl', relatif: 'docs/suivi/TODO.md' },
  { racine: '/p/owl', relatif: 'CLAUDE.md' },
  { racine: '/p/owl', relatif: 'src/main.rs' },
  { racine: '/p/widget', relatif: 'main.py' },
  { racine: '/p/widget', relatif: 'packaging/msix/Assets/StoreLogo.png' }
]

test('correspondance : les lettres dans l’ordre, contiguës et en début de mot comptent plus', () => {
  expect(correspondance('xyz', 'main.py')).toBeNull()
  expect(correspondance('mpy', 'main.py')).not.toBeNull()
  expect(correspondance('main', 'main.py')!.score).toBeGreaterThan(correspondance('mapy', 'main.py')!.score)
})

test('correspondance rend les lettres trouvées', () => {
  expect(correspondance('edt', 'editeur.ts')?.positions).toEqual([0, 1, 3])
  expect(correspondance('zz', 'editeur.ts')).toBeNull()
})

test('requête vide : les récents qui existent encore, dans l’ordre', () => {
  const f = [
    { racine: '/p', relatif: 'a.ts' },
    { racine: '/p', relatif: 'b.ts' }
  ]
  expect(chercher('', f, ['/p/b.ts', '/p/disparu.ts', '/p/a.ts']).map((t) => t.fichier.relatif)).toEqual([
    'b.ts',
    'a.ts'
  ])
  expect(chercher('', fichiers, ['/p/widget/main.py', '/gone.txt', '/p/owl/CLAUDE.md']).map((t) => cheminDe(t.fichier))).toEqual([
    '/p/widget/main.py',
    '/p/owl/CLAUDE.md'
  ])
})

test('une correspondance dans le nom bat une correspondance étalée sur les dossiers', () => {
  expect(chercher('main', fichiers, []).map((t) => t.fichier.relatif)).toEqual(['main.py', 'src/main.rs'])
})

test('les dossiers comptent quand le nom seul ne correspond pas', () => {
  expect(chercher('suivitodo', fichiers, []).map((t) => t.fichier.relatif)).toEqual(['docs/suivi/TODO.md'])
})

test('à égalité, les fichiers ouverts récemment passent devant', () => {
  expect(chercher('main', fichiers, ['/p/owl/src/main.rs'])[0].fichier.relatif).toBe('src/main.rs')
})

test('le nom bat le dossier, et les positions suivent', () => {
  const f = [
    { racine: '/p', relatif: 'edit/x.ts' },
    { racine: '/p', relatif: 'src/editeur.ts' }
  ]
  const r = chercher('edit', f, [])
  expect(r[0].fichier.relatif).toBe('src/editeur.ts')
  expect(r[0].positionsNom).toEqual([0, 1, 2, 3])
  expect(r[1].positionsDossier).toEqual([0, 1, 2, 3])
})

test('emplacement : nom de la racine puis dossier du fichier', () => {
  expect(emplacement(fichiers[4], '/home')).toBe('widget • packaging/msix/Assets')
  expect(emplacement(fichiers[3], '/home')).toBe('widget')
  expect(emplacement({ racine: '/home', relatif: '.claude/CLAUDE.md' }, '/home')).toBe('~ • .claude')
})

test('fusionner garde chaque fichier une fois (racine dans une racine)', () => {
  const r = fusionner([[{ racine: '/p', relatif: 'sub/a.ts' }], [{ racine: '/p/sub', relatif: 'a.ts' }]])
  expect(r).toHaveLength(1)
  const a = [{ racine: '/p', relatif: 'x/y.md' }]
  const b = [
    { racine: '/p/x', relatif: 'y.md' },
    { racine: '/p/x', relatif: 'z.md' }
  ]
  expect(fusionner([a, b]).map(cheminDe)).toEqual(['/p/x/y.md', '/p/x/z.md'])
})
