import { expect, test } from 'vitest'
import doc from './fixtures/herdr-app.json'
import {
  agentVoisin,
  agents,
  apresFermeture,
  barre,
  fermerFichier,
  memeOnglet,
  ongletN,
  ongletVoisin,
  ouvrirFichier,
  type RefOnglet
} from '../src/shared/onglets'
import { construireVue, type TerminalCore, type VueOnglet } from '../src/shared/spaces'

const o = (id: string): VueOnglet => ({
  id,
  nom: id,
  racine: { type: 'row', id, children: [] },
  agent: null
})
const liste: RefOnglet[] = [
  { type: 'terminal', id: 'tb1' },
  { type: 'terminal', id: 'tb2' },
  { type: 'fichier', chemin: '/a.ts' }
]
const vivant = (address: string, etat?: string): TerminalCore => ({
  address,
  name: null,
  title: '',
  cwd: '/x',
  state: 'live',
  status: etat ? { state: etat } : null,
  foreground: null,
  labels: {}
})

test('barre : terminaux puis fichiers', () =>
  expect(barre([o('tb1'), o('tb2')], ['/a.ts'])).toEqual(liste))

test('onglet suivant boucle', () => {
  expect(ongletVoisin(liste, liste.at(-1)!, 1)).toEqual(liste[0])
  expect(ongletVoisin(liste, liste[0], -1)).toEqual(liste[2])
  expect(ongletVoisin(liste, liste[0], 1)).toEqual(liste[1])
  expect(ongletVoisin([], null, 1)).toBeNull()
  expect(ongletVoisin(liste, null, 1)).toEqual(liste[0])
})

test('onglet n', () => {
  expect(ongletN(liste, 3)).toEqual(liste[2])
  expect(ongletN(liste, 4)).toBeNull()
})

test('après fermeture : à droite, sinon à gauche', () => {
  expect(apresFermeture(liste, liste[1])).toEqual(liste[2])
  expect(apresFermeture(liste, liste[2])).toEqual(liste[1])
  expect(apresFermeture([liste[0]], liste[0])).toBeNull()
})

test('ouvrir et fermer un fichier', () => {
  expect(ouvrirFichier(['/a'], '/b')).toEqual(['/a', '/b'])
  expect(ouvrirFichier(['/a', '/b'], '/a')).toEqual(['/a', '/b'])
  expect(fermerFichier(['/a', '/b'], '/a')).toEqual(['/b'])
})

test('memeOnglet', () => {
  expect(memeOnglet({ type: 'fichier', chemin: '/a' }, { type: 'fichier', chemin: '/a' })).toBe(
    true
  )
  expect(memeOnglet({ type: 'terminal', id: 'a' }, { type: 'fichier', chemin: 'a' })).toBe(false)
  expect(memeOnglet(null, null)).toBe(true)
})

test("agentVoisin suit l'ordre des spaces puis des onglets", () => {
  const vue = construireVue(doc, [
    vivant('t2b', 'working'),
    vivant('t2c'),
    vivant('t99', 'idle'),
    vivant('t3', 'done')
  ])
  expect(agents(vue).map((a) => a.adresse)).toEqual(['t2b', 't99', 't3'])
  expect(agents(vue)[1]).toEqual({ space: 'sp1', onglet: 'tb2', panneau: 'p3', adresse: 't99' })
  expect(agentVoisin(vue, 't2b', 1)?.adresse).toBe('t99')
  expect(agentVoisin(vue, 't3', 1)?.adresse).toBe('t2b')
  expect(agentVoisin(vue, 't2b', -1)?.adresse).toBe('t3')
  expect(agentVoisin(vue, null, 1)?.adresse).toBe('t2b')
})
