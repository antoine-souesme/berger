import type { Coeur } from './coeur'
import { construireVue, VUE_VIDE, type TerminalCore, type Vue } from '../shared/spaces'
import { appliquerEvenement, type EvenementCore } from '../shared/terminaux'

// Suit les terminaux (événements du core) et le document `herdr-app`
// (spaces), et rend la vue à afficher à chaque changement.
export function suivreLaVue(coeur: Coeur, envoyer: (vue: Vue) => void): () => Vue {
  const table = new Map<string, TerminalCore>()
  let doc: unknown = null
  let derniere: Vue = VUE_VIDE

  const publier = (): void => {
    derniere = construireVue(doc, [...table.values()])
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

  coeur.surConnexion(async (c) => {
    c.evenements!.surNotification((methode, params) => {
      if (methode === 'event') {
        const e = params as EvenementCore
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
      } else if (params?.terminals) {
        // `missed` : on a pris du retard, le core renvoie un instantané complet.
        remplacer(params.terminals)
        void relireDoc().then(publier)
      }
    })
    const r = await c.evenements!.requete<{ terminals: TerminalCore[] }>('events.subscribe', {})
    remplacer(r.terminals)
    await relireDoc()
    publier()
  })

  return () => derniere
}
