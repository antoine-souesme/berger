import { dialog, ipcMain, type BrowserWindow } from 'electron'
import { homedir } from 'os'
import type { Coeur } from './coeur'
import { ecrireDoc } from './ecriture'
import { appliquer, idHerdr, placeDe, terminauxRetires, type Action } from '../shared/document'
import type { Sens } from '../shared/arbre'

export type DemandeStructure =
  | { type: 'space.nouveau' }
  | { type: 'space.fermer'; space: string }
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

export type ReponseStructure =
  { ok: true; panneau?: string; onglet?: string; space?: string } | { erreur: string }

const trace = (texte: string): void => {
  if (process.env['BERGER_TRACE']) console.log(`[berger] ${texte}`)
}

// Les actions de structure demandées par la fenêtre : créer, renommer,
// découper, échanger, fermer. Berger fait le travail des commandes de Herdr
// lui-même : il lance les terminaux et écrit le document `herdr-app`.
export function brancherActions(
  coeur: Coeur,
  fenetre: () => BrowserWindow | null
): { fermerSpaces: (ids: string[]) => Promise<void> } {
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

  const lireDoc = async (): Promise<unknown> =>
    ((await requete('doc.get', { name: 'herdr-app' })) as { value: unknown }).value

  // Écrit le document puis rend la place réelle du terminal créé (Herdr a pu
  // le ranger lui-même avant nous). Sans place, ou si l'écriture échoue pour
  // de bon, le terminal est fermé : jamais de terminal sans place.
  const ecrireEtPlacer = async (
    action: Action,
    adresse: string
  ): Promise<{ space: string; onglet: string; panneau: string }> => {
    try {
      await ecrireDoc(requete, action)
      const place = placeDe(await lireDoc(), adresse)
      if (!place) throw new Error("le terminal n'a pas trouvé sa place (onglet ou panneau disparu)")
      return place
    } catch (e) {
      await tuer(adresse)
      throw e
    }
  }

  // Fermer : on tue d'abord les terminaux que l'action retire vraiment du
  // document tel qu'il est maintenant (pas ceux que Herdr aurait déplacés),
  // pour que Herdr ne les réadopte pas entre l'écriture et la fin ; puis on
  // écrit (Herdr a pu fermer leurs panneaux entre-temps : rien à écrire alors).
  const fermer = async (action: Action, demandes: string[]): Promise<void> => {
    const doc = await lireDoc()
    const retires = new Set(terminauxRetires(doc, appliquer(doc, action)))
    for (const adresse of demandes) if (retires.has(adresse)) await tuer(adresse)
    await ecrireDoc(requete, action)
  }

  // Les spaces créés par ce lancement de Berger (seuls fermables pendant un scénario).
  const crees = new Set<string>()

  // Fermer des spaces (suppression d'un workspace) : pour chacun, les terminaux
  // que sa fermeture retire vraiment, tués avant l'écriture, comme `fermer`.
  const fermerSpaces = async (ids: string[]): Promise<void> => {
    for (const space of ids) {
      if (
        process.env['BERGER_SCENARIO'] &&
        !crees.has(space) &&
        !space.startsWith('spbergertest')
      ) {
        console.log(`[berger] fermeture refusée : ${space} (scénario)`)
        continue
      }
      try {
        const action: Action = { type: 'space.fermer', space }
        const doc = await lireDoc()
        for (const adresse of terminauxRetires(doc, appliquer(doc, action))) await tuer(adresse)
        await ecrireDoc(requete, action)
        trace(`space fermé ${space}`)
      } catch (e) {
        console.error(`[berger] fermeture du space ${space} impossible :`, (e as Error).message)
      }
    }
  }

  const traiter = async (d: DemandeStructure): Promise<ReponseStructure> => {
    switch (d.type) {
      case 'space.nouveau': {
        // Un terminal shell dans le dossier personnel, comme Herdr.
        const space = idHerdr('sp')
        const onglet = idHerdr('tb')
        crees.add(space)
        const adresse = await lancer(space, onglet, homedir())
        const place = await ecrireEtPlacer(
          { type: 'space.nouveau', space, onglet, panneau: idHerdr('p'), adresse },
          adresse
        )
        crees.add(place.space)
        return { ok: true, ...place }
      }
      case 'space.fermer':
        await fermerSpaces([d.space])
        return { ok: true }
      case 'onglet.nouveau': {
        const onglet = idHerdr('tb')
        const adresse = await lancer(d.space, onglet, d.dossier)
        const place = await ecrireEtPlacer(
          { type: 'onglet.nouveau', space: d.space, onglet, panneau: idHerdr('p'), adresse },
          adresse
        )
        return { ok: true, ...place }
      }
      case 'panneau.diviser': {
        const adresse = await lancer(d.space, d.onglet, d.dossier)
        const place = await ecrireEtPlacer(
          {
            type: 'panneau.diviser',
            space: d.space,
            onglet: d.onglet,
            panneau: d.panneau,
            sens: d.sens,
            nouveau: idHerdr('p'),
            conteneur: idHerdr('s'),
            adresse
          },
          adresse
        )
        return { ok: true, ...place }
      }
      case 'onglet.fermer':
        await fermer({ type: 'onglet.fermer', space: d.space, onglet: d.onglet }, d.terminaux)
        return { ok: true }
      case 'panneau.fermer':
        await fermer(
          { type: 'panneau.fermer', space: d.space, onglet: d.onglet, panneau: d.panneau },
          d.terminal ? [d.terminal] : []
        )
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
    // Scénarios (développement) : BERGER_SCENARIO_REPONSE=<n> répond le bouton n sans montrer la question.
    const reponse = process.env['BERGER_SCENARIO_REPONSE']
    if (process.env['BERGER_SCENARIO'] && reponse !== undefined) return Number(reponse)
    const w = fenetre()
    const { response } = w
      ? await dialog.showMessageBox(w, options)
      : await dialog.showMessageBox(options)
    return response
  })

  return { fermerSpaces }
}
