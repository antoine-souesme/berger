// La colonne de gauche : les spaces et les agents du workspace ouvert
// (l'explorateur est dans explorateur.ts). La barre des workspaces est dans workspaces.ts.
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
import { ANNEAU_TRAVAIL, icone } from './icones'
import { ouvrirDialogue } from './dialogue'
import { ouvrirMenu } from './menus'

const PASTILLES = ['#5d9e5d', '#2f9a9a', '#c47a3a', '#8a6fc4', '#c45b8a', '#4f86c6']

let surAgent: (a: PlaceAgent) => void = () => {}
let spaceEnRenommage: string | null = null

const el = (id: string): HTMLElement => document.getElementById(id)!

export function initColonne(rappels: { choisirAgent: (a: PlaceAgent) => void }): void {
  surAgent = rappels.choisirAgent
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
    git.title = space.branche ?? ''
  }
  ligne.append(pastille(space.nom), nom, git)
  ligne.onclick = () => afficherSpace(space.id)
  ligne.oncontextmenu = (e) => {
    e.preventDefault()
    ouvrirMenu(
      e.clientX,
      e.clientY,
      [
        {
          libelle: 'Renommer',
          icone: 'pencil',
          raccourci: '⇧F2',
          faire: () => renommerSpace(space.id)
        },
        'separateur',
        {
          libelle: 'Supprimer',
          icone: 'trash-2',
          danger: true,
          faire: () => void supprimerSpace(space)
        }
      ],
      'Actions du space'
    )
  }
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

// L'icône d'état d'un agent, comme dans Herdr (mod `antoine-agents`) : au
// travail, l'anneau qui tourne de Herdr ; t'attend, un point rose ; fini, une
// coche verte ; au repos, un anneau gris. Toutes dans une case de 14 px, pour
// rester alignées d'une ligne à l'autre.

function iconeEtat(agent: LigneAgent['agent']): HTMLElement {
  const c = document.createElement('span')
  c.className = 'etat-agent'
  if (agent === 'travail') {
    c.innerHTML = ANNEAU_TRAVAIL
    c.classList.add('tourne')
    c.style.color = COULEUR_ETAT.travail
    c.setAttribute('aria-label', 'au travail')
  } else if (agent === 'fini') {
    // Un rond vert, comme dans Herdr.
    const p = document.createElement('span')
    p.className = 'point-fini'
    p.style.background = COULEUR_ETAT.fini
    c.append(p)
    c.setAttribute('aria-label', 'fini')
  } else if (agent === 'attente') {
    const p = document.createElement('span')
    p.className = 'point-attente'
    c.append(p)
    c.setAttribute('aria-label', "t'attend")
  } else {
    const p = document.createElement('span')
    p.className = 'anneau-repos'
    c.append(p)
    c.setAttribute('aria-label', 'au repos')
  }
  return c
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
  ligne.append(iconeEtat(l.agent))
  ligne.onclick = () => {
    if (a) surAgent(a)
  }
  return ligne
}

function dessiner(): void {
  const e = etat()
  const s = spaceAffiche()
  const visibles = spacesVisiblesUi()
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

function renommerSpace(id: string): void {
  if (etat().colonneMasquee) changer((e) => (e.colonneMasquee = false))
  spaceEnRenommage = id
  changer(() => {})
}

export function renommerSpaceEnPlace(): void {
  const s = spaceAffiche()
  if (s) renommerSpace(s.id)
}

// Supprimer un space ferme réellement ses terminaux : seulement après la question.
async function supprimerSpace(space: VueSpace): Promise<void> {
  const r = await ouvrirDialogue({
    titre: `Supprimer « ${space.nom} » ?`,
    texte: 'Ses terminaux et leurs agents seront fermés.',
    bouton: { libelle: 'Supprimer', danger: true }
  })
  if (!r) return
  await window.berger.demander('berger:structure', { type: 'space.fermer', space: space.id })
}
