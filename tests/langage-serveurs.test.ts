import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { ServeursLangage } from '../src/main/services/langage'

let dossier = ''
const a = (): string => join(dossier, 'src', 'a.ts')
const texteA = "import { somme } from './b'\nexport const x = somme(1, 2)\n"

beforeAll(() => {
  dossier = mkdtempSync(join(tmpdir(), 'berger-essai-lsp-'))
  mkdirSync(join(dossier, 'src'))
  writeFileSync(
    join(dossier, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, include: ['src'] })
  )
  writeFileSync(
    join(dossier, 'src', 'b.ts'),
    'export function somme(a: number, b: number): number {\n  return a + b\n}\n'
  )
  writeFileSync(a(), texteA)
})
afterAll(() => {
  if (dossier.includes('berger-essai')) rmSync(dossier, { recursive: true, force: true })
})

const ouvrir = (s: ServeursLangage, chemin: string, texte: string): void =>
  s.notifier(chemin, 'textDocument/didOpen', {
    textDocument: {
      uri: pathToFileURL(chemin).href,
      languageId: 'typescript',
      version: 1,
      text: texte
    }
  })

test('definition dans un autre fichier', async () => {
  const s = new ServeursLangage({ notifier: () => {}, redemarre: () => {}, arrete: () => {} })
  try {
    ouvrir(s, a(), texteA)
    const r = await s.requete(a(), 'textDocument/definition', {
      textDocument: { uri: pathToFileURL(a()).href },
      position: { line: 1, character: 18 }
    })
    expect(r.erreur).toBeUndefined()
    const liste = (Array.isArray(r.resultat) ? r.resultat : [r.resultat]) as {
      uri?: string
      targetUri?: string
    }[]
    expect(liste.length).toBeGreaterThan(0)
    expect(liste[0].uri ?? liste[0].targetUri).toMatch(/\/src\/b\.ts$/)
  } finally {
    s.arreter()
  }
}, 30_000)

test('erreur de type signalée', async () => {
  const diagnostics: { code?: number | string }[] = []
  const recu = new Promise<void>((fin) => {
    const s = new ServeursLangage({
      notifier: (_cle, methode, params) => {
        const p = params as { uri: string; diagnostics: { code?: number | string }[] }
        if (methode === 'textDocument/publishDiagnostics' && p.diagnostics.length) {
          diagnostics.push(...p.diagnostics)
          s.arreter()
          fin()
        }
      },
      redemarre: () => {},
      arrete: () => {}
    })
    ouvrir(s, a(), texteA + "const n: number = 'x'\n")
  })
  await recu
  expect(diagnostics.some((d) => d.code === 2322)).toBe(true)
}, 30_000)

test('serveur qui meurt', async () => {
  const arrete = vi.fn()
  const lancer = vi.fn(() => ({
    commande: process.execPath,
    args: [join(__dirname, 'faux', 'lsp-meurt.mjs')]
  }))
  const s = new ServeursLangage({ notifier: () => {}, redemarre: () => {}, arrete, lancer })
  for (let i = 0; i < 3; i++) {
    const r = await s.requete(a(), 'textDocument/hover', {}, 5000)
    expect(r.erreur).toBeTruthy()
  }
  expect(arrete).toHaveBeenCalledTimes(1)
  expect(arrete).toHaveBeenCalledWith('typescript')
  const r = await s.requete(a(), 'textDocument/hover', {})
  expect(r).toEqual({ erreur: "Le service TypeScript s'est arrêté." })
  expect(lancer).toHaveBeenCalledTimes(3)
  s.arreter()
}, 20_000)

test('serveur muet', async () => {
  const s = new ServeursLangage({
    notifier: () => {},
    redemarre: () => {},
    arrete: () => {},
    lancer: () => ({ commande: process.execPath, args: [join(__dirname, 'faux', 'lsp-muet.mjs')] })
  })
  const debut = Date.now()
  const r = await s.requete(a(), 'textDocument/hover', {}, 200)
  expect(r).toEqual({ erreur: 'Délai dépassé.' })
  expect(Date.now() - debut).toBeLessThan(1000)
  s.arreter()
})

test('un projet qui plante ne coupe pas les autres projets', async () => {
  const arrete = vi.fn()
  const autre = mkdtempSync(join(tmpdir(), 'berger-essai-lsp-autre-'))
  writeFileSync(join(autre, 'package.json'), '{}')
  const s = new ServeursLangage({
    notifier: () => {},
    redemarre: () => {},
    arrete,
    lancer: (_serveur, racine) => ({
      commande: process.execPath,
      args: [join(__dirname, 'faux', racine === autre ? 'lsp-muet.mjs' : 'lsp-meurt.mjs')]
    })
  })
  for (let i = 0; i < 3; i++) await s.requete(a(), 'textDocument/hover', {}, 5000)
  expect(arrete).toHaveBeenCalledTimes(1)
  const r = await s.requete(join(autre, 'x.ts'), 'textDocument/hover', {}, 200)
  expect(r).toEqual({ erreur: 'Délai dépassé.' })
  s.arreter()
  rmSync(autre, { recursive: true, force: true })
}, 20_000)

test('reinitialiser oublie les serveurs et les abandons (fenêtre rouverte)', async () => {
  const lancer = vi.fn(() => ({
    commande: process.execPath,
    args: [join(__dirname, 'faux', 'lsp-meurt.mjs')]
  }))
  const s = new ServeursLangage({
    notifier: () => {},
    redemarre: () => {},
    arrete: () => {},
    lancer
  })
  for (let i = 0; i < 3; i++) await s.requete(a(), 'textDocument/hover', {}, 5000)
  s.reinitialiser()
  await s.requete(a(), 'textDocument/hover', {}, 5000)
  expect(lancer).toHaveBeenCalledTimes(4)
  s.arreter()
}, 20_000)
