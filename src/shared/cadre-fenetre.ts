// Règles pures du cadre de la fenêtre retenu (`fenetre.json`) : taille, place,
// plein écran. Un cadre tombé hors de tous les écrans (écran débranché) est ignoré.
export type Cadre = {
  x: number
  y: number
  largeur: number
  hauteur: number
  pleinEcran: boolean
  agrandie: boolean
}
export type Ecran = { x: number; y: number; largeur: number; hauteur: number }

export const LARGEUR_MIN = 800
export const HAUTEUR_MIN = 500
// La part du cadre qui doit tomber sur un écran pour qu'on le garde.
const VISIBLE_MIN = 100

const nombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

function recouvrement(c: Cadre, e: Ecran): [number, number] {
  const l = Math.min(c.x + c.largeur, e.x + e.largeur) - Math.max(c.x, e.x)
  const h = Math.min(c.y + c.hauteur, e.y + e.hauteur) - Math.max(c.y, e.y)
  return [l, h]
}

export function lireCadre(brut: unknown, ecrans: Ecran[]): Cadre | null {
  if (!brut || typeof brut !== 'object') return null
  const o = brut as Record<string, unknown>
  const { x, y, largeur, hauteur } = o
  if (!nombre(x) || !nombre(y) || !nombre(largeur) || !nombre(hauteur)) return null
  const c: Cadre = {
    x: Math.round(x),
    y: Math.round(y),
    largeur: Math.round(Math.max(LARGEUR_MIN, largeur)),
    hauteur: Math.round(Math.max(HAUTEUR_MIN, hauteur)),
    pleinEcran: o['pleinEcran'] === true,
    agrandie: o['agrandie'] === true
  }
  const visible = ecrans.some((e) => {
    const [l, h] = recouvrement(c, e)
    return l >= VISIBLE_MIN && h >= VISIBLE_MIN
  })
  return visible ? c : null
}
