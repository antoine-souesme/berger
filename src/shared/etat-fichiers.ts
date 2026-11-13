// Règles pures de l'état des fichiers de chaque workspace : onglets épinglés
// et ouverts, fichiers récents, dossiers ajoutés à l'explorateur, ordre des
// racines, dossiers dépliés ; reprise depuis Herdr ; libellés des onglets.
// Repris et réécrits de `files.js` et `quickopen.js` (`remember`) du mod
// `antoine`. Toutes les fonctions rendent un nouvel
// objet quand quelque chose change, et le même sinon.

export type FichiersWorkspace = {
  epingles: string[]
  ouverts: string[]
  recents: string[] // le plus récent d'abord, 30 au plus
  dossiers: string[]
  ordreRacines: string[]
  deplies: string[] // dossiers dépliés sous les racines
  replies: string[] // racines repliées (une racine est dépliée par défaut)
}
export type EtatFichiers = Record<string, FichiersWorkspace>
export type OngletFichier = { chemin: string; epingle: boolean }

const MAX_RECENTS = 30
const CHAMPS = [
  'epingles',
  'ouverts',
  'recents',
  'dossiers',
  'ordreRacines',
  'deplies',
  'replies'
] as const

const vide = (): FichiersWorkspace => ({
  epingles: [],
  ouverts: [],
  recents: [],
  dossiers: [],
  ordreRacines: [],
  deplies: [],
  replies: []
})

const objet = (x: unknown): Record<string, unknown> | null =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null

const chaines = (x: unknown): string[] =>
  Array.isArray(x) ? [...new Set(x.filter((c): c is string => typeof c === 'string'))] : []

const memes = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

export function deWorkspace(e: EtatFichiers, ws: string): FichiersWorkspace {
  return e[ws] ?? vide()
}

// Change l'entrée d'un workspace ; rend `e` lui-même si rien n'a changé.
function modifier(
  e: EtatFichiers,
  ws: string,
  f: (w: FichiersWorkspace) => Partial<FichiersWorkspace>
): EtatFichiers {
  const avant = deWorkspace(e, ws)
  const apres = { ...avant, ...f(avant) }
  if (e[ws] && CHAMPS.every((c) => memes(avant[c], apres[c]))) return e
  return { ...e, [ws]: apres }
}

const sans = (liste: string[], x: string): string[] => liste.filter((p) => p !== x)

export function lireEtatFichiers(brut: unknown): EtatFichiers | null {
  const o = objet(brut)
  if (!o) return null
  const r: EtatFichiers = {}
  for (const [ws, v] of Object.entries(o)) {
    const w = objet(v)
    if (!w) continue
    r[ws] = vide()
    for (const c of CHAMPS) r[ws][c] = chaines(w[c])
  }
  return r
}

// L'objet entier de `~/.config/herdr-app/shared.json` : `antoine.folders`,
// `antoine.recent` et `antoine.files` (épinglés et ouverts ; le fichier
// affiché n'est pas repris).
export function reprendreFichiersDeHerdr(partage: unknown): EtatFichiers {
  const p = objet(partage)
  if (!p) return {}
  const dossiers = objet(p['antoine.folders']) ?? {}
  const recents = objet(p['antoine.recent']) ?? {}
  const fichiers = objet(p['antoine.files']) ?? {}
  const r: EtatFichiers = {}
  for (const ws of new Set([
    ...Object.keys(dossiers),
    ...Object.keys(recents),
    ...Object.keys(fichiers)
  ])) {
    const f = objet(fichiers[ws]) ?? {}
    const epingles = chaines(f['pinned'])
    r[ws] = {
      ...vide(),
      epingles,
      ouverts: chaines(f['open']).filter((c) => !epingles.includes(c)),
      recents: chaines(recents[ws]).slice(0, MAX_RECENTS),
      dossiers: chaines(dossiers[ws])
    }
  }
  return r
}

export function ongletsFichiers(e: EtatFichiers, ws: string): OngletFichier[] {
  const w = deWorkspace(e, ws)
  return [
    ...w.epingles.map((chemin) => ({ chemin, epingle: true })),
    ...w.ouverts.map((chemin) => ({ chemin, epingle: false }))
  ]
}

// Chaque fichier ouvert (s'il ne l'est pas déjà) va à la fin des ouverts et
// en tête des récents.
export function ouvrirFichiers(e: EtatFichiers, ws: string, chemins: string[]): EtatFichiers {
  return modifier(e, ws, (w) => {
    const ouverts = [...w.ouverts]
    let recents = w.recents
    for (const c of chemins) {
      if (!w.epingles.includes(c) && !ouverts.includes(c)) ouverts.push(c)
      recents = [c, ...sans(recents, c)].slice(0, MAX_RECENTS)
    }
    return { ouverts, recents }
  })
}

export function epingler(e: EtatFichiers, ws: string, chemin: string): EtatFichiers {
  return modifier(e, ws, (w) => ({
    epingles: w.epingles.includes(chemin) ? w.epingles : [...w.epingles, chemin],
    ouverts: sans(w.ouverts, chemin)
  }))
}

export function desepingler(e: EtatFichiers, ws: string, chemin: string): EtatFichiers {
  return modifier(e, ws, (w) =>
    w.epingles.includes(chemin)
      ? { epingles: sans(w.epingles, chemin), ouverts: [chemin, ...sans(w.ouverts, chemin)] }
      : {}
  )
}

// Un onglet de fichier tiré à la place `index` de la barre (comptée sans lui) :
// il reste dans son groupe, les épinglés devant, les ouverts derrière.
export function deplacerOnglet(
  e: EtatFichiers,
  ws: string,
  chemin: string,
  index: number
): EtatFichiers {
  const placer = (liste: string[], i: number): string[] => {
    const reste = sans(liste, chemin)
    const j = Math.max(0, Math.min(i, reste.length))
    return [...reste.slice(0, j), chemin, ...reste.slice(j)]
  }
  return modifier(e, ws, (w) =>
    w.epingles.includes(chemin)
      ? { epingles: placer(w.epingles, index) }
      : w.ouverts.includes(chemin)
        ? { ouverts: placer(w.ouverts, index - w.epingles.length) }
        : {}
  )
}

export function fermerFichierWs(e: EtatFichiers, ws: string, chemin: string): EtatFichiers {
  return modifier(e, ws, (w) => ({
    epingles: sans(w.epingles, chemin),
    ouverts: sans(w.ouverts, chemin)
  }))
}

// Le nouveau chemin de `p` après ces déplacements (un dossier emporte son contenu).
function suivre(p: string, paires: [string, string][]): string {
  for (const [a, b] of paires) {
    if (p === a) return b
    if (p.startsWith(a + '/')) return b + p.slice(a.length)
  }
  return p
}

export function suivreDeplacement(e: EtatFichiers, paires: [string, string][]): EtatFichiers {
  let r = e
  for (const ws of Object.keys(e)) {
    r = modifier(r, ws, (w) => {
      const n: Partial<FichiersWorkspace> = {}
      for (const c of CHAMPS) n[c] = [...new Set(w[c].map((p) => suivre(p, paires)))]
      return n
    })
  }
  return r
}

export function retirerAbsents(e: EtatFichiers, existe: (chemin: string) => boolean): EtatFichiers {
  let r = e
  for (const ws of Object.keys(e))
    r = modifier(r, ws, (w) => ({
      epingles: w.epingles.filter(existe),
      ouverts: w.ouverts.filter(existe)
    }))
  return r
}

export function oublierWorkspace(e: EtatFichiers, ws: string): EtatFichiers {
  if (!(ws in e)) return e
  const r = { ...e }
  delete r[ws]
  return r
}

export function ajouterDossier(e: EtatFichiers, ws: string, chemin: string): EtatFichiers {
  return modifier(e, ws, (w) => ({
    dossiers: w.dossiers.includes(chemin) ? w.dossiers : [...w.dossiers, chemin]
  }))
}

export function retirerDossier(e: EtatFichiers, ws: string, chemin: string): EtatFichiers {
  return modifier(e, ws, (w) => ({
    dossiers: sans(w.dossiers, chemin),
    ordreRacines: sans(w.ordreRacines, chemin)
  }))
}

// Les racines de l'explorateur : les dossiers des spaces, puis les dossiers
// ajoutés, chacun une fois ; celles dont l'ordre est retenu passent devant.
export function racines(dossiersSpaces: string[], f: FichiersWorkspace): string[] {
  const base = [...new Set([...dossiersSpaces, ...f.dossiers].filter(Boolean))]
  const ordonnees = f.ordreRacines.filter((r) => base.includes(r))
  return [...ordonnees, ...base.filter((r) => !ordonnees.includes(r))]
}

export function deplacerRacine(
  e: EtatFichiers,
  ws: string,
  actuelles: string[],
  chemin: string,
  index: number
): EtatFichiers {
  const liste = sans(actuelles, chemin)
  liste.splice(Math.max(0, Math.min(index, liste.length)), 0, chemin)
  return modifier(e, ws, () => ({ ordreRacines: liste }))
}

const basculer = (liste: string[], x: string): string[] =>
  liste.includes(x) ? sans(liste, x) : [...liste, x]

export function basculerDeplie(e: EtatFichiers, ws: string, dossier: string): EtatFichiers {
  return modifier(e, ws, (w) => ({ deplies: basculer(w.deplies, dossier) }))
}

export function basculerRacine(e: EtatFichiers, ws: string, racine: string): EtatFichiers {
  return modifier(e, ws, (w) => ({ replies: basculer(w.replies, racine) }))
}

// Tout replier, racines comprises (comme « Réduire les dossiers » de VS Code).
export function toutReplier(e: EtatFichiers, ws: string, racines: string[]): EtatFichiers {
  return modifier(e, ws, () => ({ deplies: [], replies: [...racines] }))
}

// Libellés des onglets : le nom, et quand plusieurs fichiers le partagent,
// autant de dossiers parents qu'il faut pour les distinguer (en gris).
export function libellesOnglets(chemins: string[]): Map<string, { nom: string; dossier: string }> {
  const r = new Map<string, { nom: string; dossier: string }>()
  const parNom = new Map<string, string[]>()
  for (const p of new Set(chemins)) {
    const nom = p.slice(p.lastIndexOf('/') + 1)
    parNom.set(nom, [...(parNom.get(nom) ?? []), p])
  }
  for (const [nom, groupe] of parNom) {
    if (groupe.length === 1) {
      r.set(groupe[0], { nom, dossier: '' })
      continue
    }
    const dossiers = groupe.map((p) => p.split('/').slice(0, -1))
    const fin = (d: string[], k: number): string => d.slice(-k).join('/') || '/'
    let profondeur = 1
    const max = Math.max(...dossiers.map((d) => d.length))
    while (
      profondeur < max &&
      new Set(dossiers.map((d) => fin(d, profondeur))).size < groupe.length
    )
      profondeur++
    groupe.forEach((p, i) => r.set(p, { nom, dossier: fin(dossiers[i], profondeur) }))
  }
  return r
}

// Les fichiers montrés par la visionneuse au lieu de l'éditeur.
export function estImage(chemin: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|ico|tiff?|svg)$/i.test(chemin)
}
