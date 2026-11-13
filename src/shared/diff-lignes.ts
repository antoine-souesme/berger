// Les marques de la marge de l'éditeur : ce qui a changé dans le texte par
// rapport au dernier commit (`HEAD`), ligne par ligne, comme VS Code.

export type Marque =
  | { type: 'ajout' | 'modif'; debut: number; fin: number }
  // Des lignes supprimées juste avant la ligne `ligne` (après la dernière
  // ligne quand `enBas`).
  | { type: 'suppression'; ligne: number; enBas: boolean }

// Au-delà de ce nombre de différences, la partie changée est marquée d'un seul
// bloc (le calcul exact coûterait trop).
const DIFFERENCES_MAX = 2000

const lignes = (texte: string): string[] => texte.replace(/\r\n/g, '\n').split('\n')

type Bloc = { ancien: number; nouveau: number; nbAncien: number; nbNouveau: number }

// Les blocs changés (positions à partir de 0), par l'algorithme de Myers (celui
// de git) : le plus court chemin de suppressions et d'ajouts.
function blocs(a: string[], b: string[]): Bloc[] {
  let debut = 0
  while (debut < a.length && debut < b.length && a[debut] === b[debut]) debut++
  let finA = a.length
  let finB = b.length
  while (finA > debut && finB > debut && a[finA - 1] === b[finB - 1]) {
    finA--
    finB--
  }
  const n = finA - debut
  const m = finB - debut
  if (n === 0 && m === 0) return []
  const unSeul = [{ ancien: debut, nouveau: debut, nbAncien: n, nbNouveau: m }]
  if (n === 0 || m === 0) return unSeul
  const A = (i: number): string => a[debut + i]
  const B = (j: number): string => b[debut + j]
  // v[k] : le plus loin atteint sur la diagonale k ; une copie par étape pour
  // retrouver le chemin.
  const max = Math.min(n + m, DIFFERENCES_MAX)
  const decalage = max + 1
  const v = new Int32Array(2 * max + 3)
  const traces: Int32Array[] = []
  let trouve = -1
  for (let d = 0; d <= max && trouve < 0; d++) {
    traces.push(v.slice(decalage - d - 1, decalage + d + 2))
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[decalage + k - 1] < v[decalage + k + 1])
          ? v[decalage + k + 1]
          : v[decalage + k - 1] + 1
      let y = x - k
      while (x < n && y < m && A(x) === B(y)) {
        x++
        y++
      }
      v[decalage + k] = x
      if (x >= n && y >= m) {
        trouve = d
        break
      }
    }
  }
  if (trouve < 0) return unSeul
  // Remonter le chemin, de la fin au début : chaque pas est un ajout ou une suppression.
  const pas: { type: 'ajout' | 'suppression'; i: number; j: number }[] = []
  let x = n
  let y = m
  for (let d = trouve; d > 0; d--) {
    const t = traces[d]
    const lire = (k: number): number => t[k + d + 1]
    const k = x - y
    const depuisHaut = k === -d || (k !== d && lire(k - 1) < lire(k + 1))
    const kAvant = depuisHaut ? k + 1 : k - 1
    const xAvant = lire(kAvant)
    const yAvant = xAvant - kAvant
    while (x > (depuisHaut ? xAvant : xAvant + 1) && y > (depuisHaut ? yAvant + 1 : yAvant)) {
      x--
      y--
    }
    if (depuisHaut) pas.push({ type: 'ajout', i: xAvant, j: yAvant })
    else pas.push({ type: 'suppression', i: xAvant, j: yAvant })
    x = xAvant
    y = yAvant
  }
  pas.reverse()
  const r: Bloc[] = []
  for (const p of pas) {
    const dernier = r[r.length - 1]
    const ancien = debut + p.i
    const nouveau = debut + p.j
    if (
      dernier &&
      dernier.ancien + dernier.nbAncien === ancien &&
      dernier.nouveau + dernier.nbNouveau === nouveau
    ) {
      if (p.type === 'ajout') dernier.nbNouveau++
      else dernier.nbAncien++
    } else
      r.push({
        ancien,
        nouveau,
        nbAncien: p.type === 'suppression' ? 1 : 0,
        nbNouveau: p.type === 'ajout' ? 1 : 0
      })
  }
  return r
}

export function marquesDiff(ancien: string, nouveau: string): Marque[] {
  const b = lignes(nouveau)
  return blocs(lignes(ancien), b).map((x): Marque => {
    if (x.nbNouveau === 0) {
      const enBas = x.nouveau >= b.length
      return { type: 'suppression', ligne: enBas ? b.length : x.nouveau + 1, enBas }
    }
    return {
      type: x.nbAncien === 0 ? 'ajout' : 'modif',
      debut: x.nouveau + 1,
      fin: x.nouveau + x.nbNouveau
    }
  })
}
