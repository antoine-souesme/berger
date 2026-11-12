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

test('dossier plafonné à 2 000 éléments : signalé', async () => {
  const { mkdtempSync, rmSync, writeFileSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { listerDossier, LIMITE_DOSSIER } = await import('../src/main/disque')
  const dossier = mkdtempSync(join(tmpdir(), 'berger-essai-liste-'))
  for (let i = 0; i <= LIMITE_DOSSIER; i++) writeFileSync(join(dossier, `f${i}.txt`), '')
  const r = await listerDossier(dossier)
  expect(r).toMatchObject({ tronque: true })
  expect('entrees' in r && r.entrees).toHaveLength(LIMITE_DOSSIER)
  rmSync(dossier, { recursive: true, force: true })
})
