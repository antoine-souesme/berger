import { expect, test } from 'vitest'
import {
  POLICE_SYSTEME,
  optionsPolices,
  optionsSons,
  premiereFamille,
  valeurPolice
} from '../src/shared/choix-reglages'

test('valeurPolice et premiereFamille se répondent', () => {
  expect(valeurPolice('Avenir Next')).toBe("'Avenir Next', -apple-system, sans-serif")
  expect(premiereFamille(valeurPolice("L'Étrange"))).toBe("L'Étrange")
  expect(premiereFamille('Menlo, monospace')).toBe('Menlo')
})

test('optionsPolices : Système, puis les familles triées, sans les cachées ni les doublons', () => {
  const o = optionsPolices(['Zapfino', '.SF NS', 'avenir', 'Menlo', 'Menlo'], POLICE_SYSTEME)
  expect(o.map(([l]) => l)).toEqual([
    'San Francisco (système)',
    'Geist',
    'avenir',
    'Menlo',
    'Zapfino'
  ])
  expect(o[1][1]).toBe("'Geist Variable', -apple-system, sans-serif")
  expect(o[3][1]).toBe("'Menlo', -apple-system, sans-serif")
})

test('optionsPolices : la police actuelle garde sa valeur, une inconnue reste en bas', () => {
  const actuelle = "'Helvetica Neue', sans-serif"
  expect(optionsPolices(['Helvetica Neue'], actuelle)[2]).toEqual(['Helvetica Neue', actuelle])
  const o = optionsPolices(['Menlo'], 'Inconnue, serif')
  expect(o[o.length - 1]).toEqual(['Inconnue, serif', 'Inconnue, serif'])
})

test('optionsSons : le son par défaut, les autres de macOS, puis le fichier choisi', () => {
  const macos = ['/S/Ping.aiff', '/S/Glass.aiff', '/S/Basso.aiff']
  expect(optionsSons(macos, '/S/Glass.aiff', null)).toEqual([
    ['Glass (par défaut)', ''],
    ['Basso', '/S/Basso.aiff'],
    ['Ping', '/S/Ping.aiff']
  ])
  expect(optionsSons(macos, '/S/Glass.aiff', '/S/Ping.aiff')).toHaveLength(3)
  expect(optionsSons(macos, '/S/Glass.aiff', '/u/cloche.mp3').pop()).toEqual([
    'Fichier : cloche',
    '/u/cloche.mp3'
  ])
})
