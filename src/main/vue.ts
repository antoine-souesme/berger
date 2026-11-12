import { homedir } from 'os'
import type { Coeur } from './coeur'
import { brancheDe } from './git'
import { construireVue, VUE_VIDE, type TerminalCore, type Vue } from '../shared/spaces'
import { appliquerEvenement, evenementNeuf, type EvenementCore } from '../shared/terminaux'

// Suit les terminaux (événements du core) et le document `herdr-app`
// (spaces), et rend la vue à afficher à chaque changement.
export function suivreLaVue(coeur: Coeur, envoyer: (vue: Vue) => void): () => Vue {
  const table = new Map<string, TerminalCore>()
  let doc: unknown = null
  let derniere: Vue = VUE_VIDE

  // Branche git de chaque dossier de space, relue au plus toutes les 5 s.
  const branches = new Map<string, { branche?: string; lue: number; enCours: boolean }>()
  const brancheDuDossier = (dossier: string): string | undefined => {
    if (!dossier) return undefined
    const connue = branches.get(dossier)
    if (!connue || (!connue.enCours && Date.now() - connue.lue > 5000)) {
      const entree = { branche: connue?.branche, lue: Date.now(), enCours: true }
      branches.set(dossier, entree)
      void brancheDe(dossier).then((branche) => {
        entree.enCours = false
        entree.lue = Date.now()
        if (branche !== entree.branche) {
          entree.branche = branche
          publier()
        }
      })
    }
    return branches.get(dossier)!.branche
  }

  const publier = (): void => {
    const vue = construireVue(doc, [...table.values()], homedir())
    for (const space of vue.spaces) space.branche = brancheDuDossier(space.dossier)
    derniere = vue
    envoyer(derniere)
  }

  const relireDoc = async (): Promise<void> => {
    try {
      const r = await coeur.requetes!.requete<{ value: unknown }>('doc.get', { name: 'herdr-app' })
      doc = r.value
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
