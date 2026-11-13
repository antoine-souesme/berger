import { expect, test } from 'vitest'
import { cheminDeUrlMedia, estVideo, plageDemandee, urlMedia } from '../src/shared/media'

test('estVideo', () => {
  expect(estVideo('/a/film.MP4')).toBe(true)
  expect(estVideo('/a/x.webm')).toBe(true)
  expect(estVideo('/a/x.mov')).toBe(true)
  expect(estVideo('/a/x.png')).toBe(false)
  expect(estVideo('/a/mp4')).toBe(false)
})

test("l'adresse d'une vidéo redonne son chemin, espaces et accents compris", () => {
  const chemin = '/Users/a/Mes vidéos/l’été #2.mp4'
  expect(cheminDeUrlMedia(urlMedia(chemin))).toBe(chemin)
  expect(cheminDeUrlMedia('berger-media://fichier/relatif.mp4')).toBeNull()
  expect(cheminDeUrlMedia('https://exemple.fr/a.mp4')).toBeNull()
})

test('plageDemandee', () => {
  expect(plageDemandee(null, 100)).toEqual({ debut: 0, fin: 99, partiel: false })
  expect(plageDemandee('bytes=0-', 100)).toEqual({ debut: 0, fin: 99, partiel: true })
  expect(plageDemandee('bytes=10-19', 100)).toEqual({ debut: 10, fin: 19, partiel: true })
  expect(plageDemandee('bytes=90-500', 100)).toEqual({ debut: 90, fin: 99, partiel: true })
  expect(plageDemandee('bytes=-10', 100)).toEqual({ debut: 90, fin: 99, partiel: true })
  expect(plageDemandee('bytes=100-', 100)).toBeNull()
  expect(plageDemandee('bytes=-', 100)).toBeNull()
  expect(plageDemandee('octets=0-1', 100)).toBeNull()
})
