import { expect, test } from 'vitest'
import { marquesDiff } from '../src/shared/diff-lignes'

const t = (...l: string[]): string => l.join('\n')

test('rien de changé, rien de marqué', () => {
  expect(marquesDiff(t('a', 'b'), t('a', 'b'))).toEqual([])
  expect(marquesDiff(t('a', 'b'), t('a', 'b').replace('\n', '\r\n'))).toEqual([])
})

test('lignes ajoutées', () => {
  expect(marquesDiff(t('a', 'c'), t('a', 'b1', 'b2', 'c'))).toEqual([
    { type: 'ajout', debut: 2, fin: 3 }
  ])
  expect(marquesDiff('', t('', 'x'))).toEqual([{ type: 'ajout', debut: 2, fin: 2 }])
})

test('ligne modifiée', () => {
  expect(marquesDiff(t('a', 'b', 'c'), t('a', 'B', 'c'))).toEqual([
    { type: 'modif', debut: 2, fin: 2 }
  ])
})

test('lignes supprimées : au milieu, au début, à la fin', () => {
  expect(marquesDiff(t('a', 'b', 'c'), t('a', 'c'))).toEqual([
    { type: 'suppression', ligne: 2, enBas: false }
  ])
  expect(marquesDiff(t('a', 'b', 'c'), t('b', 'c'))).toEqual([
    { type: 'suppression', ligne: 1, enBas: false }
  ])
  expect(marquesDiff(t('a', 'b', 'c'), t('a', 'b'))).toEqual([
    { type: 'suppression', ligne: 2, enBas: true }
  ])
})

test('plusieurs changements séparés', () => {
  expect(marquesDiff(t('a', 'b', 'c', 'd', 'e'), t('a', 'B', 'c', 'e', 'f'))).toEqual([
    { type: 'modif', debut: 2, fin: 2 },
    { type: 'suppression', ligne: 4, enBas: false },
    { type: 'ajout', debut: 5, fin: 5 }
  ])
})

test('un gros fichier reste rapide', () => {
  const ancien = Array.from({ length: 20000 }, (_, i) => `ligne ${i}`)
  const nouveau = [...ancien]
  nouveau[100] = 'changée'
  nouveau.splice(15000, 0, 'nouvelle')
  const debut = Date.now()
  expect(marquesDiff(ancien.join('\n'), nouveau.join('\n'))).toEqual([
    { type: 'modif', debut: 101, fin: 101 },
    { type: 'ajout', debut: 15001, fin: 15001 }
  ])
  expect(Date.now() - debut).toBeLessThan(1000)
})

test('lignes remplacées par plus de lignes, et lignes échangées', () => {
  expect(marquesDiff(t('a', 'b', 'c'), t('a', 'x', 'y', 'z', 'c'))).toEqual([
    { type: 'modif', debut: 2, fin: 4 }
  ])
  const m = marquesDiff(t('a', 'b', 'c', 'd'), t('a', 'c', 'b', 'd'))
  expect(m.length).toBe(2)
})

test('tirage au hasard : les marques couvrent exactement les lignes nouvelles', () => {
  let graine = 7
  const hasard = (n: number): number => (graine = (graine * 48271) % 2147483647) % n
  for (let essai = 0; essai < 200; essai++) {
    const ancien = Array.from({ length: hasard(30) }, () => 'l' + hasard(6))
    const nouveau = [...ancien]
    for (let c = hasard(5); c > 0; c--) {
      const p = hasard(nouveau.length + 1)
      if (hasard(2)) nouveau.splice(p, 0, 'n' + hasard(6))
      else nouveau.splice(p, 1)
    }
    const marques = marquesDiff(ancien.join('\n'), nouveau.join('\n'))
    // Les lignes non marquées, dans l'ordre, sont une suite de l'ancien texte.
    const marquees = new Set<number>()
    for (const x of marques)
      if (x.type !== 'suppression') for (let l = x.debut; l <= x.fin; l++) marquees.add(l)
    const gardees = nouveau.filter((_, i) => !marquees.has(i + 1))
    let k = 0
    for (const l of ancien) if (k < gardees.length && gardees[k] === l) k++
    expect(k).toBe(gardees.length)
  }
})
