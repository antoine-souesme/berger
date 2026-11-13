// La visionneuse d'images et de vidéos (maquette explorateur.html e) : l'image
// ou la vidéo centrée sur un damier discret, le chemin en bandeau, dimensions
// (et durée) et poids en bas.
import { estVideo } from '../../shared/media'
import { iconeFichier } from '../../shared/icones-fichiers'
import { dossierAffiche } from '../../shared/libelles'
import { iconeMaterial } from './icones'

let maison = ''
let affichee: string | null = null
let dernierEchec = ''

const el = (id: string): HTMLElement => document.getElementById(id)!

export function initVisionneuse(m: string): void {
  maison = m
}

export function imageAffichee(): string | null {
  return affichee
}

export function raisonEchecImage(): string {
  return dernierEchec
}

export function cacherImage(): void {
  affichee = null
  ;(el('image') as HTMLImageElement).removeAttribute('src')
  arreterVideo()
}

function arreterVideo(): void {
  const v = el('video') as HTMLVideoElement
  v.pause()
  v.removeAttribute('src')
  v.load()
}

// Durée lisible : « 0:42 », « 12:05 », « 1:02:03 ».
export function dureeLisible(secondes: number): string {
  const s = Math.round(secondes)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const deux = (n: number): string => String(n).padStart(2, '0')
  return h ? `${h}:${deux(m)}:${deux(s % 60)}` : `${m}:${deux(s % 60)}`
}

// Poids lisible : « 48 Ko », « 1,1 Ko », « 2,4 Mo » (virgule française).
export function poidsLisible(octets: number): string {
  const f = (n: number): string =>
    n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 ? 1 : 0 })
  if (octets < 1024) return `${octets} octets`
  if (octets < 1024 * 1024) return `${f(octets / 1024)} Ko`
  return `${f(octets / 1024 / 1024)} Mo`
}

const TYPES: Record<string, string> = {
  svg: 'SVG',
  jpg: 'JPEG',
  jpeg: 'JPEG',
  tif: 'TIFF',
  tiff: 'TIFF',
  ico: 'ICO',
  mov: 'QuickTime',
  ogv: 'Ogg'
}

function bandeau(chemin: string): void {
  const morceaux = dossierAffiche(chemin, maison).split('/').filter(Boolean)
  const nom = chemin.slice(chemin.lastIndexOf('/') + 1)
  const enfants: Node[] = [iconeMaterial(iconeFichier(nom, false))]
  morceaux.forEach((m, i) => {
    if (i > 0) {
      const sep = document.createElement('span')
      sep.className = 'chemin-sep'
      sep.textContent = '›'
      enfants.push(sep)
    }
    const s = document.createElement('span')
    s.className = i === morceaux.length - 1 ? 'chemin-nom' : 'gris'
    s.textContent = m
    enfants.push(s)
  })
  el('image-bandeau').replaceChildren(...enfants)
}

// Montre une vidéo ; rend faux si elle est illisible.
async function afficherVideo(chemin: string): Promise<boolean> {
  const r = await window.berger.demander<{ url?: string; poids?: number; erreur?: string }>(
    'berger:video',
    { chemin }
  )
  if (affichee !== chemin) return true
  if (r.erreur !== undefined || !r.url) {
    affichee = null
    dernierEchec = r.erreur ?? 'vidéo illisible'
    return false
  }
  const img = el('image') as HTMLImageElement
  img.removeAttribute('src')
  img.hidden = true
  const v = el('video') as HTMLVideoElement
  v.hidden = false
  const ext = chemin.slice(chemin.lastIndexOf('.') + 1).toLowerCase()
  el('image-type').textContent = `Vidéo ${TYPES[ext] ?? ext.toUpperCase()}`
  v.onloadedmetadata = () => {
    if (affichee !== chemin) return
    el('image-dimensions').textContent =
      `${v.videoWidth} × ${v.videoHeight} px · ${dureeLisible(v.duration)} · ${poidsLisible(r.poids ?? 0)}`
  }
  v.onerror = () => {
    if (affichee !== chemin) return
    el('image-dimensions').textContent = 'Format de vidéo non pris en charge'
  }
  v.src = r.url
  return true
}

// Montre une image ou une vidéo ; rend faux si elle est illisible.
export async function afficherImage(chemin: string): Promise<boolean> {
  affichee = chemin
  bandeau(chemin)
  el('image-dimensions').textContent = ''
  if (estVideo(chemin)) return afficherVideo(chemin)
  arreterVideo()
  ;(el('video') as HTMLVideoElement).hidden = true
  ;(el('image') as HTMLImageElement).hidden = false
  const r = await window.berger.demander<{ url?: string; poids?: number; erreur?: string }>(
    'berger:image',
    { chemin }
  )
  if (affichee !== chemin) return true
  if (r.erreur !== undefined || !r.url) {
    affichee = null
    dernierEchec = r.erreur ?? 'image illisible'
    return false
  }
  const img = el('image') as HTMLImageElement
  const ext = chemin.slice(chemin.lastIndexOf('.') + 1).toLowerCase()
  el('image-type').textContent = `Image ${TYPES[ext] ?? ext.toUpperCase()}`
  img.onload = () => {
    if (affichee !== chemin) return
    el('image-dimensions').textContent =
      `${img.naturalWidth} × ${img.naturalHeight} px · ${poidsLisible(r.poids ?? 0)}`
  }
  img.src = r.url
  return true
}
