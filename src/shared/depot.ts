// Les fichiers déposés sur un terminal : leurs chemins s'écrivent à la suite,
// échappés pour le shell comme le fait le Terminal de macOS, suivis d'une espace.

// Le type des chemins glissés depuis l'explorateur de Berger.
export const CHEMINS_GLISSES = 'application/x-berger-chemins'

const SPECIAUX = /[\s'"\\$`!&*()[\]{};|<>?#~^=,]/g

export function echapperChemin(chemin: string): string {
  return chemin.replace(SPECIAUX, (c) => `\\${c}`)
}

export function texteDepot(chemins: string[]): string {
  const liste = chemins.filter(Boolean)
  return liste.length ? liste.map(echapperChemin).join(' ') + ' ' : ''
}
