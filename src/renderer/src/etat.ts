// L'état de la fenêtre, seule source de vérité de l'interface. Chaque
// changement passe par `changer` : on redessine à la prochaine image et on
// envoie au processus principal ce qu'il faut retenir.
import { ETAT_PAR_DEFAUT, type EtatFenetre } from '../../shared/etat-fenetre'
import { barre, memeOnglet, type RefOnglet } from '../../shared/onglets'
import { VUE_VIDE, type Vue, type VueSpace } from '../../shared/spaces'

export type EtatUi = EtatFenetre & {
  vue: Vue
  connecte: boolean
  focus: Record<string, string> // onglet → panneau qui a le clavier
  agrandi: Record<string, string> // onglet → panneau agrandi
  modifies: Set<string> // fichiers non enregistrés
  ongletParSpace: Record<string, RefOnglet> // dernier onglet affiché de chaque space
}

const e: EtatUi = {
  ...structuredClone(ETAT_PAR_DEFAUT),
  vue: VUE_VIDE,
  connecte: false,
  focus: {},
  agrandi: {},
  modifies: new Set(),
  ongletParSpace: {}
}

const ecouteurs: ((e: EtatUi) => void)[] = []
let prevu = false
let charge = false

export function etat(): EtatUi {
  return e
}

export function surChangement(f: (e: EtatUi) => void): void {
  ecouteurs.push(f)
}

function retenir(): void {
  if (!charge) return
  const a = ongletAffiche()
  window.berger.envoyer('berger:retenir', {
    largeurs: e.largeurs,
    colonneMasquee: e.colonneMasquee,
    space: spaceAffiche()?.id ?? e.space,
    onglet: a ?? e.onglet,
    fichiers: e.fichiers
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

// L'état retenu est appliqué une fois relu ; avant, rien n'est retenu
// (sinon on écraserait le fichier avec les valeurs par défaut).
export function appliquerEtatRetenu(retenu: EtatFenetre): void {
  Object.assign(e, structuredClone(retenu))
  if (retenu.space && retenu.onglet) e.ongletParSpace[retenu.space] = retenu.onglet
  charge = true
  redessiner()
}

export function spaceAffiche(): VueSpace | null {
  return e.vue.spaces.find((s) => s.id === e.space) ?? e.vue.spaces[0] ?? null
}

export function ongletsAffiches(): RefOnglet[] {
  return barre(spaceAffiche()?.onglets ?? [], e.fichiers)
}

export function ongletAffiche(): RefOnglet | null {
  const liste = ongletsAffiches()
  if (e.onglet && liste.some((o) => memeOnglet(o, e.onglet))) return e.onglet
  const s = spaceAffiche()
  const retenu = s ? e.ongletParSpace[s.id] : undefined
  if (retenu && liste.some((o) => memeOnglet(o, retenu))) return retenu
  return liste[0] ?? null
}

// Afficher un space : on revient sur son dernier onglet de terminal affiché.
export function afficherSpace(id: string): void {
  changer((x) => {
    x.space = id
    const retenu = x.ongletParSpace[id]
    x.onglet = retenu && retenu.type === 'terminal' ? retenu : null
  })
}
