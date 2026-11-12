import { app, ipcMain } from 'electron'
import { readFileSync } from 'fs'
import { join } from 'path'
import { lireReglages, type Reglages } from '../shared/reglages'

// Les réglages écrits à la main dans `reglages.json` (dossier de données de
// Berger), relus à chaque demande ; Berger ne crée ni n'écrit ce fichier.
export function lireReglagesFichier(): Reglages {
  try {
    return lireReglages(
      JSON.parse(readFileSync(join(app.getPath('userData'), 'reglages.json'), 'utf8'))
    )
  } catch {
    return lireReglages(null)
  }
}

export function brancherReglages(): void {
  ipcMain.handle('berger:reglages', () => lireReglagesFichier())
}
