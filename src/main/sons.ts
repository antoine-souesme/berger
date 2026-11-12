import { app, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { isAbsolute, join } from 'path'
import { etatReglages } from './reglages'
import type { Son } from '../shared/sons'

// Les sons des agents, joués par macOS (`afplay`) : ceux de macOS par défaut,
// ou le fichier des réglages (chemin absolu ou relatif au dossier de données).
const SONS_MACOS: Record<Son, string> = {
  fini: '/System/Library/Sounds/Glass.aiff',
  attente: '/System/Library/Sounds/Funk.aiff'
}

export function fichierSon(son: Son): string {
  const perso = etatReglages().reglages.sons[son]
  if (!perso) return SONS_MACOS[son]
  return isAbsolute(perso) ? perso : join(app.getPath('userData'), perso)
}

// `essai` : le bouton « Écouter » des réglages, qui sonne même sons coupés.
export function brancherSons(): void {
  ipcMain.on('berger:son', (_e, { son, essai }: { son: Son; essai?: boolean }) => {
    if (son !== 'fini' && son !== 'attente') return
    if (!essai && !etatReglages().reglages.sons.actifs) return
    const fichier = fichierSon(son)
    if (process.env['BERGER_TRACE']) console.log(`[berger] sound ${son}: ${fichier}`)
    execFile('afplay', [fichier], (err) => {
      if (err) console.error(`[berger] sound not played (${fichier}):`, err.message)
    })
  })
}
