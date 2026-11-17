// Règles pures des fichiers temporaires (« Sans titre-1 », comme VS Code) :
// un onglet de fichier sans fichier sur le disque, jusqu'à son enregistrement.
// Son chemin commence par `sans-titre:/` : il ne ressemble à aucun vrai chemin,
// et le nom après la barre sert de libellé à l'onglet.
import type { EtatFichiers } from './etat-fichiers'

const PREFIXE = 'sans-titre:/'
const NOM = 'Sans titre-'

export function estSansTitre(chemin: string): boolean {
  return chemin.startsWith(PREFIXE)
}

export function nomSansTitre(chemin: string): string {
  return chemin.slice(PREFIXE.length)
}

// Le plus petit numéro libre parmi tous les fichiers ouverts (de tous les workspaces).
export function prochainSansTitre(ouverts: string[]): string {
  const pris = new Set(ouverts.filter(estSansTitre).map(nomSansTitre))
  let n = 1
  while (pris.has(NOM + n)) n++
  return PREFIXE + NOM + n
}

// Les fichiers temporaires ne sont pas retenus d'une session à l'autre.
export function sansTemporaires(e: EtatFichiers): EtatFichiers {
  const garder = (l: string[]): string[] => l.filter((c) => !estSansTitre(c))
  if (!Object.values(e).some((w) => [...w.epingles, ...w.ouverts].some(estSansTitre))) return e
  return Object.fromEntries(
    Object.entries(e).map(([ws, w]) => [
      ws,
      { ...w, epingles: garder(w.epingles), ouverts: garder(w.ouverts) }
    ])
  )
}
