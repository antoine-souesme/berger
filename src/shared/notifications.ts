// Les sortes de notifications de Berger (bulle discrète en bas à droite) et
// leur réglage (`notifications` de reglages.json) : chaque sorte s'allume ou
// s'éteint ; absente ou invalide, elle prend sa valeur par défaut.

export type SorteNotification = 'copie'

export const SORTES_NOTIFICATIONS: {
  id: SorteNotification
  nom: string
  description: string
  parDefaut: boolean
}[] = [
  {
    id: 'copie',
    nom: 'Texte copié',
    description: 'Quand une sélection dans un terminal part dans le presse-papiers',
    parDefaut: true
  }
]

export function lireNotifications(x: unknown): Record<SorteNotification, boolean> {
  const o = x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {}
  const r = {} as Record<SorteNotification, boolean>
  for (const s of SORTES_NOTIFICATIONS)
    r[s.id] = typeof o[s.id] === 'boolean' ? (o[s.id] as boolean) : s.parDefaut
  return r
}

// La ligne grise sous le titre : la première ligne non vide du texte.
export function apercuTexte(texte: string): string {
  return (
    texte
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l) ?? ''
  )
}
