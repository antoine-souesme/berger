import { expect, test } from 'vitest'
import { decoupeurDeLignes } from '../src/shared/lignes'

test('rend les lignes complètes et garde le reste pour la suite', () => {
  const decoupe = decoupeurDeLignes()
  expect(decoupe('{"a":1}\n{"b"')).toEqual(['{"a":1}'])
  expect(decoupe(':2}\n')).toEqual(['{"b":2}'])
})

test('ignore les lignes vides', () => {
  const decoupe = decoupeurDeLignes()
  expect(decoupe('\n\n')).toEqual([])
})

test('recompose une ligne accentuée coupée en deux appels', () => {
  const decoupe = decoupeurDeLignes()
  expect(decoupe('{"t":"é')).toEqual([])
  expect(decoupe('té"}\n')).toEqual(['{"t":"été"}'])
})
