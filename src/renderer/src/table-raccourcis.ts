// La table des raccourcis en cours (touches d'origine et touches personnelles
// des réglages) et la disposition du clavier, partagées par l'écouteur du
// clavier, les terminaux et les réglages.
import { tableRaccourcis, type Disposition, type TableRaccourcis } from '../../shared/raccourcis'

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

type Clavier = { getLayoutMap(): Promise<Disposition> }
const clavier = (navigator as Navigator & { keyboard?: Clavier }).keyboard
let disposition: Disposition | undefined

export function dispositionActuelle(): Disposition | undefined {
  return disposition
}

// Lue au démarrage, puis à chaque retour dans la fenêtre (la disposition a pu
// changer entre-temps ; Chromium ne prévient pas).
async function lireDisposition(): Promise<void> {
  if (window.berger.scenario) return
  try {
    disposition = await clavier?.getLayoutMap()
  } catch {
    disposition = undefined
  }
}
void lireDisposition()
window.addEventListener('focus', () => void lireDisposition())
