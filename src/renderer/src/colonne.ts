// La colonne de gauche : zone « Explorateur » (en attendant la phase 4 : la
// liste de fichiers de la phase 0), puis les spaces et les agents du
// workspace ouvert. La barre des workspaces est dans workspaces.ts.
import { filtrerFichiers, LIMITE_FICHIERS, type ListeFichiers } from '../../shared/fichiers'
import { COULEUR_ETAT } from '../../shared/libelles'
import { duree, listeAgents, type LigneAgent } from '../../shared/agents'
import type { PlaceAgent } from '../../shared/onglets'
import type { VueSpace } from '../../shared/spaces'
import {
  afficherSpace,
  changer,
  demanderWorkspace,
  etat,
  spaceAffiche,
  spacesVisiblesUi,
  surChangement,
  workspaceOuvert
} from './etat'
import { glisseEnCours, rendreGlissable } from './glisser'
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
  el('nouveau-space').onclick = () => void nouveauSpace()
  el('tri-agents').onclick = () =>
    changer((e) => (e.triAgents = e.triAgents === 'spaces' ? 'urgence' : 'spaces'))
  surChangement(dessiner)
  // Les durées des agents avancent même quand rien ne change.
  setInterval(() => changer(() => {}), 30_000)
}

// Un space neuf (un shell dans le dossier personnel) ; il rejoint le
// workspace ouvert, et on l'affiche.
export async function nouveauSpace(): Promise<void> {
  const r = await window.berger.demander<
    { ok: true; space: string; onglet: string; panneau: string } | { erreur: string }
  >('berger:structure', { type: 'space.nouveau' })
  if ('erreur' in r) return
  changer((e) => {
    e.space = r.space
    e.onglet = { type: 'terminal', id: r.onglet }
    e.focus[r.onglet] = r.panneau
  })
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
  el('explorateur-vide').hidden = dossierListe !== null
  if (dossierListe === null) {
    champ.hidden = true
    message.hidden = true
  } else if (dossierListe === '') {
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
  const git = document.createElement('span')
  if (space.aPousser) {
    git.className = 'a-pousser'
    git.title = space.aPousser === 1 ? '1 commit à pousser' : `${space.aPousser} commits à pousser`
    git.append(icone('arrow-up', 'currentColor', 12), String(space.aPousser))
  } else {
    git.className = 'gris branche'
    git.textContent = space.branche ?? ''
  }
  ligne.append(pastille(space.nom), nom, git)
  ligne.onclick = () => afficherSpace(space.id)
  ligne.dataset['space'] = space.id
  rendreGlissable(ligne, {
    axe: 'y',
    liste: () => [...el('liste-spaces').querySelectorAll<HTMLElement>('.ligne-space')],
    deposer: (index) => void demanderWorkspace({ type: 'space.deplacer', space: space.id, index })
  })
  return ligne
}

let lignes: LigneAgent[] = []

// La liste des agents dessinée (pour ⌘] / ⌘[).
export function lignesAgents(): LigneAgent[] {
  return lignes
}

// L'icône d'état d'un agent (maquette) : au travail, t'attend, fini.
function iconeEtat(agent: LigneAgent['agent']): Node | null {
  if (agent === 'travail') {
    const i = icone('loader-circle', COULEUR_ETAT.travail, 13)
    i.setAttribute('aria-label', 'au travail')
    return i
  }
  if (agent === 'fini') {
    const i = icone('check', COULEUR_ETAT.fini, 13)
    i.setAttribute('aria-label', 'fini')
    return i
  }
  if (agent === 'attente') {
    const p = document.createElement('span')
    p.className = 'point-attente'
    p.setAttribute('aria-label', "t'attend")
    return p
  }
  return null
}

function iconeProgramme(l: LigneAgent): SVGElement {
  if (l.programme.icone === 'bot') return icone('bot', '#d98a6a', 15)
  return icone(l.programme.icone, 'var(--gris-clair)', 15)
}

function ligneAgent(l: LigneAgent, maintenant: number): HTMLElement {
  const e = etat()
  const a = l.place
  const ligne = document.createElement('div')
  const affiche =
    !!a &&
    a.adresse === l.adresse &&
    spaceAffiche()?.id === a.space &&
    e.onglet?.type === 'terminal' &&
    e.onglet.id === a.onglet &&
    e.focus[a.onglet] === a.panneau
  const sous = l.traits.length > 0
  ligne.className = 'ligne-agent' + (sous ? ' sous-agent' : '') + (affiche ? ' choisi' : '')
  ligne.dataset['cle'] = l.cle
  if (sous) {
    for (const t of l.traits) {
      const trait = document.createElement('span')
      trait.className =
        'trait-arbre' + (t ? ' ligne' : '') + (t === '└' || t === '├' ? ' coin' : '')
      ligne.append(trait)
    }
  } else {
    const nom = document.createElement('span')
    nom.className = 'nom'
    nom.textContent = l.nomSpace
    ligne.append(iconeProgramme(l), nom)
  }
  const titre = document.createElement('span')
  titre.className = 'titre-agent'
  titre.textContent = sous ? l.titre || l.programme.nom : l.titre ? `· ${l.titre}` : ''
  ligne.append(titre)
  if (l.depuis) {
    const d = document.createElement('span')
    d.className = 'duree'
    d.textContent = duree(maintenant - l.depuis)
    ligne.append(d)
  }
  const etatIcone = iconeEtat(l.agent)
  if (etatIcone) ligne.append(etatIcone)
  ligne.onclick = () => {
    if (a) surAgent(a)
  }
  return ligne
}

function dessiner(): void {
  const e = etat()
  const s = spaceAffiche()
  const visibles = spacesVisiblesUi()
  const dossier = s?.dossier ?? null
  if (dossier === null) {
    if (dossierListe !== null) {
      dossierListe = null
      liste = { fichiers: [], tronquee: false }
      dessinerFichiers()
    }
  } else if (dossier !== dossierListe) void chargerFichiers(dossier)

  if (glisseEnCours()) {
    // Liste des spaces figée pendant un glissement (voir glisser.ts).
  } else if (visibles.length)
    el('liste-spaces').replaceChildren(
      ...visibles.map((space) => ligneSpace(space, space.id === s?.id))
    )
  else {
    const b = document.createElement('button')
    b.className = 'nouveau-space'
    b.append(icone('plus', 'currentColor', 14), 'Nouveau space')
    b.onclick = () => void nouveauSpace()
    el('liste-spaces').replaceChildren(b)
  }

  const tri = el('tri-agents')
  tri.replaceChildren(
    icone(e.triAgents === 'urgence' ? 'clock' : 'folder', 'currentColor', 14, 1.75)
  )
  tri.title = e.triAgents === 'urgence' ? 'Par urgence' : 'Ordre des spaces'

  lignes = listeAgents(
    e.vue,
    visibles.map((x) => x.id),
    e.triAgents
  )
  const maintenant = Date.now()
  if (lignes.length)
    el('liste-agents').replaceChildren(...lignes.map((l) => ligneAgent(l, maintenant)))
  else {
    const vide = document.createElement('div')
    vide.className = 'aucun-agent'
    vide.textContent = 'Aucun agent'
    el('liste-agents').replaceChildren(vide)
  }

  // Workspace vide : la carte de la maquette à droite.
  const w = workspaceOuvert()
  const carte = el('workspace-vide')
  carte.hidden = !!s || !e.workspaces
  if (!s && w)
    el('workspace-vide-texte').textContent = `${w.nom} est vide. Crée un space pour commencer.`
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
