// Aperçu d'un fichier Markdown à côté de l'éditeur : un bouton dans le bandeau
// du fichier l'ouvre et le ferme ; il suit la frappe et les changements du
// disque. Le choix vaut pour tous les fichiers Markdown tant que Berger tourne.
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type * as monaco from 'monaco-editor'
import { icone } from './icones'
import { lienWeb } from '../../shared/liens'

let voulu = false
let modele: monaco.editor.ITextModel | null = null
let suivi: monaco.IDisposable | null = null
let attente: ReturnType<typeof setTimeout> | undefined

const zone = (): HTMLElement => document.getElementById('fichier-apercu')!

function dessiner(): void {
  if (!modele) return
  const html = marked.parse(modele.getValue(), { async: false, gfm: true })
  zone().innerHTML = DOMPurify.sanitize(html)
}

// Le fichier affiché a changé (ou plus aucun fichier : `null`).
export function suivreApercu(m: monaco.editor.ITextModel | null): void {
  suivi?.dispose()
  suivi = null
  clearTimeout(attente)
  modele = m && m.getLanguageId() === 'markdown' ? m : null
  const montre = voulu && modele !== null
  zone().hidden = !montre
  if (!montre) return zone().replaceChildren()
  dessiner()
  suivi = modele!.onDidChangeContent(() => {
    clearTimeout(attente)
    attente = setTimeout(dessiner, 150)
  })
}

// Le bouton du bandeau, pour un fichier Markdown seulement.
export function boutonApercu(m: monaco.editor.ITextModel): HTMLElement | null {
  if (m.getLanguageId() !== 'markdown') return null
  const b = document.createElement('button')
  b.className = 'bouton-bandeau' + (voulu ? ' actif' : '')
  b.title = voulu ? "Fermer l'aperçu" : 'Aperçu à côté'
  b.setAttribute('aria-label', 'Aperçu Markdown')
  b.append(icone('columns-2'))
  b.addEventListener('click', () => {
    voulu = !voulu
    b.classList.toggle('actif', voulu)
    b.title = voulu ? "Fermer l'aperçu" : 'Aperçu à côté'
    suivreApercu(m)
  })
  return b
}

// Un lien de l'aperçu ne remplace jamais la fenêtre : une adresse web s'ouvre
// dans le navigateur, une ancre fait défiler l'aperçu, le reste est ignoré.
export function initApercu(): void {
  zone().addEventListener('click', (ev) => {
    const a = (ev.target as Element).closest('a')
    if (!a) return
    ev.preventDefault()
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('#')) {
      const cible = zone().querySelector(`[id="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`)
      cible?.scrollIntoView({ block: 'start' })
      return
    }
    const lien = lienWeb(href)
    if (lien) window.berger.envoyer('berger:ouvrir-lien', { url: lien })
  })
}
