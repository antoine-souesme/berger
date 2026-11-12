import { afterEach, beforeEach, expect, test } from 'vitest'
import { execFileSync } from 'child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  coller,
  creer,
  fichiersSeuls,
  listerDossier,
  nomsPris,
  renommer,
  statutGit,
  tousLesFichiers,
  transferer
} from '../src/main/disque'

let dir = ''
let cible = ''
let src = ''
const corbeille = async (c: string): Promise<void> => renameSync(c, c + '.jete')

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'berger-essai-'))
  cible = join(dir, 'cible')
  mkdirSync(cible)
  mkdirSync(join(dir, 'source'))
  src = join(dir, 'source', 'a.txt')
  writeFileSync(src, 'neuf')
  writeFileSync(join(cible, 'a.txt'), 'ancien')
})
afterEach(() => {
  if (dir.includes('berger-essai-')) rmSync(dir, { recursive: true, force: true })
})

test('listerDossier : dossiers d’abord, masqués retirés', async () => {
  const d = join(dir, 'liste')
  mkdirSync(join(d, 'src'), { recursive: true })
  writeFileSync(join(d, 'a.txt'), '')
  writeFileSync(join(d, '.DS_Store'), '')
  const r = await listerDossier(d)
  expect('entrees' in r && r.entrees.map((e) => e.nom)).toEqual(['src', 'a.txt'])
  expect('entrees' in r && r.tronque).toBe(false)
  expect('erreur' in (await listerDossier(join(dir, 'absent')))).toBe(true)
})

test('listerDossier marque ce que git ignore, statutGit lit les changements', async () => {
  const d = join(dir, 'depot')
  mkdirSync(join(d, 'node_modules'), { recursive: true })
  execFileSync('git', ['init', '-q', d])
  writeFileSync(join(d, '.gitignore'), 'node_modules\n')
  writeFileSync(join(d, 'neuf.txt'), '')
  const r = await listerDossier(d)
  expect('entrees' in r && r.entrees.find((e) => e.nom === 'node_modules')?.ignore).toBe(true)
  expect('entrees' in r && r.entrees.find((e) => e.nom === 'neuf.txt')?.ignore).toBe(false)
  const s = await statutGit(d)
  expect(s?.statut).toContainEqual(['neuf.txt', 'nonSuivi'])
  expect(await statutGit(join(dir, 'source'))).toBeNull()
  expect((await tousLesFichiers(d)).sort()).toEqual(['.gitignore', 'neuf.txt'])
})

test('transferer refuse un nom pris sans choix et ne touche à rien', async () => {
  expect(await nomsPris([src], cible)).toEqual(['a.txt'])
  const r = await transferer({ sources: [src], cible, copier: false, conflit: null, corbeille })
  expect(r.erreurs).toHaveLength(1)
  expect(readFileSync(join(cible, 'a.txt'), 'utf8')).toBe('ancien')
  expect(existsSync(src)).toBe(true)
})

test('remplacer met l’ancien à la corbeille avant de déplacer', async () => {
  const jetes: string[] = []
  const r = await transferer({
    sources: [src],
    cible,
    copier: false,
    conflit: 'remplacer',
    corbeille: async (c) => {
      jetes.push(c)
      renameSync(c, c + '.jete')
    }
  })
  expect(jetes).toEqual([join(cible, 'a.txt')])
  expect(readFileSync(join(cible, 'a.txt'), 'utf8')).toBe('neuf')
  expect(existsSync(src)).toBe(false)
  expect(r.faits).toEqual([[src, join(cible, 'a.txt')]])
})

test('garder les deux : « a copie.txt »', async () => {
  const r = await transferer({ sources: [src], cible, copier: false, conflit: 'garder', corbeille })
  expect(readFileSync(join(cible, 'a copie.txt'), 'utf8')).toBe('neuf')
  expect(readFileSync(join(cible, 'a.txt'), 'utf8')).toBe('ancien')
  expect(r.faits).toEqual([[src, join(cible, 'a copie.txt')]])
})

test('copier laisse la source', async () => {
  const autre = join(dir, 'autre')
  mkdirSync(autre)
  await transferer({ sources: [src], cible: autre, copier: true, conflit: null, corbeille })
  expect(existsSync(src)).toBe(true)
  expect(readFileSync(join(autre, 'a.txt'), 'utf8')).toBe('neuf')
})

test('un dossier ne va pas dans lui-même ; déjà dans la cible : rien', async () => {
  const d = join(dir, 'd')
  mkdirSync(join(d, 'sous'), { recursive: true })
  const r = await transferer({
    sources: [d],
    cible: join(d, 'sous'),
    copier: false,
    conflit: null,
    corbeille
  })
  expect(r.erreurs).toEqual(['Impossible de déplacer un dossier dans lui-même.'])
  expect(existsSync(join(d, 'sous'))).toBe(true)
  const r2 = await transferer({
    sources: [src],
    cible: join(dir, 'source'),
    copier: false,
    conflit: null,
    corbeille
  })
  expect(r2).toEqual({ faits: [], erreurs: [] })
})

test('creer et renommer refusent un nom pris', async () => {
  writeFileSync(join(dir, 'a.txt'), '')
  writeFileSync(join(dir, 'b.txt'), '')
  expect(await creer(join(dir, 'a.txt'), false)).toEqual({
    erreur: 'Un élément porte déjà ce nom.'
  })
  expect(await renommer(join(dir, 'b.txt'), join(dir, 'a.txt'))).toEqual({
    erreur: 'Un élément porte déjà ce nom.'
  })
  expect(await creer(join(dir, 'n', 'x.txt'), false)).toHaveProperty('erreur')
  expect(await creer(join(dir, 'neuf'), true)).toEqual({ ok: true })
  expect(await creer(join(dir, 'neuf.txt'), false)).toEqual({ ok: true })
  expect(await renommer(join(dir, 'b.txt'), join(dir, 'c.txt'))).toEqual({ ok: true })
  expect(existsSync(join(dir, 'c.txt'))).toBe(true)
})

test('coller prend un nom libre', async () => {
  writeFileSync(join(dir, 'a.txt'), 'x')
  const r = await coller([join(dir, 'a.txt')], dir)
  expect(r.faits).toEqual([[join(dir, 'a.txt'), join(dir, 'a copie.txt')]])
  expect(readFileSync(join(dir, 'a copie.txt'), 'utf8')).toBe('x')
  expect(readFileSync(join(dir, 'a.txt'), 'utf8')).toBe('x')
})

test('tousLesFichiers hors git : sans node_modules ni .git', async () => {
  const d = join(dir, 'libre')
  mkdirSync(join(d, 'node_modules', 'x'), { recursive: true })
  mkdirSync(join(d, '.git'), { recursive: true })
  mkdirSync(join(d, 'src'), { recursive: true })
  writeFileSync(join(d, 'node_modules', 'x', 'i.js'), '')
  writeFileSync(join(d, '.git', 'HEAD'), '')
  writeFileSync(join(d, 'src', 'a.ts'), '')
  writeFileSync(join(d, '.DS_Store'), '')
  expect(await tousLesFichiers(d)).toEqual(['src/a.ts'])
})

test('fichiersSeuls garde les fichiers ordinaires', async () => {
  expect(await fichiersSeuls([src, join(dir, 'source'), join(dir, 'absent')])).toEqual([src])
})

test('garder les deux : un nom qui ne diffère que par les majuscules n’écrase rien', async () => {
  writeFileSync(join(cible, 'readme.md'), 'ancien')
  const source = join(dir, 'source', 'Readme.md')
  writeFileSync(source, 'neuf')
  const r = await transferer({
    sources: [source],
    cible,
    copier: false,
    conflit: 'garder',
    corbeille
  })
  expect(readFileSync(join(cible, 'readme.md'), 'utf8')).toBe('ancien')
  expect(r.faits).toEqual([[source, join(cible, 'Readme copie.md')]])
  expect(readFileSync(join(cible, 'Readme copie.md'), 'utf8')).toBe('neuf')
})

test('remplacer refuse de jeter le dossier qui contient la source', async () => {
  const p = join(dir, 'projet')
  mkdirSync(join(p, 'src', 'src'), { recursive: true })
  writeFileSync(join(p, 'src', 'src', 'x.ts'), 'x')
  const jetes: string[] = []
  const r = await transferer({
    sources: [join(p, 'src', 'src')],
    cible: p,
    copier: false,
    conflit: 'remplacer',
    corbeille: async (c) => void jetes.push(c)
  })
  expect(jetes).toEqual([])
  expect(r.erreurs).toHaveLength(1)
  expect(existsSync(join(p, 'src', 'src', 'x.ts'))).toBe(true)
})
