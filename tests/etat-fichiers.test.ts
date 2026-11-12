import { expect, test } from 'vitest'
import {
  ajouterDossier,
  basculerDeplie,
  basculerRacine,
  deplacerRacine,
  desepingler,
  deWorkspace,
  epingler,
  estImage,
  fermerFichierWs,
  libellesOnglets,
  lireEtatFichiers,
  ongletsFichiers,
  oublierWorkspace,
  ouvrirFichiers,
  racines,
  reprendreFichiersDeHerdr,
  retirerAbsents,
  retirerDossier,
  suivreDeplacement,
  toutReplier
} from '../src/shared/etat-fichiers'

// Cas utiles repris de ~/dev/playground/herdr-app-mod/tests/files.test.mjs.
const ws = 'ws-a'

test('ouvrir ajoute à la fin des ouverts et en tête des récents, sans doublon', () => {
  let e = ouvrirFichiers({}, ws, ['/p/a.ts', '/p/b.ts'])
  e = ouvrirFichiers(e, ws, ['/p/a.ts'])
  expect(deWorkspace(e, ws).ouverts).toEqual(['/p/a.ts', '/p/b.ts'])
  expect(deWorkspace(e, ws).recents).toEqual(['/p/a.ts', '/p/b.ts'])
})

test('les récents sont 30 au plus', () => {
  const chemins = Array.from({ length: 40 }, (_, i) => `/p/${i}`)
  expect(deWorkspace(ouvrirFichiers({}, ws, chemins), ws).recents).toHaveLength(30)
})

test('épinglés en premier, désépingler remet dans les ouverts', () => {
  let e = ouvrirFichiers({}, ws, ['/p/a.ts', '/p/b.ts'])
  e = epingler(e, ws, '/p/b.ts')
  expect(ongletsFichiers(e, ws)).toEqual([
    { chemin: '/p/b.ts', epingle: true },
    { chemin: '/p/a.ts', epingle: false }
  ])
  e = desepingler(e, ws, '/p/b.ts')
  expect(ongletsFichiers(e, ws).every((o) => !o.epingle)).toBe(true)
  expect(deWorkspace(e, ws).ouverts[0]).toBe('/p/b.ts')
})

test('ouvrir un épinglé ne le double pas', () => {
  const e = ouvrirFichiers(epingler(ouvrirFichiers({}, ws, ['/p/a']), ws, '/p/a'), ws, ['/p/a'])
  expect(ongletsFichiers(e, ws)).toEqual([{ chemin: '/p/a', epingle: true }])
})

test('fermer retire un onglet épinglé comme un ouvert', () => {
  const e = fermerFichierWs(epingler(ouvrirFichiers({}, ws, ['/p/a.ts']), ws, '/p/a.ts'), ws, '/p/a.ts')
  expect(ongletsFichiers(e, ws)).toEqual([])
})

test('suivreDeplacement : un fichier, et tout ce qui est sous un dossier, dans tous les workspaces', () => {
  let e = ouvrirFichiers({}, ws, ['/p/src/a.ts', '/p/src2/b.ts'])
  e = epingler(ouvrirFichiers(e, 'ws-b', ['/p/src/x/c.ts']), 'ws-b', '/p/src/x/c.ts')
  e = suivreDeplacement(e, [['/p/src', '/p/lib/src']])
  expect(deWorkspace(e, ws).ouverts).toEqual(['/p/lib/src/a.ts', '/p/src2/b.ts'])
  expect(deWorkspace(e, ws).recents[0]).toBe('/p/src2/b.ts')
  expect(deWorkspace(e, 'ws-b').epingles).toEqual(['/p/lib/src/x/c.ts'])
})

test('retirerAbsents retire sans toucher aux autres', () => {
  const e = retirerAbsents(ouvrirFichiers({}, ws, ['/p/a', '/p/b']), (c) => c !== '/p/a')
  expect(deWorkspace(e, ws).ouverts).toEqual(['/p/b'])
})

test('reprendreFichiersDeHerdr lit folders, recent et files (pinned, open)', () => {
  const e = reprendreFichiersDeHerdr({
    'antoine.folders': { [ws]: ['/d'] },
    'antoine.recent': { [ws]: ['/r'] },
    'antoine.files': { [ws]: { pinned: ['/e'], open: ['/o'], shown: '/o' } },
    'autre.cle': 1
  })
  expect(deWorkspace(e, ws)).toEqual({
    epingles: ['/e'],
    ouverts: ['/o'],
    recents: ['/r'],
    dossiers: ['/d'],
    ordreRacines: [],
    deplies: [],
    replies: []
  })
  expect(reprendreFichiersDeHerdr(null)).toEqual({})
})

test('lireEtatFichiers : null si ce n’est pas un objet, champs manquants complétés', () => {
  expect(lireEtatFichiers('x')).toBeNull()
  expect(lireEtatFichiers([])).toBeNull()
  expect(deWorkspace(lireEtatFichiers({ [ws]: { ouverts: ['/a'] } })!, ws).epingles).toEqual([])
})

test('racines : spaces puis dossiers ajoutés, sans doublon, dans l’ordre retenu', () => {
  const f = { ...deWorkspace({}, ws), dossiers: ['/b', '/x'], ordreRacines: ['/x', '/a'] }
  expect(racines(['/a', '/b', '/a'], f)).toEqual(['/x', '/a', '/b'])
  expect(racines([], { ...deWorkspace({}, ws), dossiers: ['/d'] })).toEqual(['/d'])
})

test('deplacerRacine retient l’ordre complet', () => {
  const e = deplacerRacine({}, ws, ['/a', '/b', '/c'], '/c', 0)
  expect(racines(['/a', '/b'], { ...deWorkspace(e, ws), dossiers: ['/c'] })).toEqual(['/c', '/a', '/b'])
})

test('libellesOnglets : le dossier seulement quand deux noms se ressemblent, assez profond pour les distinguer', () => {
  const l = libellesOnglets(['/p/src/main/index.ts', '/p/src/renderer/index.ts', '/p/a.md'])
  expect(l.get('/p/src/main/index.ts')).toEqual({ nom: 'index.ts', dossier: 'main' })
  expect(l.get('/p/a.md')).toEqual({ nom: 'a.md', dossier: '' })
  const m = libellesOnglets(['/x/src/index.ts', '/y/src/index.ts'])
  expect(m.get('/x/src/index.ts')!.dossier).toBe('x/src')
})

test('estImage', () => {
  expect(estImage('/a/B.PNG')).toBe(true)
  expect(estImage('/a/logo.svg')).toBe(true)
  expect(estImage('/a/x.tif')).toBe(true)
  expect(estImage('/a/x.jpeg')).toBe(true)
  expect(estImage('/a/x.ts')).toBe(false)
})

test('basculerDeplie, toutReplier, oublierWorkspace, ajouter et retirer un dossier', () => {
  let e = basculerDeplie({}, ws, '/p/src')
  expect(deWorkspace(e, ws).deplies).toEqual(['/p/src'])
  e = basculerRacine(e, ws, '/p')
  e = toutReplier(ajouterDossier(e, ws, '/d'), ws)
  expect(deWorkspace(e, ws)).toMatchObject({ deplies: [], replies: ['/p'], dossiers: ['/d'] })
  expect(deWorkspace(retirerDossier(e, ws, '/d'), ws).dossiers).toEqual([])
  expect(oublierWorkspace(e, ws)[ws]).toBeUndefined()
})

test('rien ne change : même référence', () => {
  const e = ouvrirFichiers({}, ws, ['/p/a'])
  expect(ajouterDossier(ajouterDossier(e, ws, '/d'), ws, '/d')).toEqual(ajouterDossier(e, ws, '/d'))
  expect(retirerAbsents(e, () => true)).toBe(e)
  expect(suivreDeplacement(e, [['/q', '/r']])).toBe(e)
})
