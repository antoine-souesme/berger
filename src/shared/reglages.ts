// Règles pures des réglages de Berger (`reglages.json` du dossier de données,
// écrit par la fenêtre des réglages et modifiable à la main). Une valeur
// absente ou invalide prend sa valeur par défaut ; les autres sont gardées.
import type { ThemeConnu } from './themes'

export type Reglages = {
  apparence: {
    themeApplication: string
    themeEditeur: string
    policeInterface: string
    taillePoliceInterface: number
  }
  editeur: {
    couleurSelection: string | null // null : celle du thème de l'éditeur
    police: string
    taille: number
    retourLigne: boolean
    minicarte: boolean
    tabulations: number
  }
  terminal: { police: string; taille: number }
  // Sons des agents ; `fini` et `attente` : un fichier son à la place de celui
  // de macOS (null : celui de macOS).
  sons: { actifs: boolean; fini: string | null; attente: string | null }
  raccourcis: Record<string, string[]> // id de commande → touches ('cmd-shift-d'), [] = aucun
}

// Ce que la partie Node pousse à la fenêtre : réglages valides, thèmes connus,
// erreur du fichier (null s'il est bien formé), chemins.
export type EtatReglages = {
  reglages: Reglages
  themes: ThemeConnu[]
  erreur: string | null
  chemin: string
  dossierThemes: string
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
  apparence: {
    themeApplication: 'antoine-monokai',
    themeEditeur: 'antoine-monokai',
    policeInterface: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
    taillePoliceInterface: 13
  },
  editeur: {
    couleurSelection: null,
    police: "'Fira Code', Menlo, monospace",
    taille: 13,
    retourLigne: false,
    minicarte: true,
    tabulations: 2
  },
  terminal: { police: "'IBM Plex Mono', Menlo, monospace", taille: 12 },
  sons: { actifs: true, fini: null, attente: null },
  raccourcis: {}
}

const objet = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {}

const COULEUR = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

const texte = (x: unknown, d: string): string => (typeof x === 'string' && x.trim() ? x : d)
const booleen = (x: unknown, d: boolean): boolean => (typeof x === 'boolean' ? x : d)
const entier = (x: unknown, min: number, max: number, d: number): number =>
  typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : d

function raccourcis(x: unknown): Record<string, string[]> {
  const r: Record<string, string[]> = {}
  for (const [id, v] of Object.entries(objet(x))) {
    if (typeof v === 'string') r[id] = [v]
    else if (Array.isArray(v) && v.every((t) => typeof t === 'string')) r[id] = [...v]
  }
  return r
}

export function lireReglages(brut: unknown): Reglages {
  const o = objet(brut)
  const a = objet(o['apparence'])
  const e = objet(o['editeur'])
  const t = objet(o['terminal'])
  const s = objet(o['sons'])
  const fichier = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x : null)
  const d = REGLAGES_PAR_DEFAUT
  const sel = e['couleurSelection']
  return {
    apparence: {
      themeApplication: texte(a['themeApplication'], d.apparence.themeApplication),
      themeEditeur: texte(a['themeEditeur'], d.apparence.themeEditeur),
      policeInterface: texte(a['policeInterface'], d.apparence.policeInterface),
      taillePoliceInterface: entier(
        a['taillePoliceInterface'],
        8,
        32,
        d.apparence.taillePoliceInterface
      )
    },
    editeur: {
      couleurSelection: typeof sel === 'string' && COULEUR.test(sel) ? sel : null,
      police: texte(e['police'], d.editeur.police),
      taille: entier(e['taille'], 8, 32, d.editeur.taille),
      retourLigne: booleen(e['retourLigne'], d.editeur.retourLigne),
      minicarte: booleen(e['minicarte'], d.editeur.minicarte),
      tabulations: entier(e['tabulations'], 1, 8, d.editeur.tabulations)
    },
    terminal: {
      police: texte(t['police'], d.terminal.police),
      taille: entier(t['taille'], 8, 32, d.terminal.taille)
    },
    sons: {
      actifs: booleen(s['actifs'], d.sons.actifs),
      fini: fichier(s['fini']),
      attente: fichier(s['attente'])
    },
    raccourcis: raccourcis(o['raccourcis'])
  }
}

// Le texte du fichier avec une clé changée (`undefined` la retire), les autres
// clés gardées, même inconnues. `null` si le texte n'est pas un objet JSON : on
// n'écrase pas ce qu'Antoine est en train d'écrire.
export function modifierReglage(
  texteFichier: string,
  chemin: string[],
  valeur: unknown
): string | null {
  let racine: unknown = {}
  if (texteFichier.trim()) {
    try {
      racine = JSON.parse(texteFichier)
    } catch {
      return null
    }
  }
  if (!racine || typeof racine !== 'object' || Array.isArray(racine)) return null
  let o = racine as Record<string, unknown>
  for (const cle of chemin.slice(0, -1)) {
    const suivant = o[cle]
    if (!suivant || typeof suivant !== 'object' || Array.isArray(suivant)) o[cle] = {}
    o = o[cle] as Record<string, unknown>
  }
  const derniere = chemin[chemin.length - 1]
  if (valeur === undefined) delete o[derniere]
  else o[derniere] = valeur
  return JSON.stringify(racine, null, 2) + '\n'
}
