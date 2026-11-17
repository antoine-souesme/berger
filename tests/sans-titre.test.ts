import { expect, test } from 'vitest'
import {
  estSansTitre,
  nomSansTitre,
  prochainSansTitre,
  sansTemporaires
} from '../src/shared/sans-titre'
import { libellesOnglets, ouvrirFichiers, type EtatFichiers } from '../src/shared/etat-fichiers'

test('le premier fichier temporaire est Sans titre-1', () => {
  const c = prochainSansTitre(['/a/b.ts'])
  expect(estSansTitre(c)).toBe(true)
  expect(nomSansTitre(c)).toBe('Sans titre-1')
  expect(estSansTitre('/a/b.ts')).toBe(false)
})

test('le numéro suivant prend le plus petit libre', () => {
  const un = prochainSansTitre([])
  const trois = 'sans-titre:/Sans titre-3'
  expect(nomSansTitre(prochainSansTitre([un, trois]))).toBe('Sans titre-2')
  expect(nomSansTitre(prochainSansTitre([trois]))).toBe('Sans titre-1')
})

test("l'onglet affiche le nom seul", () => {
  const c = prochainSansTitre([])
  expect(libellesOnglets([c]).get(c)).toEqual({ nom: 'Sans titre-1', dossier: '' })
})

test("un fichier temporaire n'entre pas dans les récents", () => {
  const c = prochainSansTitre([])
  const e = ouvrirFichiers({}, 'ws', [c])
  expect(e['ws'].ouverts).toEqual([c])
  expect(e['ws'].recents).toEqual([])
})

test("les fichiers temporaires ne sont pas retenus d'une session à l'autre", () => {
  const c = prochainSansTitre([])
  const e: EtatFichiers = ouvrirFichiers({}, 'ws', ['/a.ts', c])
  const r = sansTemporaires(e)
  expect(r['ws'].ouverts).toEqual(['/a.ts'])
  const sans = ouvrirFichiers({}, 'ws', ['/a.ts'])
  expect(sansTemporaires(sans)).toBe(sans)
})
