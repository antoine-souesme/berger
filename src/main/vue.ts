import { homedir } from 'os'
import type { Coeur } from './coeur'
import { etatGit } from './git'
import { construireVue, VUE_VIDE, type TerminalCore, type Vue } from '../shared/spaces'
import { appliquerEvenement, evenementNeuf, type EvenementCore } from '../shared/terminaux'

// Suit les terminaux (événements du core) et le document `herdr-app`
// (spaces), et rend la vue à afficher à chaque changement.
export function suivreLaVue(
  coeur: Coeur,
  envoyer: (vue: Vue) => void,
  surDoc: (doc: unknown) => void = () => {}
): () => Vue {
  const table = new Map<string, TerminalCore>()
  let doc: unknown = null
  let derniere: Vue = VUE_VIDE

  // État git (branche, commits à pousser) de chaque dossier de space, relu au
  // plus toutes les 5 s.
  type Git = { branche?: string; aPousser: number }
  const gits = new Map<string, { git: Git; lue: number; enCours: boolean }>()
  const gitDuDossier = (dossier: string): Git => {
    if (!dossier) return { aPousser: 0 }
    const connue = gits.get(dossier)
    if (!connue || (!connue.enCours && Date.now() - connue.lue > 5000)) {
      const entree = { git: connue?.git ?? { aPousser: 0 }, lue: Date.now(), enCours: true }
      gits.set(dossier, entree)
      void etatGit(dossier).then((git) => {
        entree.enCours = false
        entree.lue = Date.now()
        if (git.branche !== entree.git.branche || git.aPousser !== entree.git.aPousser) {
          entree.git = git
          publier()
        }
      })
    }
    return gits.get(dossier)!.git
  }

  const publier = (): void => {
    const vue = construireVue(doc, [...table.values()], homedir())
    for (const space of vue.spaces) {
      const git = gitDuDossier(space.dossier)
      space.branche = git.branche
      space.aPousser = git.aPousser
    }
    derniere = vue
    envoyer(derniere)
  }

  const relireDoc = async (): Promise<void> => {
    try {
      const r = await coeur.requetes!.requete<{ value: unknown }>('doc.get', { name: 'herdr-app' })
      doc = r.value
      surDoc(doc)
    } catch (e) {
      console.error('[berger] lecture de herdr-app impossible :', (e as Error).message)
    }
  }

  const remplacer = (terminaux: TerminalCore[]): void => {
    table.clear()
    for (const t of terminaux) table.set(t.address, t)
  }

  // Dernier numéro d'événement couvert (instantané ou événement appliqué).
  let dernierSeq: number | null = null

  coeur.surConnexion(async (c) => {
    dernierSeq = null
    c.evenements!.surNotification((methode, params) => {
      if (methode === 'event') {
        const e = params as unknown as EvenementCore
        if (!evenementNeuf(dernierSeq, e.seq)) return
        if (typeof e.seq === 'number') dernierSeq = e.seq
        if (e.type === 'doc') {
          void relireDoc().then(publier)
          return
        }
        appliquerEvenement(table, e)
        publier()
        if (process.env['BERGER_TRACE'] && e.type === 'status') {
          const t = [...derniere.spaces.flatMap((s) => s.terminaux), ...derniere.autres].find(
            (v) => v.adresse === e.terminal
          )
          console.log(`[berger] état de ${t?.libelle ?? e.terminal} : « ${t?.etat ?? ''} »`)
        }
      } else if (params?.['terminals']) {
        const instantane = params as { terminals: TerminalCore[]; seq?: number }
        // `missed` : on a pris du retard, le core renvoie un instantané complet ;
        // les événements dont le seq n'est pas au-dessus du sien sont à ignorer.
        remplacer(instantane.terminals)
        if (typeof instantane.seq === 'number') dernierSeq = instantane.seq
        void relireDoc().then(publier)
      }
    })
    const r = await c.evenements!.requete<{ terminals: TerminalCore[]; seq?: number }>(
      'events.subscribe',
      {}
    )
    remplacer(r.terminals)
    if (typeof r.seq === 'number') dernierSeq = r.seq
    await relireDoc()
    publier()
  })

  return () => derniere
}
