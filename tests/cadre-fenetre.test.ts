import { expect, test } from 'vitest'
import { lireCadre } from '../src/shared/cadre-fenetre'

const ecran = { x: 0, y: 0, largeur: 1728, hauteur: 1117 }
const cadre = { x: 100, y: 50, largeur: 1440, hauteur: 900, pleinEcran: false, agrandie: false }

test('cadre valide rendu tel quel', () => expect(lireCadre(cadre, [ecran])).toEqual(cadre))
test('hors de tous les écrans : ignoré', () => {
  expect(lireCadre({ ...cadre, x: 3000 }, [ecran])).toBeNull()
  // Moins de 100 × 100 px sur l'écran.
  expect(lireCadre({ ...cadre, x: 1650 }, [ecran])).toBeNull()
  expect(lireCadre({ ...cadre, x: 1600 }, [ecran])).toEqual({ ...cadre, x: 1600 })
  // Sur un second écran à gauche.
  expect(
    lireCadre({ ...cadre, x: -1500 }, [ecran, { x: -1920, y: 0, largeur: 1920, hauteur: 1080 }])
  ).toEqual({ ...cadre, x: -1500 })
})
test('taille bornée à 800 × 500', () =>
  expect(lireCadre({ ...cadre, largeur: 300, hauteur: 200 }, [ecran])).toEqual({
    ...cadre,
    largeur: 800,
    hauteur: 500
  }))
test('valeurs non numériques : null', () => {
  expect(lireCadre({ ...cadre, x: 'a' }, [ecran])).toBeNull()
  expect(lireCadre(null, [ecran])).toBeNull()
  expect(lireCadre({ ...cadre, largeur: NaN }, [ecran])).toBeNull()
})
test('plein écran et agrandie gardés', () => {
  expect(lireCadre({ ...cadre, pleinEcran: true }, [ecran])?.pleinEcran).toBe(true)
  expect(lireCadre({ ...cadre, agrandie: true }, [ecran])?.agrandie).toBe(true)
  expect(lireCadre({ ...cadre, pleinEcran: 'oui' }, [ecran])?.pleinEcran).toBe(false)
})
