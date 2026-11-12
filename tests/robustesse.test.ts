import { expect, test } from 'vitest'
import { join } from 'path'

const attendre = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

test('hc qui meurt aussitôt : les écritures suivantes ne lèvent pas EPIPE', async () => {
  process.env['BERGER_HC'] = join(__dirname, 'faux/hc-meurt.sh')
  const { Hc } = await import('../src/main/hc')
  const erreurs: unknown[] = []
  const surErreur = (e: unknown): void => void erreurs.push(e)
  process.on('uncaughtException', surErreur)
  const hc = await Hc.ouvrir()
  await attendre(150)
  for (let i = 0; i < 5; i++) hc.requete('terminal.list').catch(() => {})
  await attendre(400)
  process.off('uncaughtException', surErreur)
  expect(erreurs).toEqual([])
})

test('hc introuvable : ouvrir() échoue proprement, sans exception non rattrapée', async () => {
  process.env['BERGER_HC'] = '/chemin/qui/n/existe/pas/hc'
  const { Hc } = await import('../src/main/hc')
  await expect(Hc.ouvrir()).rejects.toThrow()
  await attendre(100)
})

test("après detacher(), plus aucun octet du terminal quitté n'est rendu", async () => {
  process.env['BERGER_HC'] = join(__dirname, 'faux/hc-trame.mjs')
  const { TerminalOuvert } = await import('../src/main/terminal')
  let recus = 0
  const t = new TerminalOuvert('t1', 80, 24, { sortie: () => recus++, fin: () => {} })
  for (let i = 0; i < 40 && recus === 0; i++) await attendre(50)
  expect(recus).toBeGreaterThan(0)
  t.detacher()
  const avant = recus
  await attendre(150)
  expect(recus).toBe(avant)
})

test('hc qui ne répond pas au hello : ouvrir() abandonne après le délai', async () => {
  process.env['BERGER_HC'] = join(__dirname, 'faux/hc-muet.sh')
  const { Hc } = await import('../src/main/hc')
  const debut = Date.now()
  await expect(Hc.ouvrir(200)).rejects.toMatchObject({ kind: 'timeout' })
  expect(Date.now() - debut).toBeLessThan(1000)
})

test('erreur au hello tramé : remontée, sans terminal.attach', async () => {
  process.env['BERGER_HC'] = join(__dirname, 'faux/hc-trame-erreur.mjs')
  const { TerminalOuvert } = await import('../src/main/terminal')
  let raison: string | null = null
  new TerminalOuvert('t1', 80, 24, { sortie: () => {}, fin: (r) => (raison = r) })
  for (let i = 0; i < 40 && raison === null; i++) await attendre(50)
  expect(raison).toBe('version refusée')
})

test('liste de fichiers plafonnée : signalée', async () => {
  const { mkdtempSync, writeFileSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { listerFichiers } = await import('../src/main/fichiers')
  const dossier = mkdtempSync(join(tmpdir(), 'berger-liste-'))
  for (let i = 0; i < 6; i++) writeFileSync(join(dossier, `f${i}.txt`), '')
  expect(await listerFichiers(dossier, 5)).toMatchObject({ tronquee: true })
  expect((await listerFichiers(dossier, 5)).fichiers).toHaveLength(5)
  expect(await listerFichiers(dossier, 6)).toMatchObject({ tronquee: false })
})

test('space sans dossier : liste vide, sans parcourir', async () => {
  const { listerFichiers } = await import('../src/main/fichiers')
  expect(await listerFichiers('')).toEqual({ fichiers: [], tronquee: false })
})
