import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import {
  lireEtatFichiers,
  reprendreFichiersDeHerdr,
  retirerAbsents,
  type EtatFichiers
} from '../shared/etat-fichiers'

// L'état des fichiers de chaque workspace (`fichiers.json`, dossier de données
// d'Electron). Au premier lancement, repris une seule fois de Herdr
// (`~/.config/herdr-app/shared.json`, lu, jamais écrit).
const fichier = (): string => join(app.getPath('userData'), 'fichiers.json')
const PARTAGE_HERDR = join(homedir(), '.config', 'herdr-app', 'shared.json')

const trace = (texte: string): void => {
  if (process.env['BERGER_TRACE']) console.log(`[berger] ${texte}`)
}

function lireAuDemarrage(): { etat: EtatFichiers; neuf: boolean } {
  if (existsSync(fichier())) {
    let brut: unknown
    try {
      brut = JSON.parse(readFileSync(fichier(), 'utf8'))
    } catch {
      brut = null
    }
    const etat = lireEtatFichiers(brut)
    if (etat) return { etat, neuf: false }
    try {
      renameSync(fichier(), fichier() + '.illisible')
      console.error('[berger] fichiers.json illisible, renommé en fichiers.json.illisible')
    } catch (e) {
      console.error('[berger] fichiers.json illisible :', (e as Error).message)
    }
  }
  let partage: unknown
  try {
    partage = JSON.parse(readFileSync(PARTAGE_HERDR, 'utf8'))
  } catch {
    partage = null
  }
  const etat = reprendreFichiersDeHerdr(partage)
  trace(
    `premier lancement : fichiers de Herdr ${partage === null ? 'absents' : `lus (${Object.keys(etat).length} workspaces)`}`
  )
  return { etat, neuf: true }
}

export function brancherEtatFichiers(): { vider: () => void } {
  const depart = lireAuDemarrage()
  // Un fichier retenu qui n'existe plus est retiré sans bruit.
  let etat = retirerAbsents(depart.etat, existsSync)
  let aEcrire = depart.neuf || etat !== depart.etat
  let minuteur: NodeJS.Timeout | null = null

  const ecrireMaintenant = (): void => {
    if (minuteur) clearTimeout(minuteur)
    minuteur = null
    if (!aEcrire) return
    aEcrire = false
    try {
      mkdirSync(dirname(fichier()), { recursive: true })
      writeFileSync(fichier(), JSON.stringify(etat, null, 2))
      trace('fichiers.json écrit')
    } catch (e) {
      console.error('[berger] fichiers non enregistrés :', (e as Error).message)
    }
  }
  if (aEcrire) ecrireMaintenant()

  ipcMain.handle('berger:etat-fichiers', () => etat)
  // Au plus une écriture toutes les 300 ms.
  ipcMain.on('berger:retenir-fichiers', (_e, brut: unknown) => {
    const lu = lireEtatFichiers(brut)
    if (!lu) return
    etat = lu
    aEcrire = true
    if (!minuteur) minuteur = setTimeout(ecrireMaintenant, 300)
  })
  return { vider: ecrireMaintenant }
}
