// L'état de la fenêtre, seule source de vérité de l'interface. Chaque
// changement passe par `changer` : on redessine à la prochaine image et on
// envoie au processus principal ce qu'il faut retenir.
import { ETAT_PAR_DEFAUT, type EtatFenetre } from '../../shared/etat-fenetre'
import { barre, memeOnglet, type RefOnglet } from '../../shared/onglets'
import {
  ongletsFichiers,
  ouvrirFichiers,
  type EtatFichiers,
  type OngletFichier
} from '../../shared/etat-fichiers'
import { VUE_VIDE, type Vue, type VueSpace } from '../../shared/spaces'
import {
  ouvrir,
  spacesVisibles,
  workspaceDe,
  type EtatWorkspaces,
  type Workspace
} from '../../shared/workspaces'

export type EtatUi = EtatFenetre & {
  vue: Vue
  connecte: boolean
  focus: Record<string, string> // onglet → panneau qui a le clavier
  agrandi: Record<string, string> // onglet → panneau agrandi
  modifies: Set<string> // fichiers non enregistrés
  ongletParSpace: Record<string, RefOnglet> // dernier onglet affiché de chaque space
  workspaces: EtatWorkspaces | null // null tant que le processus principal ne les a pas lus
  fichiersWs: EtatFichiers | null // fichiers de chaque workspace ; null tant que non lus
}

const e: EtatUi = {
  ...structuredClone(ETAT_PAR_DEFAUT),
  vue: VUE_VIDE,
  connecte: false,
  focus: {},
  agrandi: {},
  modifies: new Set(),
  ongletParSpace: {},
  workspaces: null,
  fichiersWs: null
}

const ecouteurs: ((e: EtatUi) => void)[] = []
let prevu = false
let charge = false
// Le dernier état des fichiers envoyé au processus principal.
let fichiersRetenus: EtatFichiers | null = null

export function etat(): EtatUi {
  return e
}

export function surChangement(f: (e: EtatUi) => void): void {
  ecouteurs.push(f)
}

function retenir(): void {
  if (e.fichiersWs && e.fichiersWs !== fichiersRetenus) {
    fichiersRetenus = e.fichiersWs
    window.berger.envoyer('berger:retenir-fichiers', e.fichiersWs)
  }
  if (!charge) return
  const a = ongletAffiche()
  window.berger.envoyer('berger:retenir', {
    largeurs: e.largeurs,
    colonneMasquee: e.colonneMasquee,
    space: spaceAffiche()?.id ?? e.space,
    onglet: a ?? e.onglet,
    explorateurMasque: e.explorateurMasque,
    triAgents: e.triAgents,
    retourLigne: e.retourLigne
  } satisfies EtatFenetre)
}

export function redessiner(): void {
  if (prevu) return
  prevu = true
  requestAnimationFrame(() => {
    prevu = false
    for (const f of ecouteurs) f(e)
  })
}

export function changer(f: (e: EtatUi) => void): void {
  f(e)
  const s = spaceAffiche()
  const a = ongletAffiche()
  if (s && a) e.ongletParSpace[s.id] = a
  redessiner()
  retenir()
}

// L'état des fichiers relu du processus principal (rien n'est retenu avant).
export function appliquerFichiersRetenus(f: EtatFichiers): void {
  e.fichiersWs = f
  fichiersRetenus = f
  redessiner()
}

// L'état retenu est appliqué une fois relu ; avant, rien n'est retenu
// (sinon on écraserait le fichier avec les valeurs par défaut).
export function appliquerEtatRetenu(retenu: EtatFenetre): void {
  Object.assign(e, structuredClone(retenu))
  if (retenu.space && retenu.onglet) e.ongletParSpace[retenu.space] = retenu.onglet
  charge = true
  redessiner()
}

// Les spaces du workspace ouvert dans son ordre, puis ceux rangés nulle part.
// Tant que les workspaces ne sont pas lus : tous.
export function spacesVisiblesUi(): VueSpace[] {
  if (!e.workspaces) return e.vue.spaces
  const parId = new Map(e.vue.spaces.map((s) => [s.id, s]))
  return spacesVisibles(e.workspaces, [...parId.keys()]).map((id) => parId.get(id)!)
}

export function workspaceOuvert(): Workspace | null {
  const w = e.workspaces
  return w ? (w.liste.find((x) => x.id === w.ouvert) ?? w.liste[0] ?? null) : null
}

// Le space retenu s'il est visible, sinon le premier visible, sinon aucun
// (workspace vide).
export function spaceAffiche(): VueSpace | null {
  const visibles = spacesVisiblesUi()
  return visibles.find((s) => s.id === e.space) ?? visibles[0] ?? null
}

type ReponseWorkspace = { etat: EtatWorkspaces; afficher: string | null } | { erreur: string }

// Une demande au processus principal ; rend sa réponse, null en cas d'échec.
export async function demanderWorkspace(
  d: object
): Promise<{ etat: EtatWorkspaces; afficher: string | null } | null> {
  const r = await window.berger.demander<ReponseWorkspace>('berger:workspace', d)
  if ('erreur' in r) return null
  changer((x) => (x.workspaces = r.etat))
  return r
}

// Ouvrir un workspace : Berger rouvre le dernier space qu'on y avait choisi.
export async function ouvrirWorkspace(id: string): Promise<void> {
  const r = await demanderWorkspace({ type: 'ouvrir', id })
  if (!r) return
  if (r.afficher) afficherSpace(r.afficher)
  else changer((x) => (x.space = null))
}

// Les onglets de fichiers du workspace ouvert : épinglés, puis ouverts.
export function fichiersDuWorkspace(): OngletFichier[] {
  const w = workspaceOuvert()
  return w && e.fichiersWs ? ongletsFichiers(e.fichiersWs, w.id) : []
}

// Change l'état des fichiers du workspace ouvert (rien sans workspace ouvert).
export function changerFichiers(f: (x: EtatFichiers, ws: string) => EtatFichiers): void {
  const w = workspaceOuvert()
  if (!w || !e.fichiersWs) return
  const avant = e.fichiersWs
  const apres = f(avant, w.id)
  if (apres !== avant) changer((x) => (x.fichiersWs = apres))
}

// Ouvre des fichiers dans le workspace ouvert et affiche le dernier.
export function ouvrirChemins(chemins: string[]): void {
  if (!chemins.length) return
  changerFichiers((x, ws) => ouvrirFichiers(x, ws, chemins))
  if (!workspaceOuvert() || !e.fichiersWs) return
  changer((x) => (x.onglet = { type: 'fichier', chemin: chemins[chemins.length - 1] }))
}

// Workspace vide : aucun onglet (les fichiers ouverts reviennent avec un space).
export function ongletsAffiches(): RefOnglet[] {
  const s = spaceAffiche()
  return s
    ? barre(
        s.onglets,
        fichiersDuWorkspace().map((o) => o.chemin)
      )
    : []
}

export function ongletAffiche(): RefOnglet | null {
  const liste = ongletsAffiches()
  if (e.onglet && liste.some((o) => memeOnglet(o, e.onglet))) return e.onglet
  const s = spaceAffiche()
  const retenu = s ? e.ongletParSpace[s.id] : undefined
  if (retenu && liste.some((o) => memeOnglet(o, retenu))) return retenu
  return liste[0] ?? null
}

// Un space qui n'est pas dans le workspace ouvert : on ouvre le sien.
export function rendreVisible(id: string): void {
  const w = e.workspaces
  if (!w || spacesVisiblesUi().some((s) => s.id === id)) return
  const sien = workspaceDe(w, id)
  if (!sien) return
  e.workspaces = ouvrir(w, sien).etat
  void window.berger.demander('berger:workspace', { type: 'ouvrir', id: sien })
}

// Afficher un space : on revient sur son dernier onglet de terminal affiché.
export function afficherSpace(id: string): void {
  rendreVisible(id)
  changer((x) => {
    x.space = id
    const retenu = x.ongletParSpace[id]
    x.onglet = retenu && retenu.type === 'terminal' ? retenu : null
  })
}
