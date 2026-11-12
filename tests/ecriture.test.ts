import { expect, test } from 'vitest'
import doc from './fixtures/herdr-app.json'
import { ecrireDoc } from '../src/main/ecriture'
import { ErreurHc } from '../src/main/hc'

type Appel = { methode: string; params: any }

// Faux core : rend les documents de `lectures` à chaque doc.get, et lève
// `conflict` aux `conflits` premiers doc.set.
function fauxCore(lectures: unknown[], conflits = 0, version = 7) {
  const appels: Appel[] = []
  let lu = 0
  let refus = 0
  const requete = async (methode: string, params: any): Promise<unknown> => {
    appels.push({ methode, params })
    if (methode === 'doc.get') {
      const value = lectures[Math.min(lu, lectures.length - 1)]
      return { value, version: version + lu++ }
    }
    if (methode === 'doc.set') {
      if (refus++ < conflits) throw new ErreurHc('conflict', 'conflict')
      return { version: 99 }
    }
    throw new Error('méthode inattendue')
  }
  return { requete, appels }
}

const renommer = { type: 'onglet.renommer', space: 'sp1', onglet: 'tb1', nom: 'essai' } as const

test('passe la version lue à doc.set', async () => {
  const { requete, appels } = fauxCore([doc])
  expect(await ecrireDoc(requete, renommer)).toBe('ecrit')
  const set = appels.find((a) => a.methode === 'doc.set')!
  expect(set.params.version).toBe(7)
  expect(set.params.name).toBe('herdr-app')
  expect(set.params.value.spaces[0].tabs[0].name).toBe('essai')
})

test('relit et réapplique après un conflit', async () => {
  const parHerdr = structuredClone(doc)
  parHerdr.spaces[1].name = 'Renommé par Herdr'
  const { requete, appels } = fauxCore([doc, parHerdr], 1)
  expect(await ecrireDoc(requete, renommer)).toBe('ecrit')
  const sets = appels.filter((a) => a.methode === 'doc.set')
  expect(sets).toHaveLength(2)
  expect(sets[1].params.version).toBe(8)
  expect(sets[1].params.value.spaces[1].name).toBe('Renommé par Herdr')
  expect(sets[1].params.value.spaces[0].tabs[0].name).toBe('essai')
})

test("n'écrit rien quand rien ne change", async () => {
  const { requete, appels } = fauxCore([doc])
  expect(await ecrireDoc(requete, { type: 'onglet.fermer', space: 'spZ', onglet: 'tbZ' })).toBe(
    'inchange'
  )
  expect(appels.some((a) => a.methode === 'doc.set')).toBe(false)
})

test('abandonne après 5 conflits', async () => {
  const { requete, appels } = fauxCore([doc], 100)
  await expect(ecrireDoc(requete, renommer)).rejects.toThrow()
  expect(appels.filter((a) => a.methode === 'doc.set')).toHaveLength(5)
})

test('une autre erreur est relancée tout de suite', async () => {
  const requete = async (methode: string): Promise<unknown> => {
    if (methode === 'doc.get') return { value: doc, version: 1 }
    throw new ErreurHc('refusé', 'invalid')
  }
  await expect(ecrireDoc(requete, renommer)).rejects.toThrow('refusé')
})
