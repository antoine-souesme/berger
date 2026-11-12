// La recherche de fichiers ⌘P (maquette recherche-fichiers.html) : une
// fenêtre en haut au centre, un champ, les fichiers du workspace (toutes ses
// racines) ; champ vide : les récents. ↑ ↓ ↵ pour ouvrir, Échap pour fermer.
import { deWorkspace } from '../../shared/etat-fichiers'
import { iconeFichier } from '../../shared/icones-fichiers'
import {
  chercher,
  cheminDe,
  emplacement,
  fusionner,
  type FichierRacine,
  type Trouve
} from '../../shared/recherche'
import { etat, ouvrirChemins, workspaceOuvert } from './etat'
import { racinesDuWorkspace } from './explorateur'
import { icone, iconeMaterial } from './icones'

let maison = ''
let ouverte: { fermer: () => void } | null = null

export function rechercheOuverte(): boolean {
  return ouverte !== null
}

export function initRechercheFichiers(m: string): void {
  maison = m
}

const creer = <K extends keyof HTMLElementTagNameMap>(
  balise: K,
  classe: string
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(balise)
  e.className = classe
  return e
}

// Le texte avec les lettres trouvées surlignées.
function surligne(texte: string, positions: number[]): Node[] {
  const vues = new Set(positions)
  const r: Node[] = []
  let morceau = ''
  let dedans = false
  const pousser = (): void => {
    if (!morceau) return
    if (dedans) {
      const b = document.createElement('b')
      b.textContent = morceau
      r.push(b)
    } else r.push(document.createTextNode(morceau))
    morceau = ''
  }
  ;[...texte].forEach((c, i) => {
    if (vues.has(i) !== dedans) {
      pousser()
      dedans = vues.has(i)
    }
    morceau += c
  })
  pousser()
  return r
}

// Un récent vu depuis la racine qui le contient (avant que la liste n'arrive).
function depuisRacines(chemin: string, racines: string[]): FichierRacine {
  const r = racines.find((x) => chemin.startsWith(x + '/'))
  if (r) return { racine: r, relatif: chemin.slice(r.length + 1) }
  const i = chemin.lastIndexOf('/')
  return { racine: chemin.slice(0, i) || '/', relatif: chemin.slice(i + 1) }
}

export function ouvrirRechercheFichiers(): void {
  if (ouverte) return
  const w = workspaceOuvert()
  const recents = w && etat().fichiersWs ? deWorkspace(etat().fichiersWs!, w.id).recents : []
  const racines = racinesDuWorkspace()
  let fichiers: FichierRacine[] | null = null
  let resultats: Trouve[] = []
  let choisi = 0

  const voile = creer('div', 'voile voile-recherche')
  const palette = creer('div', 'palette')
  palette.setAttribute('role', 'dialog')
  palette.setAttribute('aria-label', 'Rechercher un fichier')
  const tete = creer('label', 'palette-champ')
  const champ = creer('input', '')
  champ.id = 'recherche-fichiers'
  champ.spellcheck = false
  champ.placeholder = 'Rechercher un fichier par son nom'
  tete.append(icone('search', '#a59f85', 18, 1.75), champ)
  const liste = creer('div', 'palette-liste')
  palette.append(tete, liste)
  voile.append(palette)

  const fermer = (): void => {
    voile.remove()
    ouverte = null
  }
  const ouvrir = (t: Trouve | undefined): void => {
    if (!t) return
    fermer()
    ouvrirChemins([cheminDe(t.fichier)])
  }

  const dessiner = (): void => {
    const q = champ.value
    if (fichiers) resultats = chercher(q, fichiers, recents)
    else
      resultats = q.trim()
        ? []
        : recents.map((c) => ({
            fichier: depuisRacines(c, racines),
            positionsNom: [],
            positionsDossier: []
          }))
    choisi = Math.min(choisi, Math.max(0, resultats.length - 1))
    const enfants: HTMLElement[] = []
    if (!q.trim() && resultats.length) {
      const titre = creer('div', 'palette-titre')
      titre.append(icone('clock', 'currentColor', 12, 2), 'Récents')
      enfants.push(titre)
    }
    resultats.forEach((t, i) => {
      const b = creer('div', 'palette-ligne' + (i === choisi ? ' choisie' : ''))
      const relatif = t.fichier.relatif
      const nom = relatif.slice(relatif.lastIndexOf('/') + 1)
      const n = creer('span', 'palette-nom')
      n.append(...surligne(nom, t.positionsNom))
      const ou = creer('span', 'palette-ou')
      ou.textContent = emplacement(t.fichier, maison)
      b.append(iconeMaterial(iconeFichier(nom, false)), n, ou)
      b.title = cheminDe(t.fichier)
      b.addEventListener('mousedown', (e) => e.preventDefault())
      b.addEventListener('click', () => ouvrir(t))
      enfants.push(b)
    })
    if (!enfants.length) {
      const vide = creer('div', 'palette-vide')
      vide.textContent = q.trim()
        ? fichiers
          ? 'Aucun fichier trouvé'
          : 'Recherche…'
        : 'Aucun fichier récent'
      enfants.push(vide)
    }
    liste.replaceChildren(...enfants)
    liste.querySelector('.choisie')?.scrollIntoView({ block: 'nearest' })
  }

  champ.addEventListener('input', () => {
    choisi = 0
    dessiner()
  })
  champ.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      fermer()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      choisi = Math.min(choisi + 1, resultats.length - 1)
      dessiner()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      choisi = Math.max(choisi - 1, 0)
      dessiner()
    } else if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault()
      ouvrir(resultats[choisi])
    }
  })
  champ.addEventListener('blur', () => requestAnimationFrame(() => ouverte && champ.focus()))
  voile.addEventListener('mousedown', (e) => {
    if (e.target === voile) {
      e.preventDefault()
      fermer()
    }
  })
  ouverte = { fermer }
  document.body.append(voile)
  dessiner()
  champ.focus()
  // La liste des fichiers : le cache du processus principal répond tout de suite après la première fois.
  void window.berger
    .demander<FichierRacine[][]>('berger:tous-fichiers', { racines })
    .then((listes) => {
      if (ouverte?.fermer !== fermer) return
      fichiers = fusionner(listes)
      dessiner()
    })
}
