import { expect, test } from 'vitest'
import {
  changerPoids,
  diviser,
  echanger,
  feuilles,
  fermerPanneau,
  rectangles,
  voisin,
  type Bloc,
  type Conteneur,
  type Noeud
} from '../src/shared/arbre'

const b = (id: string, terminal: string): Bloc => ({ type: 'block', id, content: { terminal } })

// onglet « trois » : A à gauche, B en haut à droite, C en bas à droite (comme la maquette)
const trois = {
  type: 'row',
  id: 'tb',
  children: [
    { ...b('A', 't1'), size: { weight: 0.5 } },
    { type: 'column', id: 's1', size: { weight: 0.5 }, children: [b('B', 't2'), b('C', 't3')] }
  ]
} as Noeud

test("feuilles dans l'ordre de lecture", () =>
  expect(feuilles(trois).map((f) => f.id)).toEqual(['A', 'B', 'C']))

test('diviser à droite dans un row insère un frère et partage le poids', () => {
  const r = diviser(trois, 'A', 'right', b('N', 't9'), 'sX') as Conteneur
  expect(r.children.map((c) => c.id)).toEqual(['A', 'N', 's1'])
  expect(r.children[0].size).toEqual({ weight: 0.25 })
  expect(r.children[1].size).toEqual({ weight: 0.25 })
})

test('diviser en bas dans un row enveloppe le panneau dans un column', () => {
  const r = diviser(trois, 'A', 'down', b('N', 't9'), 'sX') as Conteneur
  expect(r.children[0]).toMatchObject({ type: 'column', id: 'sX', size: { weight: 0.5 } })
  expect(feuilles(r).map((f) => f.id)).toEqual(['A', 'N', 'B', 'C'])
})

test('diviser en bas dans un column partage le poids (enfant sans size = 1)', () => {
  const r = diviser(trois, 'B', 'down', b('N', 't9'), 'sX') as Conteneur
  const col = r.children[1] as Conteneur
  expect(col.children.map((c) => c.id)).toEqual(['B', 'N', 'C'])
  expect(col.children[0].size).toEqual({ weight: 0.5 })
  expect(col.children[1].size).toEqual({ weight: 0.5 })
})

test('fermer B remplace la colonne par C, qui prend sa taille', () => {
  const r = fermerPanneau(trois, 'B') as Conteneur
  expect(r.children[1]).toMatchObject({ id: 'C', size: { weight: 0.5 } })
})

test('fermer le dernier panneau rend null', () => {
  expect(fermerPanneau({ type: 'row', id: 'tb', children: [b('A', 't1')] }, 'A')).toBeNull()
})

test('la racine reste un row avec un seul enfant', () => {
  const r = fermerPanneau(fermerPanneau(trois, 'B')!, 'C')!
  expect(r).toMatchObject({ type: 'row', id: 'tb' })
  expect(feuilles(r).map((f) => f.id)).toEqual(['A'])
})

test('échanger garde les tailles aux positions', () => {
  const r = echanger(trois, 'A', 'C') as Conteneur
  expect(r.children[0]).toMatchObject({ id: 'C', size: { weight: 0.5 } })
  expect(feuilles(r).map((f) => f.id)).toEqual(['C', 'B', 'A'])
})

test('voisin', () => {
  expect(voisin(trois, 'A', 'right')).toBe('B')
  expect(voisin(trois, 'C', 'up')).toBe('B')
  expect(voisin(trois, 'C', 'left')).toBe('A')
  expect(voisin(trois, 'A', 'left')).toBeNull()
  expect(voisin(trois, 'Z', 'left')).toBeNull()
})

test('rectangles', () =>
  expect(rectangles(trois).get('C')).toEqual({ x: 0.5, y: 0.5, l: 0.5, h: 0.5 }))

test('champs inconnus et panneaux de mods gardés', () => {
  const avecMod = {
    ...trois,
    inconnu: 1,
    children: [
      ...(trois as Conteneur).children,
      {
        type: 'block',
        id: 'M',
        content: { mod: 'markdown', props: { file: '/x' } },
        extra: true
      }
    ]
  } as Noeud
  const r = diviser(avecMod, 'A', 'right', b('N', 't9'), 'sX') as Conteneur
  expect(r.inconnu).toBe(1)
  expect(r.children.at(-1)).toEqual({
    type: 'block',
    id: 'M',
    content: { mod: 'markdown', props: { file: '/x' } },
    extra: true
  })
})

test('panneau absent : arbre inchangé', () => {
  expect(fermerPanneau(trois, 'Z')).toBe(trois)
  expect(diviser(trois, 'Z', 'right', b('N', 't9'), 'sX')).toBe(trois)
  expect(echanger(trois, 'A', 'Z')).toBe(trois)
})

test("l'entrée n'est jamais modifiée", () => {
  const avant = JSON.stringify(trois)
  diviser(trois, 'A', 'right', b('N', 't9'), 'sX')
  fermerPanneau(trois, 'B')
  echanger(trois, 'A', 'C')
  changerPoids(trois, 'tb', [0.7, 0.3])
  expect(JSON.stringify(trois)).toBe(avant)
})

test('changerPoids', () =>
  expect((changerPoids(trois, 'tb', [0.7, 0.3]) as Conteneur).children[1].size).toEqual({
    weight: 0.3
  }))
