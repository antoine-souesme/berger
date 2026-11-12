// Règles pures de la recherche de fichiers (⌘P), comme celle de VS Code.
// Reprises et réécrites de `quickopen.js` du mod `antoine` : même score, même tri ; `correspondance` garde en plus
// les lettres trouvées, pour les surligner.

export type FichierRacine = { racine: string; relatif: string } // la racine de l'explorateur et le chemin dedans
export const cheminDe = (f: FichierRacine): string => `${f.racine}/${f.relatif}`

const SEP = /[/\-_. ]/

// À quel point `requete` (minuscules, sans espaces) correspond à `texte`, ses
// lettres dans l'ordre : null sinon. Des lettres voisines et en début de mot
// comptent plus.
export function correspondance(
  requete: string,
  texte: string
): { score: number; positions: number[] } | null {
  if (!requete) return { score: 0, positions: [] }
  const bas = texte.toLowerCase()
  let score = 0
  let a = -1
  let suite = 0
  const positions: number[] = []
  for (const c of requete) {
    const i = bas.indexOf(c, a + 1)
    if (i < 0) return null
    suite = i === a + 1 ? suite + 1 : 0
    const debutDeMot =
      i === 0 || SEP.test(texte[i - 1]) || (texte[i] !== bas[i] && texte[i - 1] === bas[i - 1])
    score += 1 + suite * 2 + (debutDeMot ? 3 : 0)
    positions.push(i)
    a = i
  }
  return { score, positions }
}

export type Trouve = { fichier: FichierRacine; positionsNom: number[]; positionsDossier: number[] }

const nomDe = (relatif: string): string => relatif.slice(relatif.lastIndexOf('/') + 1)

// Les fichiers à montrer pour `requete`, le meilleur d'abord, `limite` au plus.
// Requête vide : les récents. Une correspondance dans le nom bat une
// correspondance étalée sur les dossiers ; à égalité, les récents et les
// chemins courts passent devant.
export function chercher(
  requete: string,
  fichiers: FichierRacine[],
  recents: string[],
  limite = 60
): Trouve[] {
  const q = requete.toLowerCase().replace(/\s+/g, '')
  const parChemin = new Map(fichiers.map((f) => [cheminDe(f), f]))
  if (!q)
    return recents
      .filter((p) => parChemin.has(p))
      .slice(0, limite)
      .map((p) => ({ fichier: parChemin.get(p)!, positionsNom: [], positionsDossier: [] }))
  const rang = new Map(recents.map((p, i) => [p, i]))
  const notes: { t: Trouve; s: number }[] = []
  for (const f of fichiers) {
    const nom = nomDe(f.relatif)
    const debutNom = f.relatif.length - nom.length
    const dansNom = correspondance(q, nom)
    let s: number
    let t: Trouve
    if (dansNom) {
      s = 1000 + dansNom.score * 10
      t = { fichier: f, positionsNom: dansNom.positions, positionsDossier: [] }
    } else {
      const partout = correspondance(q, f.relatif)
      if (!partout) continue
      s = partout.score
      t = {
        fichier: f,
        positionsNom: partout.positions.filter((i) => i >= debutNom).map((i) => i - debutNom),
        positionsDossier: partout.positions.filter((i) => i < debutNom - 1)
      }
    }
    const r = rang.get(cheminDe(f))
    notes.push({
      t,
      s: s * 10 + (r === undefined ? 0 : 50 - Math.min(r, 49)) * 4 - f.relatif.length / 10
    })
  }
  notes.sort((a, b) => b.s - a.s || a.t.fichier.relatif.localeCompare(b.t.fichier.relatif))
  return notes.slice(0, limite).map((x) => x.t)
}

// Ce que la ligne montre après le nom : le dossier de la racine, puis celui du fichier.
export function emplacement(f: FichierRacine, maison: string): string {
  const racine = f.racine === maison ? '~' : f.racine.slice(f.racine.lastIndexOf('/') + 1)
  const dossier = f.relatif.includes('/') ? f.relatif.slice(0, f.relatif.lastIndexOf('/')) : ''
  return dossier ? `${racine} • ${dossier}` : racine
}

// Les fichiers de plusieurs racines, chacun une fois (une racine dans une autre le liste aussi).
export function fusionner(listes: FichierRacine[][]): FichierRacine[] {
  const vus = new Set<string>()
  const r: FichierRacine[] = []
  for (const liste of listes)
    for (const f of liste) {
      const p = cheminDe(f)
      if (!vus.has(p)) {
        vus.add(p)
        r.push(f)
      }
    }
  return r
}
