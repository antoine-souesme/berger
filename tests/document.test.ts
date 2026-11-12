import { expect, test } from 'vitest'
import doc from './fixtures/herdr-app.json'
import mods from './fixtures/herdr-app-mods.json'
import { appliquer, idHerdr, placeDe, terminauxRetires, type Action } from '../src/shared/document'
import { terminauxDeLArbre } from '../src/shared/spaces'

test('onglet.nouveau ajoute un onglet sans nom à la fin du space', () => {
  const d = appliquer(doc, {
    type: 'onglet.nouveau',
    space: 'sp2',
    onglet: 'tbN',
    panneau: 'pN',
    adresse: 't7'
  }) as any
  expect(d.spaces[1].tabs.map((t: any) => t.id)).toEqual(['tb3', 'tbN'])
  expect(d.spaces[1].tabs[1]).toEqual({
    id: 'tbN',
    name: '',
    root: {
      type: 'row',
      id: 'tbN',
      children: [{ type: 'block', id: 'pN', content: { terminal: 't7' }, size: { weight: 1 } }]
    }
  })
})

test('onglet.nouveau ne double pas un terminal que Herdr a déjà rangé', () => {
  expect(
    appliquer(doc, {
      type: 'onglet.nouveau',
      space: 'sp1',
      onglet: 'tbN',
      panneau: 'pN',
      adresse: 't2b'
    })
  ).toBe(doc)
})

test('panneau.diviser déplace un terminal adopté par Herdr au lieu de le doubler', () => {
  const d = appliquer(doc, {
    type: 'panneau.diviser',
    space: 'sp1',
    onglet: 'tb1',
    panneau: 'p1',
    sens: 'down',
    nouveau: 'pN',
    conteneur: 'sN',
    adresse: 't2c'
  }) as any
  expect(terminauxDeLArbre(d.spaces[0].tabs[0].root)).toEqual(['t2b', 't2c'])
})

test('panneau.diviser : terminal déjà juste à droite du panneau, rien ne change', () => {
  expect(
    appliquer(doc, {
      type: 'panneau.diviser',
      space: 'sp1',
      onglet: 'tb1',
      panneau: 'p1',
      sens: 'right',
      nouveau: 'pN',
      conteneur: 'sN',
      adresse: 't2c'
    })
  ).toBe(doc)
})

test('panneau.diviser ajoute un bloc neuf avec son terminal', () => {
  const d = appliquer(doc, {
    type: 'panneau.diviser',
    space: 'sp2',
    onglet: 'tb3',
    panneau: 'p4',
    sens: 'right',
    nouveau: 'pN',
    conteneur: 'sN',
    adresse: 't8'
  }) as any
  expect(d.spaces[1].tabs[0].root.children.map((c: any) => c.id)).toEqual(['p4', 'pN'])
  expect(d.spaces[1].tabs[0].root.children[1].content).toEqual({ terminal: 't8' })
})

test('fermer le dernier onglet ferme le space', () => {
  const d = appliquer(doc, { type: 'onglet.fermer', space: 'sp2', onglet: 'tb3' }) as any
  expect(d.spaces.map((s: any) => s.id)).toEqual(['sp1'])
})

test("fermer le dernier panneau ferme l'onglet", () => {
  const d = appliquer(doc, {
    type: 'panneau.fermer',
    space: 'sp1',
    onglet: 'tb2',
    panneau: 'p3'
  }) as any
  expect(d.spaces[0].tabs.map((t: any) => t.id)).toEqual(['tb1'])
})

test('renommer à vide rend le nom de place', () => {
  const d = appliquer(doc, {
    type: 'onglet.renommer',
    space: 'sp1',
    onglet: 'tb1',
    nom: '  '
  }) as any
  expect(d.spaces[0].tabs[0].name).toBe('')
})

test('renommer garde le nom sans espaces autour', () => {
  const d = appliquer(doc, { type: 'space.renommer', space: 'sp1', nom: ' essai ' }) as any
  expect(d.spaces[0].name).toBe('essai')
})

test('panneaux de mods et champs inconnus survivent à chaque action', () => {
  const actions: Action[] = [
    { type: 'onglet.nouveau', space: 'sp1', onglet: 'tbN', panneau: 'pN', adresse: 't7' },
    { type: 'onglet.renommer', space: 'sp1', onglet: 'tb1', nom: 'essai' },
    { type: 'onglet.fermer', space: 'sp2', onglet: 'tb3' },
    { type: 'space.renommer', space: 'sp1', nom: 'essai' },
    {
      type: 'panneau.diviser',
      space: 'sp1',
      onglet: 'tb1',
      panneau: 'p1',
      sens: 'down',
      nouveau: 'pN',
      conteneur: 'sN',
      adresse: 't7'
    },
    { type: 'panneau.fermer', space: 'sp1', onglet: 'tb1', panneau: 'p1' },
    { type: 'panneau.echanger', space: 'sp1', onglet: 'tb1', a: 'p1', b: 'pm' },
    { type: 'panneau.poids', space: 'sp1', onglet: 'tb1', conteneur: 'tb1', poids: [1, 2, 3] }
  ]
  for (const action of actions) {
    const d = appliquer(mods, action) as any
    expect(d).not.toBe(mods)
    const json = JSON.stringify(d)
    expect(json).toContain('"mod":"antoine-md"')
    expect(json).toContain('"inconnu":42')
    expect(json).toContain('"settled":true')
    expect(json).toContain('"machine":null')
  }
})

test("le document d'entrée n'est jamais modifié", () => {
  const avant = JSON.stringify(mods)
  appliquer(mods, { type: 'panneau.fermer', space: 'sp1', onglet: 'tb1', panneau: 'p1' })
  appliquer(mods, { type: 'onglet.renommer', space: 'sp1', onglet: 'tb1', nom: 'x' })
  expect(JSON.stringify(mods)).toBe(avant)
})

test('cible introuvable : même document', () => {
  expect(
    appliquer(doc, { type: 'panneau.fermer', space: 'sp1', onglet: 'tb1', panneau: 'zz' })
  ).toBe(doc)
  expect(appliquer(doc, { type: 'onglet.fermer', space: 'spZ', onglet: 'tb1' })).toBe(doc)
  expect(appliquer(doc, { type: 'space.renommer', space: 'spZ', nom: 'a' })).toBe(doc)
})

test('idHerdr', () => {
  expect(idHerdr('p')).toMatch(/^p[0-9a-f]{32}$/)
  expect(idHerdr('tb')).toMatch(/^tb[0-9a-f]{32}$/)
})

test('terminauxRetires : seulement ceux que l’action a vraiment retirés', () => {
  const apres = appliquer(doc, {
    type: 'panneau.fermer',
    space: 'sp1',
    onglet: 'tb1',
    panneau: 'p1'
  })
  expect(terminauxRetires(doc, apres)).toEqual(['t2b'])
  expect(terminauxRetires(doc, doc)).toEqual([])
  const sansOnglet = appliquer(doc, { type: 'onglet.fermer', space: 'sp2', onglet: 'tb3' })
  expect(terminauxRetires(doc, sansOnglet)).toEqual(['t3'])
})

test('placeDe : onglet et panneau qui contiennent un terminal', () => {
  expect(placeDe(doc, 't2c')).toEqual({ space: 'sp1', onglet: 'tb1', panneau: 'p2' })
  expect(placeDe(doc, 'tZ')).toBeNull()
})

test('space.nouveau ajoute un space à la fin, avec un onglet et un panneau', () => {
  const action: Action = {
    type: 'space.nouveau',
    space: 'spN',
    onglet: 'tbN',
    panneau: 'pN',
    adresse: 't7'
  }
  const d = appliquer(mods, action) as any
  expect(d.spaces.map((s: any) => s.id)).toEqual([
    ...(mods as any).spaces.map((s: any) => s.id),
    'spN'
  ])
  expect(d.spaces.at(-1)).toEqual({
    id: 'spN',
    name: '',
    tabs: [
      {
        id: 'tbN',
        name: '',
        root: {
          type: 'row',
          id: 'tbN',
          children: [{ type: 'block', id: 'pN', content: { terminal: 't7' }, size: { weight: 1 } }]
        }
      }
    ]
  })
  // Ce que Berger ne comprend pas est gardé tel quel.
  ;(mods as any).spaces.forEach((s: any, i: number) => expect(d.spaces[i]).toBe(s))
  for (const k of Object.keys(mods)) if (k !== 'spaces') expect(d[k]).toBe((mods as any)[k])
})

test('space.nouveau ne change rien si le terminal est déjà rangé ou le space existe', () => {
  const base = { type: 'space.nouveau', onglet: 'tbN', panneau: 'pN' } as const
  expect(appliquer(doc, { ...base, space: 'spN', adresse: 't2b' })).toBe(doc)
  expect(appliquer(doc, { ...base, space: 'sp1', adresse: 't7' })).toBe(doc)
})

test('space.fermer retire le space et rend tous ses terminaux', () => {
  const d = appliquer(doc, { type: 'space.fermer', space: 'sp1' }) as any
  expect(d.spaces.map((s: any) => s.id)).toEqual(['sp2'])
  expect(d.spaces[0]).toBe(doc.spaces[1])
  expect(terminauxRetires(doc, d)).toEqual(['t2b', 't2c', 't99'])
  expect(appliquer(doc, { type: 'space.fermer', space: 'inconnu' })).toBe(doc)
})

test('idHerdr accepte sp', () => expect(idHerdr('sp')).toMatch(/^sp[0-9a-f]{32}$/))
