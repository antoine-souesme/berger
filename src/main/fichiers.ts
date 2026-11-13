import { clipboard, dialog, ipcMain, shell, type BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import { mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import type { Coeur } from './coeur'
import { lireFichier, type Lecture } from './lecture'
import type { FichierRacine } from '../shared/recherche'
import {
  coller,
  creer,
  fichiersSeuls,
  listerDossier,
  lireImage,
  nomsPris,
  renommer,
  statutGit,
  surveiller,
  tousLesFichiers,
  transferer
} from './disque'
import { envoyerA } from './envoi'
import { texteAuCommit } from './git'

// Presse-papiers de macOS par JavaScript for Automation (des URL de fichiers,
// comme le Finder) : repris de `explorer.js` du mod `antoine`.
const CLIP_WRITE =
  'function run(a){ObjC.import("AppKit");const pb=$.NSPasteboard.generalPasteboard;pb.clearContents;const l=$.NSMutableArray.array;a.forEach(p=>l.addObject($.NSURL.fileURLWithPath(p)));return pb.writeObjects(l)?"ok":"";}'
const CLIP_READ =
  'ObjC.import("AppKit");const it=$.NSPasteboard.generalPasteboard.pasteboardItems;const o=[];for(let i=0;i<it.count;i++){const s=it.objectAtIndex(i).stringForType("public.file-url");if(!s.isNil())o.push(ObjC.unwrap($.NSURL.URLWithString(s).path));}o.join("\\n")'

function osascript(script: string, args: string[] = []): Promise<string> {
  return new Promise((rendre) => {
    const p = spawn('osascript', ['-l', 'JavaScript', '-e', script, ...args])
    let sortie = ''
    p.stdout.on('data', (d: Buffer) => (sortie += d.toString('utf8')))
    p.on('error', () => rendre(''))
    p.on('close', () => rendre(sortie.trim()))
  })
}

const trace = (texte: string): void => {
  if (process.env['BERGER_TRACE']) console.log(`[berger] ${texte}`)
}

// Le disque pour la fenêtre : listes, état git, surveillance, actions de
// l'explorateur, presse-papiers, Finder, VS Code.
function brancherDisque(fenetre: () => BrowserWindow | null): void {
  // La liste des fichiers de chaque racine pour ⌘P, vidée quand la racine change.
  const cache = new Map<string, Promise<string[]>>()
  const surveillees = new Map<string, () => void>()

  // Un fichier déposé sans chemin (la vignette d'une capture d'écran, par
  // exemple) : enregistré dans un dossier temporaire, dont le chemin revient.
  ipcMain.handle(
    'berger:enregistrer-depot',
    async (_e, { nom, octets }: { nom: string; octets: Uint8Array }) => {
      const dossier = await mkdtemp(join(tmpdir(), 'berger-depot-'))
      const chemin = join(dossier, basename(nom) || 'fichier')
      await writeFile(chemin, octets)
      trace(`dépôt enregistré : ${chemin}`)
      return chemin
    }
  )
  ipcMain.handle('berger:dossier', (_e, { dossier }) => listerDossier(dossier))
  ipcMain.handle('berger:git', (_e, { racine }) => statutGit(racine))
  ipcMain.handle('berger:texte-commit', (_e, { chemin }) => texteAuCommit(chemin))
  ipcMain.handle('berger:tous-fichiers', async (_e, { racines }: { racines: string[] }) =>
    Promise.all(
      racines.map(async (racine): Promise<FichierRacine[]> => {
        let liste = cache.get(racine)
        if (!liste) {
          liste = tousLesFichiers(racine)
          cache.set(racine, liste)
        }
        return (await liste).map((relatif) => ({ racine, relatif }))
      })
    )
  )
  ipcMain.on('berger:surveiller', (_e, { racines }: { racines: string[] }) => {
    const voulues = new Set(racines)
    for (const [r, arreter] of surveillees)
      if (!voulues.has(r)) {
        arreter()
        surveillees.delete(r)
        cache.delete(r)
      }
    for (const r of voulues)
      if (!surveillees.has(r)) {
        trace(`watching ${r}`)
        surveillees.set(
          r,
          surveiller(r, (chemins) => {
            if (chemins.some((c) => !c.includes('/.git/') && !c.endsWith('/.git'))) cache.delete(r)
            envoyerA(fenetre(), 'berger:disque', { chemins })
          })
        )
      }
  })
  ipcMain.handle('berger:noms-pris', (_e, { sources, cible }) => nomsPris(sources, cible))
  ipcMain.handle('berger:transferer', (_e, { sources, cible, copier, conflit }) =>
    transferer({ sources, cible, copier, conflit, corbeille: (c) => shell.trashItem(c) })
  )
  ipcMain.handle('berger:creer', (_e, { chemin, dossier }) => creer(chemin, dossier))
  ipcMain.handle('berger:renommer-fichier', (_e, { ancien, nouveau }) => renommer(ancien, nouveau))
  ipcMain.handle('berger:corbeille', async (_e, { chemins }: { chemins: string[] }) => {
    const erreurs: string[] = []
    for (const c of chemins) {
      try {
        await shell.trashItem(c)
        trace(`moved to trash: ${c}`)
      } catch (e) {
        erreurs.push(`${c.slice(c.lastIndexOf('/') + 1)} : ${(e as Error).message}`)
      }
    }
    return { erreurs }
  })
  ipcMain.handle('berger:copier-fichiers', async (_e, { chemins }: { chemins: string[] }) => ({
    ok: (await osascript(CLIP_WRITE, chemins)) === 'ok'
  }))
  ipcMain.handle('berger:coller', async (_e, { cible }: { cible: string }) => {
    const chemins = (await osascript(CLIP_READ)).split('\n').filter((p) => p.startsWith('/'))
    if (!chemins.length)
      return { faits: [], erreurs: ['Le presse-papiers ne contient aucun fichier.'] }
    return coller(chemins, cible)
  })
  ipcMain.handle('berger:copier-chemin', (_e, { chemin }) => clipboard.writeText(chemin))
  ipcMain.handle('berger:finder', (_e, { chemin }) => shell.showItemInFolder(chemin))
  ipcMain.handle('berger:vscode', (_e, { chemin }) => {
    const p = spawn('open', ['-a', 'Visual Studio Code', chemin])
    p.on('error', () => {})
  })
  ipcMain.handle('berger:choisir-dossier', async () => {
    const w = fenetre()
    const options = { properties: ['openDirectory' as const, 'createDirectory' as const] }
    const r = w ? await dialog.showOpenDialog(w, options) : await dialog.showOpenDialog(options)
    return r.canceled ? null : (r.filePaths[0] ?? null)
  })
  ipcMain.handle('berger:fichiers-seuls', (_e, { chemins }) => fichiersSeuls(chemins))
  ipcMain.handle('berger:image', (_e, { chemin }) => lireImage(chemin))
}

export function brancherFichiers(coeur: Coeur, fenetre: () => BrowserWindow | null): void {
  const lire = (chemin: string): Promise<Lecture> => {
    if (!coeur.requetes) return Promise.resolve({ erreur: 'Déconnecté de herdr-core.' })
    return lireFichier((m, p) => coeur.requetes!.requete(m, p), chemin)
  }

  brancherDisque(fenetre)
  ipcMain.handle('berger:lire', (_e, { chemin }) => lire(chemin))
  const confirmer = async (message: string): Promise<boolean> => {
    const w = fenetre()
    console.log(`[berger] question asked: ${message}`)
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
        `Le fichier n'a pas pu être relu (${actuel.erreur.replace(/\.$/, '')}). Enregistrer quand même ?`
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
