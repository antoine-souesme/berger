import { expect, test } from 'vitest'
import { AGE_MAX, sousAgentsHooks } from '../src/shared/sous-agents'

test('sousAgentsHooks lit les étiquettes antoine.sub, du plus ancien au plus récent', () => {
  const etiquettes = {
    'antoine.sub.b': '{"type":"Explore","at":2000,"s":"x"}',
    'antoine.sub.a': '{"type":"Plan","at":1000,"s":"x"}',
    'antoine.sub.mauvais': 'pas du json',
    'antoine.sub.vide': '',
    'antoine.sub.nombre': '3',
    'herdr.pinned': '1'
  }
  expect(sousAgentsHooks(etiquettes, null)).toEqual([
    { id: 'a', type: 'Plan', depuis: 1000 },
    { id: 'b', type: 'Explore', depuis: 2000 }
  ])
})

test('sousAgentsHooks oublie une étiquette de plus de 12 heures quand maintenant est donné', () => {
  const etiquettes = {
    'antoine.sub.vieux': '{"type":"x","at":0}',
    'antoine.sub.neuf': `{"type":"y","at":${AGE_MAX}}`
  }
  expect(sousAgentsHooks(etiquettes, AGE_MAX + 1)).toHaveLength(2) // at: 0 : inconnu, gardé
  expect(sousAgentsHooks({ 'antoine.sub.vieux': '{"type":"x","at":1}' }, AGE_MAX + 1)).toEqual([])
  expect(sousAgentsHooks({ 'antoine.sub.vieux': '{"type":"x","at":1}' }, null)).toHaveLength(1)
})

test('sousAgentsHooks sans étiquettes', () => {
  expect(sousAgentsHooks(undefined, 0)).toEqual([])
})

test('type absent ou non texte : vide', () => {
  expect(sousAgentsHooks({ 'antoine.sub.x': '{"at":5}' }, null)).toEqual([
    { id: 'x', type: '', depuis: 5 }
  ])
})
