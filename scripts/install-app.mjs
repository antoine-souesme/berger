#!/usr/bin/env node
// Construit Berger.app et l'installe dans /Applications, à la place de la
// version précédente. Le dossier de données (~/Library/Application Support/Berger)
// n'est jamais touché ; les terminaux survivent (Berger les détache en quittant).
// Usage : npm run install-app
import { execFileSync, spawnSync } from 'child_process'
import { existsSync, readdirSync, renameSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const CIBLE = '/Applications/Berger.app'
const NOUVEAU = '/Applications/Berger.app.nouveau'
const ANCIEN = '/Applications/Berger.app.ancien'

const lancer = (commande, args) => execFileSync(commande, args, { cwd: RACINE, stdio: 'inherit' })
const tourne = () => spawnSync('pgrep', ['-f', `${CIBLE}/Contents/MacOS/`]).status === 0
const attendre = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

lancer('npm', ['run', 'build'])
lancer('npx', ['electron-builder', '--mac', '--dir'])
const dossier = readdirSync(join(RACINE, 'dist')).find(
  (d) => d.startsWith('mac') && existsSync(join(RACINE, 'dist', d, 'Berger.app'))
)
if (!dossier) throw new Error('Berger.app not found in dist/')
const app = join(RACINE, 'dist', dossier, 'Berger.app')
// Signature locale (sans compte Apple) : macOS lance l'application sans la refuser.
lancer('codesign', ['--force', '--deep', '-s', '-', app])

// Berger installé tourne : on lui demande de quitter (il pose sa question des
// fichiers non enregistrés), et on attend jusqu'à 60 s.
const tournaitAvant = tourne()
if (tournaitAvant) {
  spawnSync('osascript', ['-e', 'quit app id "fr.antoine.berger"'])
  for (let i = 0; i < 120 && tourne(); i++) attendre(500)
  if (tourne()) {
    console.error('Berger is still running: quit it, then run npm run install-app again.')
    process.exit(1)
  }
}

// Copie à côté, puis échange : jamais d'application à moitié copiée.
rmSync(NOUVEAU, { recursive: true, force: true })
lancer('ditto', [app, NOUVEAU])
rmSync(ANCIEN, { recursive: true, force: true })
if (existsSync(CIBLE)) renameSync(CIBLE, ANCIEN)
renameSync(NOUVEAU, CIBLE)
rmSync(ANCIEN, { recursive: true, force: true })
console.log(`Berger installed: ${CIBLE}`)
if (tournaitAvant) spawnSync('open', ['-a', CIBLE])
