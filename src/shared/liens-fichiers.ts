// Règles pures : les chemins de fichiers écrits dans un terminal (par Claude
// Code, un compilateur, `git status`…), qu'un ⌘-clic ouvre dans l'éditeur.

export type CibleFichier = {
  chemin: string
  ligne?: number | undefined
  colonne?: number | undefined
}
export type CandidatFichier = CibleFichier & { debut: number; fin: number }

// Un mot qui peut être un chemin : pas d'espace ni de délimiteur courant.
const MOT = /[^\s()[\]{}<>"'`,;|│]+/g
// La position à la fin : `:12`, `:12:5`, `:12-20`, `#L12`, `#L12C5`.
const POSITION = /(?::(\d+)(?::(\d+))?(?:-\d+)?|#L(\d+)(?:C(\d+))?(?:-L?\d+)?)$/
// Ponctuation de fin de phrase, jamais dans un chemin qu'on veut ouvrir.
const PONCTUATION = /[.:,!?]+$/

// Les chemins possibles d'une ligne, avec leur place (en caractères). Ils ne
// sont que possibles : on vérifie ensuite sur le disque qu'ils existent.
export function candidatsFichiers(texte: string): CandidatFichier[] {
  const r: CandidatFichier[] = []
  for (const m of texte.matchAll(MOT)) {
    if (m[0].includes('://')) continue
    // `a/b.ts:12:` ou `a/b.ts.` en fin de phrase.
    const mot = m[0].replace(PONCTUATION, '')
    const pos = POSITION.exec(mot)
    const chemin = pos ? mot.slice(0, pos.index) : mot
    // `file:src/a.ts`, `Erreur:a.ts` : pas un chemin seul.
    if (chemin.includes(':') || !ressembleAUnChemin(chemin)) continue
    const ligne = pos ? Number(pos[1] ?? pos[3]) : undefined
    const colonne = pos ? Number(pos[2] ?? pos[4]) || undefined : undefined
    r.push({
      chemin,
      debut: m.index,
      fin: m.index + mot.length,
      ...(ligne ? { ligne } : {}),
      ...(colonne ? { colonne } : {})
    })
  }
  return r
}

// Un dossier ou une extension : `src/a`, `./a`, `~/a`, `/a`, `a.ts`.
function ressembleAUnChemin(c: string): boolean {
  if (!c || c === '.' || c === '..' || c === '/' || c === '~') return false
  if (c.includes('/')) return /[\w]/.test(c)
  return /^[\w@.+-]*[\w]\.[A-Za-z][\w]*$/.test(c)
}

// Le chemin absolu, à partir du dossier du terminal (et de la maison pour `~`).
export function resoudreChemin(chemin: string, dossier: string, maison: string): string {
  let c = chemin
  if (c === '~' || c.startsWith('~/')) c = maison + c.slice(1)
  else if (!c.startsWith('/')) c = `${dossier.replace(/\/+$/, '')}/${c}`
  const parts: string[] = []
  for (const p of c.split('/')) {
    if (!p || p === '.') continue
    if (p === '..') parts.pop()
    else parts.push(p)
  }
  return '/' + parts.join('/')
}

// Un lien `file://` posé par le programme (OSC 8) : son chemin et sa ligne.
export function cibleLienFichier(url: string): CibleFichier | null {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'file:' || (u.hostname && u.hostname !== 'localhost')) return null
  const chemin = decodeURIComponent(u.pathname)
  const pos = /^L?(\d+)(?:[:C,](\d+))?/.exec(u.hash.slice(1))
  return {
    chemin,
    ...(pos ? { ligne: Number(pos[1]) } : {}),
    ...(pos?.[2] ? { colonne: Number(pos[2]) } : {})
  }
}
