import { dialog, ipcMain, type BrowserWindow } from 'electron'
import { readdir } from 'fs/promises'
import { join, relative } from 'path'
import type { Coeur } from './coeur'
import { DOSSIERS_IGNORES, LIMITE_FICHIERS } from '../shared/fichiers'

// Liste plate des fichiers d'un dossier (Node local : le core n'a pas de
// méthode pour lister ; machine locale seulement en phase 0).
export async function listerFichiers(dossier: string): Promise<string[]> {
  const trouves: string[] = []
  const parcourir = async (ici: string): Promise<void> => {
    if (trouves.length >= LIMITE_FICHIERS) return
    let entrees
    try {
      entrees = await readdir(ici, { withFileTypes: true })
    } catch {
      return
    }
    entrees.sort((a, b) => a.name.localeCompare(b.name))
    for (const e of entrees) {
      if (trouves.length >= LIMITE_FICHIERS) return
      const chemin = join(ici, e.name)
      if (e.isDirectory()) {
        if (!DOSSIERS_IGNORES.includes(e.name)) await parcourir(chemin)
      } else if (e.isFile()) {
        trouves.push(relative(dossier, chemin))
      }
    }
  }
  await parcourir(dossier)
  return trouves
}

type Lecture = { texte: string } | { erreur: string }

export function brancherFichiers(coeur: Coeur, fenetre: () => BrowserWindow | null): void {
  const lire = async (chemin: string): Promise<Lecture> => {
    try {
      const r = await coeur.requetes!.requete<{ text: string }>('file.read', { path: chemin })
      return { texte: r.text }
    } catch (e) {
      const kind = (e as { kind?: string }).kind
      if (kind === 'not_text') return { erreur: "Ce fichier n'est pas du texte." }
      return { erreur: `Lecture impossible : ${(e as Error).message}` }
    }
  }

  ipcMain.handle('berger:lister', (_e, { dossier }) => listerFichiers(dossier))
  ipcMain.handle('berger:lire', (_e, { chemin }) => lire(chemin))
  ipcMain.handle('berger:ecrire', async (_e, { chemin, texte, texteCharge }) => {
    const actuel = await lire(chemin)
    if ('texte' in actuel && actuel.texte !== texteCharge) {
      const w = fenetre()
      console.log('[berger] le fichier a changé sur le disque : question posée')
      const options = {
        type: 'warning' as const,
        message: 'Le fichier a changé sur le disque depuis son ouverture. Enregistrer quand même ?',
        buttons: ['Enregistrer', 'Annuler'],
        defaultId: 1,
        cancelId: 1
      }
      const { response } = w ? await dialog.showMessageBox(w, options) : await dialog.showMessageBox(options)
      if (response !== 0) return { annule: true }
    }
    try {
      await coeur.requetes!.requete('file.write', { path: chemin, data: Buffer.from(texte, 'utf8').toString('base64') })
      return { ok: true }
    } catch (e) {
      return { erreur: `Enregistrement impossible : ${(e as Error).message}` }
    }
  })
}
