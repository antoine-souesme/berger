// La barre des workspaces (maquettes vue-principale.html et workspaces.html) :
// les boutons de la colonne, un bouton par workspace, « + » en bas ; le menu
// du clic droit et ses dialogues ; glisser un bouton pour le déplacer.
import { COULEUR_ETAT, type EtatAgent } from '../../shared/libelles'
import { etatDuWorkspace, type Workspace } from '../../shared/workspaces'
import { ouvrirDialogue } from './dialogue'
import {
  afficherSpace,
  changer,
  demanderWorkspace,
  etat,
  ouvrirWorkspace,
  spaceAffiche,
  surChangement
} from './etat'
import { rendreGlissable } from './glisser'
import { icone } from './icones'
import { ouvrirMenu } from './menus'

const nav = (): HTMLElement => document.getElementById('workspaces')!

function bouton(classe: string, libelle: string): HTMLButtonElement {
  const b = document.createElement('button')
  b.className = classe
  b.setAttribute('aria-label', libelle)
  return b
}

// L'état le plus urgent de chaque space (pour la pastille des workspaces).
function etatParSpace(): Record<string, EtatAgent> {
  const e = etat()
  const r: Record<string, EtatAgent> = {}
  for (const s of e.vue.spaces) {
    let meilleur: EtatAgent = null
    for (const t of s.terminaux) {
      const a = t.agent
      if (!a) continue
      if (a === 'attente' || (a === 'fini' && meilleur !== 'attente') || !meilleur) meilleur = a
    }
    r[s.id] = meilleur
  }
  return r
}

async function nouveauWorkspace(): Promise<void> {
  const r = await ouvrirDialogue({
    titre: 'Nouveau workspace',
    champs: { emoji: '📁', nom: '', focus: 'nom' },
    bouton: { libelle: 'Valider' }
  })
  if (!r) return
  if (await demanderWorkspace({ type: 'creer', nom: r.nom, emoji: r.emoji }))
    changer((x) => (x.space = null))
}

async function renommer(w: Workspace): Promise<void> {
  const r = await ouvrirDialogue({
    titre: 'Renommer le workspace',
    champs: { emoji: w.emoji, nom: w.nom, focus: 'nom' },
    bouton: { libelle: 'Valider' }
  })
  if (!r) return
  await demanderWorkspace({ type: 'renommer', id: w.id, nom: r.nom })
  if (r.emoji !== w.emoji) await demanderWorkspace({ type: 'emoji', id: w.id, emoji: r.emoji })
}

async function changerEmoji(w: Workspace): Promise<void> {
  const r = await ouvrirDialogue({
    titre: "Changer l'emoji",
    champs: { emoji: w.emoji, nom: w.nom, focus: 'emoji' },
    bouton: { libelle: 'Valider' }
  })
  if (!r) return
  await demanderWorkspace({ type: 'emoji', id: w.id, emoji: r.emoji })
  if (r.nom !== w.nom) await demanderWorkspace({ type: 'renommer', id: w.id, nom: r.nom })
}

export function texteSuppression(n: number): string {
  if (n === 0) return 'Ce workspace ne contient aucun space.'
  if (n === 1) return 'Son space et ses agents seront fermés.'
  return `Ses ${n} spaces et leurs agents seront fermés.`
}

async function supprimer(w: Workspace): Promise<void> {
  // La liste annoncée est celle qui sera fermée, pas une de plus.
  const spaces = [...w.spaces]
  const r = await ouvrirDialogue({
    titre: `Supprimer « ${w.nom} » ?`,
    texte: texteSuppression(spaces.length),
    bouton: { libelle: 'Supprimer', danger: true }
  })
  if (!r) return
  const rep = await demanderWorkspace({ type: 'supprimer', id: w.id, spaces })
  if (!rep) return
  if (rep.afficher) afficherSpace(rep.afficher)
  else if (rep.etat.ouvert !== w.id) changer(() => {})
}

function menu(w: Workspace, x: number, y: number): void {
  const seul = (etat().workspaces?.liste.length ?? 0) < 2
  ouvrirMenu(
    x,
    y,
    [
      // Pas de « F2 » à côté : F2 renomme l'onglet de terminal (écart noté au bilan).
      { libelle: 'Renommer', icone: 'pencil', faire: () => void renommer(w) },
      { libelle: "Changer l'emoji", icone: 'smile', faire: () => void changerEmoji(w) },
      'separateur',
      {
        libelle: 'Supprimer',
        icone: 'trash-2',
        danger: true,
        inactif: seul,
        faire: () => void supprimer(w)
      }
    ],
    'Actions du workspace'
  )
}

function dessiner(): void {
  const e = etat()
  const ws = e.workspaces
  const explorateur = bouton('outil actif', 'Explorateur')
  explorateur.setAttribute('aria-pressed', 'true')
  explorateur.append(icone('files', 'currentColor', 18, 1.75))
  const recherche = bouton('outil', 'Rechercher dans le projet')
  recherche.append(icone('search', 'currentColor', 18, 1.75))
  const trait = document.createElement('span')
  trait.className = 'trait-workspaces'

  const etats = etatParSpace()
  const boutons = (ws?.liste ?? []).map((w) => {
    const b = bouton('workspace' + (w.id === ws!.ouvert ? ' ouvert' : ''), `Workspace ${w.nom}`)
    b.title = w.nom
    b.dataset['id'] = w.id
    b.textContent = w.emoji
    const urgent = etatDuWorkspace(ws!, w.id, etats)
    if (urgent) {
      const p = document.createElement('span')
      p.className = 'pastille-etat'
      p.style.background = COULEUR_ETAT[urgent]
      b.append(p)
    }
    b.onclick = () => void ouvrirWorkspace(w.id)
    b.oncontextmenu = (ev) => {
      ev.preventDefault()
      menu(w, ev.clientX, ev.clientY)
    }
    rendreGlissable(b, {
      axe: 'y',
      liste: () => [...nav().querySelectorAll<HTMLElement>('.workspace')],
      deposer: (index) => void demanderWorkspace({ type: 'deplacer', id: w.id, index })
    })
    return b
  })

  const espace = document.createElement('span')
  espace.className = 'espace'
  const plus = bouton('outil nouveau', 'Nouveau workspace')
  plus.title = 'Nouveau workspace'
  plus.append(icone('plus', 'currentColor', 18, 1.75))
  plus.onclick = () => void nouveauWorkspace()
  nav().replaceChildren(explorateur, recherche, trait, ...boutons, espace, plus)
}

let dernierVu: string | null = null

export function initWorkspaces(): void {
  surChangement(dessiner)
  // Le space affiché devient le dernier space vu de son workspace.
  surChangement(() => {
    const id = spaceAffiche()?.id ?? null
    if (!etat().workspaces || id === dernierVu) return
    dernierVu = id
    if (id) void window.berger.demander('berger:workspace', { type: 'space.vu', space: id })
  })
}
