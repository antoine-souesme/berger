import { app, ipcMain } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { lireEtatFenetre, type EtatFenetre } from '../shared/etat-fenetre'

// L'état retenu de la fenêtre, dans le dossier de données d'Electron
// (`etat-fenetre.json`).
const fichier = (): string => join(app.getPath('userData'), 'etat-fenetre.json')

export function lireEtat(): EtatFenetre {
  try {
    return lireEtatFenetre(JSON.parse(readFileSync(fichier(), 'utf8')))
  } catch {
    return lireEtatFenetre(null)
  }
}

let enAttente: EtatFenetre | null = null
let minuteur: NodeJS.Timeout | null = null

function ecrireMaintenant(): void {
  if (minuteur) clearTimeout(minuteur)
  minuteur = null
  if (!enAttente) return
  try {
    mkdirSync(dirname(fichier()), { recursive: true })
    writeFileSync(fichier(), JSON.stringify(enAttente, null, 2))
  } catch (e) {
    console.error('[berger] état de la fenêtre non enregistré :', (e as Error).message)
  }
  enAttente = null
}

export function brancherEtat(): { vider: () => void } {
  ipcMain.handle('berger:etat-fenetre', () => lireEtat())
  // Au plus une écriture toutes les 300 ms.
  ipcMain.on('berger:retenir', (_e, etat: unknown) => {
    enAttente = lireEtatFenetre(etat)
    if (!minuteur) minuteur = setTimeout(ecrireMaintenant, 300)
  })
  return { vider: ecrireMaintenant }
}
