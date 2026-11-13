// Les liens qu'un ⌘-clic dans un terminal peut ouvrir dans le navigateur :
// seulement les adresses web (pas de `file:`, `javascript:` ni d'autre
// programme lancé par une adresse inconnue).
export function lienWeb(texte: string): string | null {
  try {
    const url = new URL(texte.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
