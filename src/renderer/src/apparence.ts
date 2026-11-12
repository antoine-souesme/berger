// Applique les réglages et les thèmes à la fenêtre, aux terminaux et à
// l'éditeur, au démarrage puis à chaque changement de `reglages.json` ou du
// dossier des thèmes (poussée `berger:reglages`), sans relancer.
import type { EtatReglages } from '../../shared/reglages'
import { couleursFenetre, couleursTerminal, estClair, type ThemeConnu } from '../../shared/themes'
import { THEME_PAR_DEFAUT } from '../../shared/themes-fournis'
import { appliquerTerminal } from './terminal'
import { changerTable } from './table-raccourcis'

let actuel: EtatReglages | null = null
const ecouteurs: ((e: EtatReglages) => void)[] = []

const VARIABLES: [keyof ReturnType<typeof couleursFenetre>, string][] = [
  ['fond', '--fond'],
  ['panneau', '--panneau'],
  ['bord', '--bord'],
  ['texte', '--texte'],
  ['vif', '--vif'],
  ['gris', '--gris'],
  ['grisClair', '--gris-clair'],
  ['actif', '--actif'],
  ['survol', '--survol'],
  ['popover', '--popover'],
  ['clavier', '--clavier'],
  ['vert', '--vert'],
  ['rouge', '--rouge'],
  ['jaune', '--jaune']
]

// Un thème connu par son id (inconnu : antoine-monokai).
export function themeConnu(e: EtatReglages, id: string): ThemeConnu {
  return e.themes.find((t) => t.id === id) ?? e.themes.find((t) => t.id === THEME_PAR_DEFAUT)!
}

function appliquer(e: EtatReglages): void {
  const r = e.reglages
  const app = themeConnu(e, r.apparence.themeApplication).theme
  const racine = document.documentElement
  const c = couleursFenetre(app)
  for (const [cle, variable] of VARIABLES) racine.style.setProperty(variable, c[cle])
  racine.style.setProperty('--police-interface', r.apparence.policeInterface)
  racine.style.setProperty('--taille-interface', `${r.apparence.taillePoliceInterface}px`)
  // Barres de défilement et contrôles du système dans le bon sens.
  racine.style.colorScheme = estClair(app.background) ? 'light' : 'dark'
  appliquerTerminal(couleursTerminal(app), r.terminal.police, r.terminal.taille)
  changerTable(r.raccourcis)
  for (const f of ecouteurs) f(e)
}

export async function initApparence(): Promise<void> {
  window.berger.ecouter('berger:reglages', (e: EtatReglages) => {
    actuel = e
    appliquer(e)
  })
  const e = await window.berger.demander<EtatReglages>('berger:reglages')
  if (!actuel) {
    actuel = e
    appliquer(e)
  }
}

// null tant que la partie Node n'a pas répondu.
export function reglagesActuels(): EtatReglages | null {
  return actuel
}

// Appelé tout de suite si les réglages sont déjà là, puis à chaque changement.
export function surReglages(f: (e: EtatReglages) => void): void {
  ecouteurs.push(f)
  if (actuel) f(actuel)
}

// Change une clé de `reglages.json` (la fenêtre des réglages).
export function modifierReglage(
  chemin: string[],
  valeur: unknown
): Promise<{ ok: true } | { ok: false; message: string }> {
  return window.berger.demander('berger:modifier-reglage', { chemin, valeur })
}
