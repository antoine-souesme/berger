// Règles pures des réglages de Berger (`reglages.json`, écrit à la main ;
// Berger ne le crée pas). Valeur absente ou invalide : la valeur par défaut.
export type Reglages = { editeur: { couleurSelection: string } }

// La couleur de sélection du thème Monokai de VS Code.
export const REGLAGES_PAR_DEFAUT: Reglages = { editeur: { couleurSelection: '#878b9180' } }

const objet = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {}

const COULEUR = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function lireReglages(brut: unknown): Reglages {
  const c = objet(objet(brut)['editeur'])['couleurSelection']
  return {
    editeur: {
      couleurSelection:
        typeof c === 'string' && COULEUR.test(c) ? c : REGLAGES_PAR_DEFAUT.editeur.couleurSelection
    }
  }
}
