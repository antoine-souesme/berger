import { expect, test } from 'vitest'
import { envoyerA } from '../src/main/envoi'

test("n'envoie rien à une fenêtre fermée (détruite) et ne lève pas d'erreur", () => {
  let envois = 0
  const detruite = {
    isDestroyed: () => true,
    webContents: {
      send: () => {
        envois++
        throw new Error('Object has been destroyed')
      }
    }
  }
  expect(() => envoyerA(detruite, 'berger:vue', {})).not.toThrow()
  expect(() => envoyerA(null, 'berger:vue', {})).not.toThrow()
  expect(envois).toBe(0)
})
