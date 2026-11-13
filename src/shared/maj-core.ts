// Les mises à jour de herdr-core : quelle version est installée, laquelle est
// publiée (https://releases.herdr.dev/core/latest.json), et si Berger doit le dire.

// Berger parle la génération 1 du protocole : une autre génération ne se propose pas.
export const GENERATION = 1

export type EtatMajCore = {
  actuelle: string | null
  disponible: string | null
  // Heure (ms) de la dernière vérification réussie.
  verifieA: number | null
  erreur: string | null
  enCours: boolean
}

const VERSION = /^\d+(\.\d+)*$/

export function comparerVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d
  }
  return 0
}

export function versionDisponible(actuelle: string, publie: unknown): string | null {
  if (!publie || typeof publie !== 'object') return null
  const { version, generation } = publie as { version?: unknown; generation?: unknown }
  if (typeof version !== 'string' || !VERSION.test(version) || generation !== GENERATION)
    return null
  return comparerVersions(version, actuelle) > 0 ? version : null
}

export function versionDeHc(sortie: string): string | null {
  return /^hc (\d+(?:\.\d+)*)/.exec(sortie.trim())?.[1] ?? null
}
