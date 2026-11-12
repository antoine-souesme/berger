import { expect, test } from 'vitest'
import { lireReglages, REGLAGES_PAR_DEFAUT } from '../src/shared/reglages'

test('réglages', () => {
  expect(REGLAGES_PAR_DEFAUT.editeur.couleurSelection).toBe('#878b9180')
  expect(lireReglages(null)).toEqual(REGLAGES_PAR_DEFAUT)
  expect(lireReglages({ editeur: { couleurSelection: '#264f78' } }).editeur.couleurSelection).toBe(
    '#264f78'
  )
  expect(lireReglages({ editeur: { couleurSelection: '#fff' } }).editeur.couleurSelection).toBe(
    '#fff'
  )
  expect(
    lireReglages({ editeur: { couleurSelection: '#264f78aa' } }).editeur.couleurSelection
  ).toBe('#264f78aa')
  expect(lireReglages({ editeur: { couleurSelection: 'rouge' } })).toEqual(REGLAGES_PAR_DEFAUT)
})
