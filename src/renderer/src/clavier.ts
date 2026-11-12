// Les raccourcis de Berger : un écouteur en phase de capture, avant le
// terminal et l'éditeur. La table et le partage des touches sont dans
// `src/shared/raccourcis.ts`.
import { agentVoisin } from '../../shared/agents'
import { ongletN, ongletVoisin, type PlaceAgent } from '../../shared/onglets'
import { actionDe, type ActionClavier, type Cible } from '../../shared/raccourcis'
import {
  afficherSpace,
  changer,
  ongletAffiche,
  ongletsAffiches,
  rendreVisible,
  spaceAffiche,
  spacesVisiblesUi
} from './etat'
import {
  afficherOnglet,
  fermerOngletAffiche,
  nouvelOnglet,
  renommerOngletEnPlace
} from './barre-onglets'
import { lignesAgents, nouveauSpace, renommerSpaceEnPlace } from './colonne'
import { dialogueOuvert } from './dialogue'
import { menuOuvert } from './menus'
import { ouvrirRechercheFichiers, rechercheOuverte } from './recherche-fichiers'
import { basculerRetourLigne, chercher, enregistrer, fichierAffiche } from './editeur'
import { basculerColonne } from './fenetre'
import { basculerExplorateur } from './explorateur'
import {
  collerIci,
  copierCheminChoisi,
  copierChoisis,
  corbeilleChoisis,
  renommerChoisi
} from './ranger'
import { actionPanneau, oublierClavier, panneauClavier } from './panneaux'
import { tableActuelle } from './table-raccourcis'

// Afficher le space, l'onglet et le panneau d'un terminal, et lui donner le clavier.
export function choisirPlace(p: PlaceAgent): void {
  oublierClavier()
  rendreVisible(p.space)
  changer((e) => {
    e.space = p.space
    e.onglet = { type: 'terminal', id: p.onglet }
    e.focus[p.onglet] = p.panneau
  })
}

function cibleDe(el: Element | null): Cible {
  if (el?.closest('#editeur')) return 'editeur'
  if (el?.closest('#arbre') && el.tagName !== 'INPUT') return 'explorateur'
  if (el?.closest('.xterm')) return 'terminal'
  return 'autre'
}

// Le terminal qui a le clavier dans l'onglet affiché (pour « agent suivant »).
function terminalActuel(): string | null {
  const s = spaceAffiche()
  const a = ongletAffiche()
  if (!s || a?.type !== 'terminal') return null
  const onglet = s.onglets.find((o) => o.id === a.id)
  return (onglet && panneauClavier(onglet)?.content?.terminal) ?? null
}

// L'ouverture des réglages (branchée par la fenêtre des réglages).
let surOuvrirReglages: () => void = () => {}
export function brancherOuvrirReglages(f: () => void): void {
  surOuvrirReglages = f
}

function executer(a: ActionClavier): void {
  switch (a.type) {
    case 'onglet.nouveau':
      void nouvelOnglet()
      return
    case 'onglet.fermer':
      void fermerOngletAffiche()
      return
    case 'onglet.voisin': {
      const o = ongletVoisin(ongletsAffiches(), ongletAffiche(), a.pas)
      if (o) afficherOnglet(o)
      return
    }
    case 'onglet.n': {
      const o = ongletN(ongletsAffiches(), a.n)
      if (o) afficherOnglet(o)
      return
    }
    case 'space.n': {
      const s = spacesVisiblesUi()[a.n - 1]
      if (s) afficherSpace(s.id)
      return
    }
    case 'space.nouveau':
      void nouveauSpace()
      return
    case 'space.voisin': {
      const liste = spacesVisiblesUi()
      if (!liste.length) return
      const i = liste.findIndex((s) => s.id === spaceAffiche()?.id)
      afficherSpace(liste[(i + a.pas + liste.length) % liste.length].id)
      return
    }
    case 'agent.voisin': {
      const p = agentVoisin(lignesAgents(), terminalActuel(), a.pas)
      if (p) choisirPlace(p)
      return
    }
    case 'panneau.diviser':
    case 'panneau.fermer':
    case 'panneau.agrandir':
    case 'panneau.aller':
    case 'panneau.echanger':
      void actionPanneau(a)
      return
    case 'onglet.renommer':
      renommerOngletEnPlace()
      return
    case 'space.renommer':
      renommerSpaceEnPlace()
      return
    case 'colonne.basculer':
      basculerColonne()
      return
    case 'zoom':
      window.berger.envoyer('berger:zoom', { pas: a.pas })
      return
    case 'fichier.enregistrer': {
      const f = fichierAffiche()
      if (f) void enregistrer(f)
      return
    }
    case 'fichier.chercher':
      if (fichierAffiche()) chercher()
      return
    case 'explorateur.basculer':
      basculerExplorateur()
      return
    case 'fichier.rechercher':
      ouvrirRechercheFichiers()
      return
    case 'explorateur.renommer':
      renommerChoisi()
      return
    case 'explorateur.copier':
      void copierChoisis()
      return
    case 'explorateur.coller':
      void collerIci()
      return
    case 'explorateur.copierChemin':
      copierCheminChoisi()
      return
    case 'explorateur.corbeille':
      void corbeilleChoisis()
      return
    case 'editeur.retourLigne':
      basculerRetourLigne()
      return
    case 'reglages.ouvrir':
      surOuvrirReglages()
      return
    case 'rien':
      return
  }
}

export function brancherClavier(): void {
  window.addEventListener(
    'keydown',
    (ev) => {
      // Un dialogue ouvert garde le clavier pour lui (voir dialogue.ts).
      if (dialogueOuvert() || rechercheOuverte() || menuOuvert()) return
      const action = actionDe(ev, cibleDe(document.activeElement), tableActuelle())
      if (!action) return
      ev.preventDefault()
      ev.stopPropagation()
      if (!ev.repeat || action.type.endsWith('voisin')) executer(action)
    },
    true
  )
}
