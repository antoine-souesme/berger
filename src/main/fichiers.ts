import { dialog, ipcMain, type BrowserWindow } from 'electron'
import { readdir } from 'fs/promises'
import { join, relative } from 'path'
import type { Coeur } from './coeur'
import { DOSSIERS_IGNORES, LIMITE_FICHIERS, type ListeFichiers } from '../shared/fichiers'
import { lireFichier, type Lecture } from './lecture'

// Liste plate des fichiers d'un dossier (Node local : le core n'a pas de
// méthode pour lister ; machine locale seulement en phase 0). Au-delà de
// `limite` fichiers, la liste est coupée et `tronquee` le dit.
export async function listerFichiers(
  dossier: string,
  limite = LIMITE_FICHIERS
): Promise<ListeFichiers> {
  if (!dossier) return { fichiers: [], tronquee: false }
  const trouves: string[] = []
  let tronquee = false
  const parcourir = async (ici: string): Promise<void> => {
    if (tronquee) return
    let entrees
    try {
      entrees = await readdir(ici, { withFileTypes: true })
    } catch {
      return
    }
    entrees.sort((a, b) => a.name.localeCompare(b.name))
    for (const e of entrees) {
      if (tronquee) return
      const chemin = join(ici, e.name)
      if (e.isDirectory()) {
        if (!DOSSIERS_IGNORES.includes(e.name)) await parcourir(chemin)
      } else if (e.isFile()) {
        if (trouves.length >= limite) {
          tronquee = true
          return
        }
        trouves.push(relative(dossier, chemin))
      }
    }
  }
  await parcourir(dossier)
  return { fichiers: trouves, tronquee }
}

export function brancherFichiers(coeur: Coeur, fenetre: () => BrowserWindow | null): void {
  const lire = (chemin: string): Promise<Lecture> => {
    if (!coeur.requetes) return Promise.resolve({ erreur: 'Déconnecté de herdr-core.' })
    return lireFichier((m, p) => coeur.requetes!.requete(m, p), chemin)
  }

  ipcMain.handle('berger:lister', (_e, { dossier }) => listerFichiers(dossier))
  ipcMain.handle('berger:lire', (_e, { chemin }) => lire(chemin))
  const confirmer = async (message: string): Promise<boolean> => {
    const w = fenetre()
    console.log(`[berger] question posée : ${message}`)
    const options = {
      type: 'warning' as const,
      message,
      buttons: ['Enregistrer', 'Annuler'],
      defaultId: 1,
      cancelId: 1
    }
    const { response } = w
      ? await dialog.showMessageBox(w, options)
      : await dialog.showMessageBox(options)
    return response === 0
  }

  ipcMain.handle('berger:ecrire', async (_e, { chemin, texte, texteCharge }) => {
    const actuel = await lire(chemin)
    if ('erreur' in actuel) {
      const ok = await confirmer(
        `Le fichier n'a pas pu être relu (${actuel.erreur}). Enregistrer quand même ?`
      )
      if (!ok) return { annule: true }
    } else if (actuel.texte !== texteCharge) {
      const ok = await confirmer(
        'Le fichier a changé sur le disque depuis son ouverture. Enregistrer quand même ?'
      )
      if (!ok) return { annule: true }
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
