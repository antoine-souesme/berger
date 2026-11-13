import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { readdirSync } from 'fs'
import { isAbsolute, join } from 'path'
import { etatReglages } from './reglages'
import type { Son } from '../shared/sons'

// Les sons des agents, joués par macOS (`afplay`) : ceux de macOS par défaut,
// ou le fichier des réglages (chemin absolu ou relatif au dossier de données).
const DOSSIER_SONS_MACOS = '/System/Library/Sounds'
const SONS_MACOS: Record<Son, string> = {
  fini: '/System/Library/Sounds/Glass.aiff',
  attente: '/System/Library/Sounds/Funk.aiff'
}

export function fichierSon(son: Son): string {
  const perso = etatReglages().reglages.sons[son]
  if (!perso) return SONS_MACOS[son]
  return isAbsolute(perso) ? perso : join(app.getPath('userData'), perso)
}

// Les polices installées sur le Mac (familles), demandées à macOS une fois.
let familles: Promise<string[]> | null = null
function polices(): Promise<string[]> {
  familles ??= new Promise((rendre) =>
    execFile(
      'osascript',
      [
        '-l',
        'JavaScript',
        '-e',
        'ObjC.import("AppKit");ObjC.deepUnwrap($.NSFontManager.sharedFontManager.availableFontFamilies).join("\\n")'
      ],
      (err, sortie) => {
        if (err) console.error('[berger] installed fonts not read:', err.message)
        rendre(err ? [] : sortie.split('\n').filter(Boolean))
      }
    )
  )
  return familles
}

function sonsMacos(): string[] {
  try {
    return readdirSync(DOSSIER_SONS_MACOS)
      .filter((n) => /\.(aiff?|caf|wav|mp3|m4a)$/i.test(n))
      .map((n) => join(DOSSIER_SONS_MACOS, n))
  } catch {
    return Object.values(SONS_MACOS)
  }
}

// `essai` : le bouton « Écouter » des réglages, qui sonne même sons coupés.
export function brancherSons(): void {
  ipcMain.handle('berger:polices', () => polices())
  ipcMain.handle('berger:sons-macos', () => ({ sons: sonsMacos(), parDefaut: SONS_MACOS }))
  ipcMain.handle('berger:choisir-son', async (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    const options = {
      title: 'Choisir un son',
      defaultPath: DOSSIER_SONS_MACOS,
      properties: ['openFile' as const],
      filters: [{ name: 'Sons', extensions: ['aiff', 'aif', 'caf', 'wav', 'mp3', 'm4a'] }]
    }
    const r = w ? await dialog.showOpenDialog(w, options) : await dialog.showOpenDialog(options)
    return r.canceled ? null : (r.filePaths[0] ?? null)
  })
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
