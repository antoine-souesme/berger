import { expect, test } from 'vitest'
import { lireFichier } from '../src/main/lecture'

test('un fichier lu en partie (plus de 8 Mo) est refusé plutôt que tronqué', async () => {
  const requete = async (): Promise<unknown> => ({ text: 'a\n', first: 1, last: 10, lines: 20 })
  expect(await lireFichier(requete, '/gros.log')).toEqual({
    erreur: 'Ce fichier est trop gros pour être ouvert (plus de 8 Mo).'
  })
})

test('un fichier lu en entier est rendu', async () => {
  const requete = async (): Promise<unknown> => ({ text: 'a\nb\n', first: 1, last: 2, lines: 2 })
  expect(await lireFichier(requete, '/petit.md')).toEqual({ texte: 'a\nb\n' })
})
