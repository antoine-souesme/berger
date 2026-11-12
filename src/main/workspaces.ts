import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import {
  changerEmoji,
  creer,
  deplacer,
  deplacerSpace,
  lireEtatWorkspaces,
  ouvrir,
  rapprocher,
  renommer,
  reprendreDeHerdr,
  spaceVu,
  spacesDuDoc,
  supprimer,
  type EtatWorkspaces
} from '../shared/workspaces'

export type DemandeWorkspace =
  | { type: 'ouvrir'; id: string }
  | { type: 'creer'; nom: string; emoji: string }
  | { type: 'renommer'; id: string; nom: string }
  | { type: 'emoji'; id: string; emoji: string }
  | { type: 'supprimer'; id: string; spaces: string[] } // la liste annoncée par le dialogue
  | { type: 'deplacer'; id: string; index: number }
  | { type: 'space.deplacer'; space: string; index: number }
  | { type: 'space.vu'; space: string }
export type ReponseWorkspace = { etat: EtatWorkspaces; afficher: string | null }

const trace = (texte: string): void => {
  if (process.env['BERGER_TRACE']) console.log(`[berger] ${texte}`)
}

// Le fichier des workspaces de Berger, dans son dossier de données.
const fichier = (): string => join(app.getPath('userData'), 'workspaces.json')
// Les workspaces du mod `antoine` de Herdr : lus une seule fois, jamais écrits.
const PARTAGE_HERDR = join(homedir(), '.config', 'herdr-app', 'shared.json')

// Ce qu'il y a à reprendre : l'état de Berger, ou (premier lancement) la clé
// `antoine.workspaces` de Herdr, à rapprocher du premier document lu.
function lireAuDemarrage(): { etat: EtatWorkspaces | null; herdr: unknown } {
  if (existsSync(fichier())) {
    let brut: unknown
    try {
      brut = JSON.parse(readFileSync(fichier(), 'utf8'))
    } catch {
      brut = null
    }
    const etat = lireEtatWorkspaces(brut)
    if (etat) return { etat, herdr: undefined }
    try {
      renameSync(fichier(), fichier() + '.illisible')
      console.error('[berger] workspaces.json illisible, renommé en workspaces.json.illisible')
    } catch (e) {
      console.error('[berger] workspaces.json illisible :', (e as Error).message)
    }
  }
  let herdr: unknown
  try {
    const partage = JSON.parse(readFileSync(PARTAGE_HERDR, 'utf8')) as Record<string, unknown>
    herdr = partage?.['antoine.workspaces']
  } catch {
    herdr = undefined
  }
  trace(`premier lancement : workspaces de Herdr ${herdr === undefined ? 'absents' : 'lus'}`)
  return { etat: null, herdr }
}

export function brancherWorkspaces(o: {
  envoyer: (e: EtatWorkspaces) => void
  fermerSpaces: (ids: string[]) => Promise<void>
}): { rapprocher: (doc: unknown) => void; actuel: () => EtatWorkspaces | null; vider: () => void } {
  const depart = lireAuDemarrage()
  let etat = depart.etat
  let minuteur: NodeJS.Timeout | null = null
  let aEcrire = false

  const ecrireMaintenant = (): void => {
    if (minuteur) clearTimeout(minuteur)
    minuteur = null
    if (!aEcrire || !etat) return
    aEcrire = false
    try {
      mkdirSync(dirname(fichier()), { recursive: true })
      writeFileSync(fichier(), JSON.stringify(etat, null, 2))
    } catch (e) {
      console.error('[berger] workspaces non enregistrés :', (e as Error).message)
    }
  }

  // Au plus une écriture toutes les 300 ms.
  const changer = (nouveau: EtatWorkspaces, toutDeSuite = false): void => {
    if (nouveau === etat) return
    etat = nouveau
    aEcrire = true
    trace(
      `workspaces : ${nouveau.liste.map((w) => `${w.emoji} ${w.nom} (${w.spaces.length})`).join(', ')} ; ouvert ${nouveau.ouvert}`
    )
    o.envoyer(nouveau)
    if (toutDeSuite) ecrireMaintenant()
    else if (!minuteur) minuteur = setTimeout(ecrireMaintenant, 300)
  }

  const rapprocherDoc = (doc: unknown): void => {
    const spaces = spacesDuDoc(doc)
    if (!spaces) return
    if (!etat) {
      changer(reprendreDeHerdr(depart.herdr, spaces), true)
      return
    }
    changer(rapprocher(etat, spaces))
  }

  const traiter = (d: DemandeWorkspace): ReponseWorkspace => {
    if (!etat) throw new Error('workspaces pas encore lus')
    switch (d.type) {
      case 'ouvrir': {
        const r = ouvrir(etat, d.id)
        changer(r.etat)
        return { etat, afficher: r.afficher }
      }
      case 'creer':
        changer(creer(etat, d.nom, d.emoji))
        break
      case 'renommer':
        changer(renommer(etat, d.id, d.nom))
        break
      case 'emoji':
        changer(changerEmoji(etat, d.id, d.emoji))
        break
      case 'deplacer':
        changer(deplacer(etat, d.id, d.index))
        break
      case 'space.deplacer':
        changer(deplacerSpace(etat, d.space, d.index))
        break
      case 'space.vu':
        changer(spaceVu(etat, d.space))
        break
      case 'supprimer': {
        const r = supprimer(etat, d.id)
        // Jamais un space que le dialogue n'a pas annoncé.
        const annonces = new Set(d.spaces)
        const fermer = r.fermer.filter((s) => annonces.has(s))
        changer(r.etat, true)
        if (fermer.length)
          setImmediate(() => {
            trace(`fermeture des spaces ${fermer.join(', ')}`)
            o.fermerSpaces(fermer).catch((e) =>
              console.error('[berger] fermeture des spaces :', (e as Error).message)
            )
          })
        return { etat, afficher: r.afficher }
      }
    }
    return { etat, afficher: null }
  }

  ipcMain.handle('berger:workspace', (_e, d: DemandeWorkspace) => {
    try {
      return traiter(d)
    } catch (e) {
      console.error(`[berger] workspace ${d.type} impossible :`, (e as Error).message)
      return { erreur: (e as Error).message }
    }
  })

  return { rapprocher: rapprocherDoc, actuel: () => etat, vider: ecrireMaintenant }
}
