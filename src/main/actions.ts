import { dialog, ipcMain, type BrowserWindow } from 'electron'
import type { Coeur } from './coeur'
import { ecrireDoc } from './ecriture'
import { idHerdr, type Action } from '../shared/document'
import type { Sens } from '../shared/arbre'

export type DemandeStructure =
  | { type: 'onglet.nouveau'; space: string; dossier: string }
  | {
      type: 'panneau.diviser'
      space: string
      onglet: string
      panneau: string
      sens: Sens
      dossier: string
    }
  | { type: 'onglet.fermer'; space: string; onglet: string; terminaux: string[]; dernier: boolean }
  | { type: 'panneau.fermer'; space: string; onglet: string; panneau: string; terminal?: string }
  | Extract<
      Action,
      { type: 'onglet.renommer' | 'space.renommer' | 'panneau.echanger' | 'panneau.poids' }
    >

export type ReponseStructure = { ok: true; panneau?: string; onglet?: string } | { erreur: string }

const trace = (texte: string): void => {
  if (process.env['BERGER_TRACE']) console.log(`[berger] ${texte}`)
}

// Les actions de structure demandées par la fenêtre : créer, renommer,
// découper, échanger, fermer. Berger fait le travail des commandes de Herdr
// lui-même : il lance les terminaux et écrit le document `herdr-app`.
export function brancherActions(coeur: Coeur, fenetre: () => BrowserWindow | null): void {
  const requete = (methode: string, params: object): Promise<unknown> => {
    if (!coeur.requetes) return Promise.reject(new Error('Déconnecté de herdr-core.'))
    return coeur.requetes.requete(methode, params)
  }

  // Un terminal neuf, rangé par ses étiquettes dans le space et l'onglet.
  const lancer = async (space: string, onglet: string, dossier: string): Promise<string> => {
    const r = (await requete('terminal.run', {
      argv: [],
      ...(dossier ? { cwd: dossier } : {}),
      keep: true,
      no_parent: true,
      die_with_parent: false,
      labels: { 'herdr.space': space, 'herdr.tab': onglet }
    })) as { address: string }
    trace(`terminal lancé ${r.address} (${space}/${onglet})`)
    return r.address
  }

  const tuer = async (adresse: string): Promise<void> => {
    try {
      await requete('terminal.kill', { terminal: adresse })
      trace(`terminal fermé ${adresse}`)
    } catch (e) {
      console.error(`[berger] fermeture de ${adresse} impossible :`, (e as Error).message)
    }
  }

  // Écrit le document ; si l'écriture échoue pour de bon, le terminal créé
  // pour l'occasion est fermé, pour ne pas laisser un terminal sans place.
  const ecrireAvecTerminal = async (action: Action, adresse: string): Promise<void> => {
    try {
      await ecrireDoc(requete, action)
    } catch (e) {
      await tuer(adresse)
      throw e
    }
  }

  const traiter = async (d: DemandeStructure): Promise<ReponseStructure> => {
    switch (d.type) {
      case 'onglet.nouveau': {
        const onglet = idHerdr('tb')
        const panneau = idHerdr('p')
        const adresse = await lancer(d.space, onglet, d.dossier)
        await ecrireAvecTerminal(
          { type: 'onglet.nouveau', space: d.space, onglet, panneau, adresse },
          adresse
        )
        return { ok: true, onglet, panneau }
      }
      case 'panneau.diviser': {
        const nouveau = idHerdr('p')
        const adresse = await lancer(d.space, d.onglet, d.dossier)
        await ecrireAvecTerminal(
          {
            type: 'panneau.diviser',
            space: d.space,
            onglet: d.onglet,
            panneau: d.panneau,
            sens: d.sens,
            nouveau,
            conteneur: idHerdr('s'),
            adresse
          },
          adresse
        )
        return { ok: true, onglet: d.onglet, panneau: nouveau }
      }
      case 'onglet.fermer':
        await ecrireDoc(requete, { type: 'onglet.fermer', space: d.space, onglet: d.onglet })
        for (const adresse of d.terminaux) await tuer(adresse)
        return { ok: true }
      case 'panneau.fermer':
        await ecrireDoc(requete, {
          type: 'panneau.fermer',
          space: d.space,
          onglet: d.onglet,
          panneau: d.panneau
        })
        if (d.terminal) await tuer(d.terminal)
        return { ok: true }
      default:
        await ecrireDoc(requete, d)
        return { ok: true }
    }
  }

  ipcMain.handle('berger:structure', async (_e, d: DemandeStructure) => {
    try {
      return await traiter(d)
    } catch (e) {
      console.error(`[berger] ${d.type} impossible :`, (e as Error).message)
      return { erreur: (e as Error).message }
    }
  })

  ipcMain.handle('berger:clics-droits', async (_e, { adresse, auProgramme }) => {
    try {
      await requete('terminal.label', {
        terminal: adresse,
        labels: { 'herdr.right-click': auProgramme ? 'program' : '' }
      })
      return { ok: true }
    } catch (e) {
      return { erreur: (e as Error).message }
    }
  })

  // Une question native posée sur la fenêtre ; rend l'index du bouton choisi.
  ipcMain.handle('berger:question', async (_e, q) => {
    const options = {
      type: 'warning' as const,
      message: q.message,
      detail: q.detail,
      buttons: q.boutons,
      defaultId: q.defaut,
      cancelId: q.annuler
    }
    trace(`question posée : ${q.message}`)
    const w = fenetre()
    const { response } = w
      ? await dialog.showMessageBox(w, options)
      : await dialog.showMessageBox(options)
    return response
  })
}
