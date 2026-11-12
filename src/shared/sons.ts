// Le son à jouer quand l'état des agents change, comme dans Herdr : un agent
// qui attend Antoine sonne toujours ; un agent qui finit sonne seulement s'il
// n'est pas sous ses yeux. Un terminal qu'on voit pour la première fois ne
// sonne pas (lancement de Berger, nouvel agent).
import type { EtatAgent } from './libelles'

export type Son = 'attente' | 'fini'

export function sonAJouer(
  avant: Record<string, EtatAgent>,
  apres: Record<string, EtatAgent>,
  regardes: ReadonlySet<string>
): Son | null {
  let son: Son | null = null
  for (const [adresse, etat] of Object.entries(apres)) {
    if (!(adresse in avant) || avant[adresse] === etat) continue
    if (etat === 'attente') return 'attente'
    if (etat === 'fini' && !regardes.has(adresse)) son = 'fini'
  }
  return son
}
