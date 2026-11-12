import { dialog, ipcMain, type BrowserWindow } from 'electron'
import { readdir } from 'fs/promises'
import { join, relative } from 'path'
import type { Coeur } from './coeur'
import { DOSSIERS_IGNORES, LIMITE_FICHIERS } from '../shared/fichiers'
import { lireFichier, type Lecture } from './lecture'

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

export function brancherFichiers(coeur: Coeur, fenetre: () => BrowserWindow | null): void {
  const lire = (chemin: string): Promise<Lecture> => {
    if (!coeur.requetes) return Promise.resolve({ erreur: 'Déconnecté de herdr-core.' })
    return lireFichier((m, p) => coeur.requetes!.requete(m, p), chemin)
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
      const { response } = w
        ? await dialog.showMessageBox(w, options)
        : await dialog.showMessageBox(options)
      if (response !== 0) return { annule: true }
    }
    if (!coeur.requetes) return { erreur: 'Déconnecté de herdr-core.' }
    try {
      await coeur.requetes.requete('file.write', {
        path: chemin,
        data: Buffer.from(texte, 'utf8').toString('base64')
      })
      return { ok: true }
    } catch (e) {
      return { erreur: `Enregistrement impossible : ${(e as Error).message}` }
    }
  })
}
