import { expect, test } from 'vitest'
import { ETAT_PAR_DEFAUT, lireEtatFenetre } from '../src/shared/etat-fenetre'

test('état par défaut quand le fichier est illisible', () =>
  expect(lireEtatFenetre("n'importe quoi")).toEqual(ETAT_PAR_DEFAUT))
test('largeur hors bornes ramenée', () => {
  expect(lireEtatFenetre({ largeurs: { explorateur: 5000 } }).largeurs.explorateur).toBe(600)
  expect(lireEtatFenetre({ largeurs: { spaces: 3 } }).largeurs.spaces).toBe(160)
  expect(lireEtatFenetre({ largeurs: { spaces: 'x' } }).largeurs.spaces).toBe(250)
})
test('onglet mal formé ignoré', () =>
  expect(lireEtatFenetre({ onglet: { type: 'x' } }).onglet).toBeNull())
test('état complet relu tel quel', () => {
  const e = {
    largeurs: { explorateur: 300, spaces: 200 },
    colonneMasquee: true,
    space: 'sp1',
    onglet: { type: 'fichier', chemin: '/a' },
    fichiers: ['/a', 3, '/b'],
    triAgents: 'urgence'
  }
  expect(lireEtatFenetre(e)).toEqual({ ...e, fichiers: ['/a', '/b'] })
})

test('tri des agents retenu, valeur inconnue ramenée à « spaces »', () => {
  expect(lireEtatFenetre({ triAgents: 'urgence' }).triAgents).toBe('urgence')
  expect(lireEtatFenetre({ triAgents: 'x' }).triAgents).toBe('spaces')
  expect(lireEtatFenetre(null).triAgents).toBe('spaces')
})
