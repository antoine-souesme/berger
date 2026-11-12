import { expect, test } from 'vitest'
import { lireReglages, modifierReglage, REGLAGES_PAR_DEFAUT } from '../src/shared/reglages'

test('défauts', () => {
  expect(REGLAGES_PAR_DEFAUT).toEqual({
    apparence: {
      themeApplication: 'antoine-monokai',
      themeEditeur: 'antoine-monokai',
      policeInterface: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      taillePoliceInterface: 13
    },
    editeur: {
      couleurSelection: null,
      police: "'Fira Code', Menlo, monospace",
      taille: 13,
      retourLigne: false,
      minicarte: true,
      tabulations: 2
    },
    terminal: { police: "'IBM Plex Mono', Menlo, monospace", taille: 12 },
    sons: { actifs: true, fini: null, attente: null },
    raccourcis: {}
  })
  expect(lireReglages(null)).toEqual(REGLAGES_PAR_DEFAUT)
  expect(lireReglages('x')).toEqual(REGLAGES_PAR_DEFAUT)
})

test('couleur de sélection : ancienne clé lue, valeur invalide = celle du thème', () => {
  expect(lireReglages({ editeur: { couleurSelection: '#264f78' } }).editeur.couleurSelection).toBe(
    '#264f78'
  )
  expect(
    lireReglages({ editeur: { couleurSelection: '#264f78aa' } }).editeur.couleurSelection
  ).toBe('#264f78aa')
  expect(lireReglages({ editeur: { couleurSelection: 'rouge' } }).editeur.couleurSelection).toBe(
    null
  )
})

test('tailles et tabulations bornées, valeur invalide = défaut, autres clés gardées', () => {
  for (const taille of [0, 200, '13', 7, 33])
    expect(lireReglages({ editeur: { taille } }).editeur.taille).toBe(13)
  expect(lireReglages({ editeur: { taille: 8 } }).editeur.taille).toBe(8)
  expect(lireReglages({ editeur: { taille: 32, minicarte: false } }).editeur).toMatchObject({
    taille: 32,
    minicarte: false
  })
  expect(lireReglages({ terminal: { taille: 99, police: 'Fira Code' } }).terminal).toEqual({
    taille: 12,
    police: 'Fira Code'
  })
  expect(lireReglages({ editeur: { tabulations: 0 } }).editeur.tabulations).toBe(2)
  expect(lireReglages({ editeur: { tabulations: 9 } }).editeur.tabulations).toBe(2)
  expect(lireReglages({ editeur: { tabulations: 4 } }).editeur.tabulations).toBe(4)
  expect(
    lireReglages({ apparence: { themeEditeur: 'ink', themeApplication: 3 } }).apparence
  ).toMatchObject({ themeEditeur: 'ink', themeApplication: 'antoine-monokai' })
  expect(lireReglages({ editeur: { retourLigne: true } }).editeur.retourLigne).toBe(true)
  expect(lireReglages({ apparence: { policeInterface: '' } }).apparence.policeInterface).toBe(
    REGLAGES_PAR_DEFAUT.apparence.policeInterface
  )
})

test('raccourcis', () => {
  expect(lireReglages({ raccourcis: { 'panneau.diviserBas': 'cmd-alt-d' } }).raccourcis).toEqual({
    'panneau.diviserBas': ['cmd-alt-d']
  })
  expect(
    lireReglages({ raccourcis: { 'panneau.diviserBas': ['cmd-alt-d', 'ctrl-d'], x: 3 } }).raccourcis
  ).toEqual({ 'panneau.diviserBas': ['cmd-alt-d', 'ctrl-d'] })
  expect(lireReglages({ raccourcis: { 'onglet.fermer': [] } }).raccourcis).toEqual({
    'onglet.fermer': []
  })
})

test('modifierReglage', () => {
  expect(modifierReglage('', ['apparence', 'themeEditeur'], 'ink')).toBe(
    '{\n  "apparence": {\n    "themeEditeur": "ink"\n  }\n}\n'
  )
  const t = modifierReglage('{ "inconnu": 1 }', ['editeur', 'taille'], 14)!
  expect(JSON.parse(t)).toEqual({ inconnu: 1, editeur: { taille: 14 } })
  const sans = modifierReglage(t, ['editeur', 'taille'], undefined)!
  expect(JSON.parse(sans)).toEqual({ inconnu: 1, editeur: {} })
  expect(
    JSON.parse(modifierReglage('{"raccourcis":{"a":["x"]}}', ['raccourcis', 'b'], ['y'])!)
  ).toEqual({ raccourcis: { a: ['x'], b: ['y'] } })
  expect(modifierReglage('{ mal', ['editeur', 'taille'], 14)).toBeNull()
  expect(modifierReglage('[1]', ['editeur', 'taille'], 14)).toBeNull()
})

test('les sons des agents : actifs par défaut, fichiers personnels gardés', () => {
  expect(lireReglages({}).sons).toEqual({ actifs: true, fini: null, attente: null })
  expect(lireReglages({ sons: { actifs: false, fini: '/a/b.mp3', attente: 3 } }).sons).toEqual({
    actifs: false,
    fini: '/a/b.mp3',
    attente: null
  })
})
