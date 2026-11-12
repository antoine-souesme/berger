// La table des raccourcis en cours (touches d'origine et touches personnelles
// des réglages), partagée par l'écouteur du clavier et les terminaux.
import { tableRaccourcis, type TableRaccourcis } from '../../shared/raccourcis'

let table: TableRaccourcis = tableRaccourcis({})
let dernier = '{}'

export function tableActuelle(): TableRaccourcis {
  return table
}

export function changerTable(perso: Record<string, string[]>): void {
  const texte = JSON.stringify(perso)
  if (texte === dernier) return
  dernier = texte
  table = tableRaccourcis(perso)
}
