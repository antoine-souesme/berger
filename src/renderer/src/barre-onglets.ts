// La barre d'onglets : les onglets de terminaux du space affiché, un trait,
// puis les onglets de fichiers. Rien d'autre.
import { apresFermeture, fermerFichier, memeOnglet, type RefOnglet } from '../../shared/onglets'
import { COULEUR_ETAT } from '../../shared/libelles'
import { terminauxDeLArbre, type VueOnglet, type VueSpace } from '../../shared/spaces'
import { changer, etat, ongletAffiche, ongletsAffiches, spaceAffiche } from './etat'
import { icone } from './icones'
import { ouvrirMenu } from './menus'
import { dossierDuClavier, oublierClavier } from './panneaux'

const barreEl = (): HTMLElement => document.getElementById('barre-onglets')!
let enRenommage: string | null = null
// Fermer un onglet de fichier (avec la question s'il est modifié) : branché
// par l'éditeur ; rend faux si Antoine annule.
let fermerFichierAvecQuestion: (chemin: string) => Promise<boolean> = async () => true

export function brancherFichiers(f: (chemin: string) => Promise<boolean>): void {
  fermerFichierAvecQuestion = f
}

export function afficherOnglet(o: RefOnglet): void {
  oublierClavier()
  changer((e) => (e.onglet = o))
}

function ongletTerminal(space: VueSpace, onglet: VueOnglet, actif: boolean): HTMLElement {
  const el = document.createElement('div')
  el.className = 'onglet' + (actif ? ' actif' : '')
  const ref: RefOnglet = { type: 'terminal', id: onglet.id }
  el.append(
    onglet.agent
      ? icone('bot', COULEUR_ETAT[onglet.agent])
      : icone('terminal', actif ? '#a59f85' : '#75715e')
  )
  if (enRenommage === onglet.id) {
    const champ = document.createElement('input')
    champ.className = 'renommage'
    champ.value = onglet.nom
    champ.spellcheck = false
    let fini = false
    const finir = (valider: boolean): void => {
      if (fini) return
      fini = true
      enRenommage = null
      if (valider)
        void window.berger.demander('berger:structure', {
          type: 'onglet.renommer',
          space: space.id,
          onglet: onglet.id,
          nom: champ.value
        })
      oublierClavier()
      changer(() => {})
    }
    champ.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') finir(true)
      else if (e.key === 'Escape') finir(false)
    })
    champ.addEventListener('blur', () => finir(false))
    el.append(champ)
    requestAnimationFrame(() => {
      champ.focus()
      champ.select()
    })
  } else {
    const nom = document.createElement('span')
    nom.textContent = onglet.nom
    el.append(nom)
  }
  el.addEventListener('click', () => afficherOnglet(ref))
  el.addEventListener('auxclick', (e) => {
    if (e.button === 1) void fermerOnglet(ref)
  })
  el.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault()
  })
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    ouvrirMenu(e.clientX, e.clientY, [
      {
        libelle: 'Renommer',
        raccourci: 'F2',
        icone: 'pencil',
        faire: () => {
          afficherOnglet(ref)
          renommerOngletEnPlace()
        }
      },
      {
        libelle: 'Nouvel onglet',
        raccourci: '⌘T',
        icone: 'plus',
        faire: () => void nouvelOnglet()
      },
      'separateur',
      { libelle: 'Fermer', raccourci: '⌘W', icone: 'x', faire: () => void fermerOnglet(ref) }
    ])
  })
  return el
}

function ongletFichier(chemin: string, actif: boolean): HTMLElement {
  const el = document.createElement('div')
  el.className = 'onglet' + (actif ? ' actif' : '')
  el.title = chemin
  const ref: RefOnglet = { type: 'fichier', chemin }
  const nom = document.createElement('span')
  nom.textContent = chemin.slice(chemin.lastIndexOf('/') + 1)
  const fermer = document.createElement('span')
  const modifie = etat().modifies.has(chemin)
  fermer.className = 'fermer' + (modifie ? ' modifie' : '')
  if (modifie) {
    fermer.textContent = '●'
    fermer.style.fontSize = '10px'
  } else fermer.append(icone('x', 'currentColor', 12))
  fermer.addEventListener('click', (e) => {
    e.stopPropagation()
    void fermerOnglet(ref)
  })
  el.append(icone('file', '#a59f85'), nom, fermer)
  el.addEventListener('click', () => afficherOnglet(ref))
  el.addEventListener('auxclick', (e) => {
    if (e.button === 1) void fermerOnglet(ref)
  })
  el.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault()
  })
  return el
}

export function dessinerBarre(): void {
  const space = spaceAffiche()
  const actif = ongletAffiche()
  const enfants: HTMLElement[] = []
  for (const o of space?.onglets ?? [])
    enfants.push(ongletTerminal(space!, o, memeOnglet(actif, { type: 'terminal', id: o.id })))
  // Workspace vide : aucun onglet, pas même les fichiers ouverts.
  const fichiers = space ? etat().fichiers : []
  if (fichiers.length) {
    const trait = document.createElement('div')
    trait.className = 'trait-onglets'
    enfants.push(trait)
  }
  for (const chemin of fichiers)
    enfants.push(ongletFichier(chemin, memeOnglet(actif, { type: 'fichier', chemin })))
  barreEl().replaceChildren(...enfants)
  barreEl().querySelector('.onglet.actif')?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
}

export function renommerOngletEnPlace(): void {
  const a = ongletAffiche()
  if (!a || a.type !== 'terminal') return
  enRenommage = a.id
  changer(() => {})
}

export async function nouvelOnglet(): Promise<void> {
  const space = spaceAffiche()
  if (!space) return
  const a = ongletAffiche()
  const actuel = a?.type === 'terminal' ? space.onglets.find((o) => o.id === a.id) : undefined
  const r = await window.berger.demander<{ onglet?: string; panneau?: string; erreur?: string }>(
    'berger:structure',
    { type: 'onglet.nouveau', space: space.id, dossier: dossierDuClavier(space, actuel ?? null) }
  )
  if (r.onglet && r.panneau) {
    const { onglet, panneau } = r
    afficherOnglet({ type: 'terminal', id: onglet })
    changer((e) => (e.focus[onglet] = panneau))
  }
}

export async function fermerOnglet(ref: RefOnglet): Promise<void> {
  const liste = ongletsAffiches()
  const suivant = apresFermeture(liste, ref)
  const etaitAffiche = memeOnglet(ongletAffiche(), ref)
  if (ref.type === 'fichier') {
    if (!(await fermerFichierAvecQuestion(ref.chemin))) return
    changer((e) => {
      e.fichiers = fermerFichier(e.fichiers, ref.chemin)
      e.modifies.delete(ref.chemin)
      if (etaitAffiche) e.onglet = suivant
    })
    return
  }
  const space = spaceAffiche()
  const onglet = space?.onglets.find((o) => o.id === ref.id)
  if (!space || !onglet) return
  const dernier = space.onglets.length === 1
  if (dernier) {
    const r = await window.berger.demander<number>('berger:question', {
      message: `Fermer le dernier onglet ferme aussi le space « ${space.nom} ». Continuer ?`,
      boutons: ['Fermer', 'Annuler'],
      defaut: 1,
      annuler: 1
    })
    if (r !== 0) return
  }
  if (etaitAffiche) {
    oublierClavier()
    changer((e) => (e.onglet = suivant))
  }
  const terminaux = terminauxDeLArbre(onglet.racine)
  await window.berger.demander('berger:structure', {
    type: 'onglet.fermer',
    space: space.id,
    onglet: onglet.id,
    terminaux,
    dernier
  })
}

export function fermerOngletAffiche(): Promise<void> {
  const a = ongletAffiche()
  return a ? fermerOnglet(a) : Promise.resolve()
}
