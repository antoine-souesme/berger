import { app } from 'electron'
import { execFileSync } from 'child_process'
import { extrairePath, fusionnerPath, MARQUE } from '../shared/chemin'

// Version installée seulement : complète le PATH avec celui du shell de
// connexion (hc, node, les serveurs de langage). Ne lève jamais : en cas
// d'échec, `cheminHc` garde son `~/.local/bin/hc`.
export function completerPath(): void {
  if (!app.isPackaged) return
  try {
    const sortie = execFileSync(
      process.env['SHELL'] ?? '/bin/zsh',
      ['-ilc', `printf '${MARQUE}%s${MARQUE}' "$PATH"`],
      { timeout: 3000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    )
    const duShell = extrairePath(sortie)
    if (duShell) process.env['PATH'] = fusionnerPath(process.env['PATH'] ?? '', duShell)
  } catch (e) {
    console.log(`[berger] PATH du shell illisible : ${(e as Error).message}`)
  }
}
