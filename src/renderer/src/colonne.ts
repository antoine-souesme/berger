import type { Vue, VueSpace, VueTerminal } from '../../shared/spaces'

type Rappels = {
  surClicTerminal: (adresse: string) => void
  surClicSpace: (space: VueSpace) => void
}

const racine = (): HTMLElement => document.getElementById('colonne')!
let spaceChoisi: string | null = null
let terminalChoisi: string | null = null
let derniereVue: Vue = { spaces: [], autres: [], terminaux: {} }
let connecte = false
let rappels: Rappels

export function initColonne(r: Rappels): void {
  rappels = r
}

export function afficherConnexion(etat: 'connecte' | 'deconnecte'): void {
  connecte = etat === 'connecte'
  dessiner()
}

export function afficherColonne(vue: Vue): void {
  derniereVue = vue
  dessiner()
}

function ligneTerminal(t: VueTerminal): HTMLElement {
  const ligne = document.createElement('div')
  ligne.className = 'terminal' + (t.adresse === terminalChoisi ? ' choisi' : '')
  ligne.title = t.adresse
  const libelle = document.createElement('span')
  libelle.className = 'libelle'
  libelle.textContent = t.libelle
  const etat = document.createElement('span')
  etat.className = 'etat ' + classeEtat(t.etat)
  etat.textContent = t.etat
  ligne.append(libelle, etat)
  ligne.onclick = (e) => {
    e.stopPropagation()
    terminalChoisi = t.adresse
    dessiner()
    rappels.surClicTerminal(t.adresse)
  }
  return ligne
}

function classeEtat(etat: string): string {
  if (etat === 'au travail') return 'travail'
  if (etat === 'en attente' || etat === 'bloqué') return 'attente'
  return ''
}

function dessiner(): void {
  const el = racine()
  el.replaceChildren()
  if (!connecte) {
    const bandeau = document.createElement('div')
    bandeau.className = 'bandeau'
    bandeau.textContent = 'Déconnecté de herdr-core'
    el.append(bandeau)
  }
  for (const space of derniereVue.spaces) {
    const bloc = document.createElement('div')
    bloc.className = 'space' + (space.id === spaceChoisi ? ' choisi' : '')
    const titre = document.createElement('div')
    titre.className = 'titre'
    titre.textContent = space.nom
    titre.title = space.dossier
    titre.onclick = () => {
      spaceChoisi = space.id
      dessiner()
      rappels.surClicSpace(space)
    }
    bloc.append(titre, ...space.terminaux.map(ligneTerminal))
    el.append(bloc)
  }
  if (derniereVue.autres.length) {
    const bloc = document.createElement('div')
    bloc.className = 'space autres'
    const titre = document.createElement('div')
    titre.className = 'titre'
    titre.textContent = 'Autres terminaux'
    bloc.append(titre, ...derniereVue.autres.map(ligneTerminal))
    el.append(bloc)
  }
}
