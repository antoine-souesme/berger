import { app, screen, type BrowserWindow } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { lireCadre, type Cadre } from '../shared/cadre-fenetre'

// Taille, place et plein écran de la fenêtre, retenus dans `fenetre.json`.
const fichier = (): string => join(app.getPath('userData'), 'fenetre.json')

export function cadreRetenu(): Cadre | null {
  try {
    const ecrans = screen.getAllDisplays().map((d) => ({
      x: d.workArea.x,
      y: d.workArea.y,
      largeur: d.workArea.width,
      hauteur: d.workArea.height
    }))
    return lireCadre(JSON.parse(readFileSync(fichier(), 'utf8')), ecrans)
  } catch {
    return null
  }
}

// Écrit 500 ms après chaque changement, et tout de suite à la fermeture.
export function suivreCadre(w: BrowserWindow): { vider: () => void } {
  let minuteur: NodeJS.Timeout | null = null
  let dernier = ''
  const ecrire = (): void => {
    if (minuteur) clearTimeout(minuteur)
    minuteur = null
    if (w.isDestroyed()) return
    // Hors plein écran et agrandissement : le cadre d'avant.
    const b = w.getNormalBounds()
    const cadre: Cadre = {
      x: b.x,
      y: b.y,
      largeur: b.width,
      hauteur: b.height,
      pleinEcran: w.isFullScreen(),
      agrandie: w.isMaximized()
    }
    const texte = JSON.stringify(cadre, null, 2)
    if (texte === dernier) return
    try {
      mkdirSync(dirname(fichier()), { recursive: true })
      writeFileSync(fichier(), texte)
      dernier = texte
    } catch (e) {
      console.error('[berger] window layout not saved:', (e as Error).message)
    }
  }
  const plusTard = (): void => {
    if (minuteur) clearTimeout(minuteur)
    minuteur = setTimeout(ecrire, 500)
  }
  for (const ev of [
    'resize',
    'move',
    'maximize',
    'unmaximize',
    'enter-full-screen',
    'leave-full-screen'
  ] as const)
    w.on(ev as 'resize', plusTard)
  w.on('close', ecrire)
  return { vider: ecrire }
}
