// La colonne de gauche : barre des workspaces (vide dans cette phase), zone
// « Explorateur » (en attendant la phase 4 : la liste de fichiers de la
// phase 0), puis les spaces et les agents.
import { filtrerFichiers, LIMITE_FICHIERS, type ListeFichiers } from '../../shared/fichiers'
import { COULEUR_ETAT } from '../../shared/libelles'
import { agents, type PlaceAgent } from '../../shared/onglets'
import type { VueSpace } from '../../shared/spaces'
import { afficherSpace, changer, etat, spaceAffiche, surChangement } from './etat'
import { icone } from './icones'

const AFFICHES = 200
const PASTILLES = ['#5d9e5d', '#2f9a9a', '#c47a3a', '#8a6fc4', '#c45b8a', '#4f86c6']

let dossierListe: string | null = null
let liste: ListeFichiers = { fichiers: [], tronquee: false }
let surFichier: (chemin: string) => void = () => {}
let surAgent: (a: PlaceAgent) => void = () => {}
let spaceEnRenommage: string | null = null

const el = (id: string): HTMLElement => document.getElementById(id)!

export function initColonne(rappels: {
  ouvrirFichier: (chemin: string) => void
  choisirAgent: (a: PlaceAgent) => void
}): void {
  surFichier = rappels.ouvrirFichier
  surAgent = rappels.choisirAgent
  const champ = el('filtre') as HTMLInputElement
  champ.addEventListener('input', dessinerFichiers)
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const premier = filtrerFichiers(liste.fichiers, champ.value)[0]
      if (premier) choisirFichier(premier)
    }
  })
  surChangement(dessiner)
}

function choisirFichier(relatif: string): void {
  surFichier(`${dossierListe}/${relatif}`)
}

async function chargerFichiers(dossier: string): Promise<void> {
  dossierListe = dossier
  liste = { fichiers: [], tronquee: false }
  dessinerFichiers()
  const r = await window.berger.demander<ListeFichiers>('berger:lister', { dossier })
  if (dossierListe !== dossier) return
  liste = r
  dessinerFichiers()
}

function dessinerFichiers(): void {
  const message = el('explorateur-message')
  const champ = el('filtre') as HTMLInputElement
  if (dossierListe === '') {
    message.textContent = "Ce space n'a pas de dossier"
    message.hidden = false
    champ.hidden = true
  } else {
    champ.hidden = false
    message.textContent = `Liste limitée aux ${LIMITE_FICHIERS.toLocaleString('fr-FR')} premiers fichiers`
    message.hidden = !liste.tronquee
  }
  el('liste-fichiers').replaceChildren(
    ...filtrerFichiers(liste.fichiers, champ.value)
      .slice(0, AFFICHES)
      .map((relatif) => {
        const ligne = document.createElement('div')
        ligne.className = 'fichier'
        const nom = relatif.slice(relatif.lastIndexOf('/') + 1)
        const dossier = relatif.includes('/') ? relatif.slice(0, relatif.lastIndexOf('/')) : ''
        const n = document.createElement('span')
        n.textContent = nom
        const d = document.createElement('span')
        d.className = 'gris'
        d.textContent = dossier
        ligne.append(n, d)
        ligne.title = relatif
        ligne.onclick = () => choisirFichier(relatif)
        return ligne
      })
  )
}

function pastille(nom: string): HTMLElement {
  const p = document.createElement('span')
  p.className = 'pastille'
  const lettre = (nom.trim()[0] ?? '?').toUpperCase()
  p.textContent = lettre
  let h = 0
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0
  p.style.background = PASTILLES[h % PASTILLES.length]
  return p
}

function ligneSpace(space: VueSpace, affiche: boolean): HTMLElement {
  const ligne = document.createElement('div')
  ligne.className = 'ligne-space' + (affiche ? ' choisi' : '')
  ligne.title = space.dossier
  const nom = document.createElement('span')
  nom.className = 'nom'
  if (spaceEnRenommage === space.id) {
    const champ = document.createElement('input')
    champ.className = 'renommage'
    champ.value = space.nom
    champ.spellcheck = false
    let fini = false
    const finir = (valider: boolean): void => {
      if (fini) return
      fini = true
      spaceEnRenommage = null
      if (valider)
        void window.berger.demander('berger:structure', {
          type: 'space.renommer',
          space: space.id,
          nom: champ.value
        })
      changer(() => {})
    }
    champ.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') finir(true)
      else if (e.key === 'Escape') finir(false)
    })
    champ.addEventListener('blur', () => finir(false))
    nom.append(champ)
    requestAnimationFrame(() => {
      champ.focus()
      champ.select()
    })
  } else nom.textContent = space.nom
  const branche = document.createElement('span')
  branche.className = 'gris branche'
  branche.textContent = space.branche ?? ''
  ligne.append(pastille(space.nom), nom, branche)
  ligne.onclick = () => afficherSpace(space.id)
  return ligne
}

function ligneAgent(a: PlaceAgent): HTMLElement {
  const e = etat()
  const t = e.vue.terminaux[a.adresse]
  const space = e.vue.spaces.find((s) => s.id === a.space)
  const ligne = document.createElement('div')
  const affiche = spaceAffiche()?.id === a.space && e.focus[a.onglet] === a.panneau
  ligne.className = 'ligne-agent' + (affiche ? ' choisi' : '')
  const couleur = t?.agent ? COULEUR_ETAT[t.agent] : '#75715e'
  const nom = document.createElement('span')
  nom.className = 'nom'
  nom.textContent = space?.nom ?? ''
  const prog = document.createElement('span')
  prog.className = 'gris'
  prog.textContent = `· ${t?.programme.nom ?? ''}`
  const etiquette = document.createElement('span')
  etiquette.className = 'etat-agent'
  etiquette.style.color = couleur
  etiquette.textContent = t?.etat ?? ''
  ligne.append(icone('bot', couleur), nom, prog, etiquette)
  ligne.onclick = () => surAgent(a)
  return ligne
}

function dessiner(): void {
  const e = etat()
  const s = spaceAffiche()
  const dossier = s?.dossier ?? null
  if (dossier !== null && dossier !== dossierListe) void chargerFichiers(dossier)
  el('liste-spaces').replaceChildren(
    ...e.vue.spaces.map((space) => ligneSpace(space, space.id === s?.id))
  )
  el('liste-agents').replaceChildren(...agents(e.vue).map(ligneAgent))
}

export function renommerSpaceEnPlace(): void {
  const s = spaceAffiche()
  if (!s) return
  if (etat().colonneMasquee) changer((e) => (e.colonneMasquee = false))
  spaceEnRenommage = s.id
  changer(() => {})
}

// Un message passager sous le filtre (fichier impossible à ouvrir…).
export function annoncerColonne(texte: string): void {
  const m = el('explorateur-message')
  m.textContent = texte
  m.hidden = false
  setTimeout(dessinerFichiers, 4000)
}
