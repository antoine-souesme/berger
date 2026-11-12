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
    explorateurMasque: true,
    triAgents: 'urgence',
    retourLigne: true
  }
  expect(lireEtatFenetre(e)).toEqual(e)
})

test('explorateur masqué retenu, défaut faux ; la liste globale de fichiers disparaît', () => {
  const e = lireEtatFenetre({ explorateurMasque: true, fichiers: ['/a'] })
  expect(e.explorateurMasque).toBe(true)
  expect('fichiers' in e).toBe(false)
  expect(lireEtatFenetre(null).explorateurMasque).toBe(false)
})

test('tri des agents retenu, valeur inconnue ramenée à « spaces »', () => {
  expect(lireEtatFenetre({ triAgents: 'urgence' }).triAgents).toBe('urgence')
  expect(lireEtatFenetre({ triAgents: 'x' }).triAgents).toBe('spaces')
  expect(lireEtatFenetre(null).triAgents).toBe('spaces')
})

test('retour à la ligne retenu', () => {
  expect(lireEtatFenetre({ retourLigne: true }).retourLigne).toBe(true)
  expect(lireEtatFenetre({}).retourLigne).toBe(false)
})
