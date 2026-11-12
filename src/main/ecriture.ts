import { appliquer, type Action } from '../shared/document'

export type Requete = (methode: string, params: object) => Promise<unknown>

const NOM = 'herdr-app'

// Écrit une action dans le document `herdr-app` sans jamais écraser une
// version non lue : on part de la dernière version lue, et en cas de conflit
// (Herdr a écrit entre-temps) on relit et on réapplique.
export async function ecrireDoc(
  requete: Requete,
  action: Action,
  essais = 5
): Promise<'ecrit' | 'inchange'> {
  let derniere: unknown = null
  for (let i = 0; i < essais; i++) {
    const lu = (await requete('doc.get', { name: NOM })) as { value: unknown; version: number }
    const nouveau = appliquer(lu.value, action)
    if (nouveau === lu.value) return 'inchange'
    try {
      await requete('doc.set', { name: NOM, value: nouveau, version: lu.version })
      if (process.env['BERGER_TRACE']) console.log(`[berger] doc.set ${action.type}`)
      return 'ecrit'
    } catch (e) {
      if ((e as { kind?: string }).kind !== 'conflict') throw e
      derniere = e
    }
  }
  throw new Error(
    `Écriture du document impossible après ${essais} conflits (${(derniere as Error)?.message})`
  )
}
