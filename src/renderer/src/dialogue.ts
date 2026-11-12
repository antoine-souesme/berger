// Le dialogue des maquettes (workspaces.html) : titre, texte ou champs
// « Emoji » et « Nom », « Esc pour annuler », « Annuler » et le bouton.
// Tant qu'il est ouvert, le clavier ne part ni au terminal ni aux raccourcis.
import { premierEmoji } from '../../shared/workspaces'

let ouvert: { annuler: () => void } | null = null

export function dialogueOuvert(): boolean {
  return ouvert !== null
}

const creer = <K extends keyof HTMLElementTagNameMap>(
  balise: K,
  classe: string,
  texte = ''
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(balise)
  el.className = classe
  if (texte) el.textContent = texte
  return el
}

export function ouvrirDialogue(o: {
  titre: string
  texte?: string
  champs?: { emoji: string; nom: string; focus: 'emoji' | 'nom' }
  bouton: { libelle: 'Valider' | 'Supprimer'; danger?: boolean }
}): Promise<{ emoji: string; nom: string } | null> {
  ouvert?.annuler()
  return new Promise((rendre) => {
    const voile = creer('div', 'voile')
    const boite = creer('div', 'dialogue')
    boite.setAttribute('role', 'dialog')
    boite.setAttribute('aria-label', o.titre)
    boite.append(creer('div', 'titre-dialogue', o.titre))
    if (o.texte) boite.append(creer('div', 'texte-dialogue', o.texte))

    let emoji: HTMLInputElement | null = null
    let nom: HTMLInputElement | null = null
    if (o.champs) {
      const ligne = creer('div', 'champs-dialogue')
      const champ = (libelle: string, valeur: string, classe: string): HTMLInputElement => {
        const l = creer('label', 'champ-dialogue ' + classe, libelle)
        const input = creer('input', 'saisie')
        input.value = valeur
        input.spellcheck = false
        input.setAttribute('aria-label', libelle)
        l.append(input)
        ligne.append(l)
        return input
      }
      emoji = champ('Emoji', o.champs.emoji, 'emoji')
      nom = champ('Nom', o.champs.nom, 'nom')
      boite.append(ligne)
    }

    const pied = creer('div', 'pied-dialogue')
    const aide = creer('span', 'aide-dialogue')
    aide.append(creer('kbd', '', 'Esc'), ' pour annuler')
    const annuler = creer('button', 'bouton-dialogue', 'Annuler')
    const valider = creer(
      'button',
      'bouton-dialogue principal' + (o.bouton.danger ? ' danger' : ''),
      o.bouton.libelle
    )
    pied.append(aide, creer('span', 'espace'), annuler, valider)
    boite.append(pied)
    voile.append(boite)

    const finir = (r: { emoji: string; nom: string } | null): void => {
      window.removeEventListener('keydown', touches, true)
      voile.remove()
      ouvert = null
      rendre(r)
    }
    const essayer = (): void => {
      if (!o.champs) return finir({ emoji: '', nom: '' })
      const n = nom!.value.trim()
      if (!n) return
      finir({ emoji: premierEmoji(emoji!.value) || '📁', nom: n })
    }
    // En capture, avant le terminal et les raccourcis de Berger.
    const touches = (ev: KeyboardEvent): void => {
      ev.stopPropagation()
      if (ev.key === 'Escape') {
        ev.preventDefault()
        finir(null)
      } else if (ev.key === 'Enter' && !ev.isComposing) {
        ev.preventDefault()
        essayer()
      } else if (ev.metaKey && !['a', 'c', 'v', 'x', 'z'].includes(ev.key.toLowerCase())) {
        // Les raccourcis (⌘T, ⌘W…) ne passent pas sous un dialogue.
        ev.preventDefault()
      }
    }
    window.addEventListener('keydown', touches, true)
    annuler.onclick = () => finir(null)
    valider.onclick = essayer
    voile.addEventListener('mousedown', (ev) => {
      if (ev.target === voile) ev.preventDefault()
    })
    ouvert = { annuler: () => finir(null) }
    document.body.append(voile)
    const cible = o.champs ? (o.champs.focus === 'emoji' ? emoji! : nom!) : valider
    requestAnimationFrame(() => {
      cible.focus()
      if (cible instanceof HTMLInputElement) cible.select()
    })
  })
}
