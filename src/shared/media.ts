// Règles pures des vidéos de la visionneuse : leur adresse `berger-media:` et
// les morceaux demandés par le lecteur (en-tête `Range`, pour avancer dans la vidéo).

export const SCHEMA_MEDIA = 'berger-media'

export const TYPES_VIDEO: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg'
}

export function estVideo(chemin: string): boolean {
  const ext = chemin.slice(chemin.lastIndexOf('.') + 1).toLowerCase()
  return chemin.includes('.') && ext in TYPES_VIDEO
}

export function urlMedia(chemin: string): string {
  return `${SCHEMA_MEDIA}://fichier/${encodeURIComponent(chemin)}`
}

export function cheminDeUrlMedia(url: string): string | null {
  const prefixe = `${SCHEMA_MEDIA}://fichier/`
  if (!url.startsWith(prefixe)) return null
  try {
    const chemin = decodeURIComponent(url.slice(prefixe.length))
    return chemin.startsWith('/') ? chemin : null
  } catch {
    return null
  }
}

// Le morceau demandé (bornes comprises), tout le fichier sans en-tête, `null`
// pour une demande impossible (réponse 416).
export function plageDemandee(
  entete: string | null,
  taille: number
): { debut: number; fin: number; partiel: boolean } | null {
  if (!entete) return { debut: 0, fin: taille - 1, partiel: false }
  const m = /^bytes=(\d*)-(\d*)$/.exec(entete.trim())
  if (!m || (m[1] === '' && m[2] === '')) return null
  let debut: number
  let fin: number
  if (m[1] === '') {
    debut = Math.max(0, taille - Number(m[2]))
    fin = taille - 1
  } else {
    debut = Number(m[1])
    fin = m[2] === '' ? taille - 1 : Math.min(Number(m[2]), taille - 1)
  }
  if (debut > fin || debut >= taille) return null
  return { debut, fin, partiel: true }
}
