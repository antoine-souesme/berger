// La barre d'onglets : les onglets de terminaux du space affiché, un trait,
// puis les onglets de fichiers. Rien d'autre.
import { apresFermeture, memeOnglet, type RefOnglet } from '../../shared/onglets'
import { COULEUR_ETAT } from '../../shared/libelles'
import {
  desepingler,
  epingler,
  estImage,
  fermerFichierWs,
  libellesOnglets,
  type OngletFichier
} from '../../shared/etat-fichiers'
import { iconeFichier } from '../../shared/icones-fichiers'
import { terminauxDeLArbre, type VueOnglet, type VueSpace } from '../../shared/spaces'
import {
  changer,
  changerFichiers,
  etat,
  fichiersDuWorkspace,
  ongletAffiche,
  ongletsAffiches,
  spaceAffiche
} from './etat'
import { enregistrer } from './editeur'
import { icone, iconeMaterial } from './icones'
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

// Un onglet de fichier (maquette explorateur.html d) : icône Material, nom,
// dossier en gris quand deux noms se ressemblent ; à droite la punaise d'un
// épinglé, le point d'un fichier non enregistré (il gagne), sinon la croix.
function ongletFichier(
  o: OngletFichier,
  libelle: { nom: string; dossier: string },
  actif: boolean
): HTMLElement {
  const { chemin, epingle } = o
  const el = document.createElement('div')
  el.className = 'onglet onglet-fichier' + (actif ? ' actif' : '') + (epingle ? ' epingle' : '')
  el.title = chemin
  el.dataset['chemin'] = chemin
  const ref: RefOnglet = { type: 'fichier', chemin }
  const nom = document.createElement('span')
  nom.textContent = libelle.nom
  el.append(iconeMaterial(iconeFichier(libelle.nom, false)), nom)
  if (libelle.dossier) {
    const d = document.createElement('span')
    d.className = 'dossier-onglet'
    d.textContent = libelle.dossier
    el.append(d)
  }
  const bout = document.createElement('span')
  const modifie = etat().modifies.has(chemin)
  bout.className = 'fermer' + (modifie ? ' modifie' : epingle ? ' punaise' : '')
  if (modifie) {
    bout.textContent = '●'
    bout.style.fontSize = '10px'
  } else if (epingle) {
    bout.append(icone('pin', 'currentColor', 12))
    bout.title = 'Désépingler'
  } else bout.append(icone('x', 'currentColor', 12))
  bout.addEventListener('click', (e) => {
    e.stopPropagation()
    if (epingle && !modifie) changerFichiers((x, ws) => desepingler(x, ws, chemin))
    else void fermerOnglet(ref)
  })
  el.append(bout)
  el.addEventListener('click', () => afficherOnglet(ref))
  el.addEventListener('auxclick', (e) => {
    if (e.button === 1) void fermerOnglet(ref)
  })
  el.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault()
  })
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    ouvrirMenu(
      e.clientX,
      e.clientY,
      [
        epingle
          ? {
              libelle: 'Désépingler',
              icone: 'pin-off',
              faire: () => changerFichiers((x, ws) => desepingler(x, ws, chemin))
            }
          : {
              libelle: 'Épingler',
              icone: 'pin',
              faire: () => changerFichiers((x, ws) => epingler(x, ws, chemin))
            },
        {
          libelle: 'Enregistrer',
          raccourci: '⌘S',
          icone: 'save',
          inactif: estImage(chemin),
          faire: () => void enregistrer(chemin)
        },
        'separateur',
        { libelle: 'Fermer', raccourci: '⌘W', icone: 'x', faire: () => void fermerOnglet(ref) }
      ],
      "Actions de l'onglet"
    )
  })
  return el
}

// Les terminaux restent fixes à gauche ; les fichiers défilent à la molette.
// Les deux conteneurs sont gardés d'un dessin à l'autre pour ne pas perdre le
// défilement.
let conteneurs: { terminaux: HTMLElement; trait: HTMLElement; fichiers: HTMLElement } | null = null
let dernierActif = ''

function lesConteneurs(): NonNullable<typeof conteneurs> {
  if (conteneurs) return conteneurs
  const terminaux = document.createElement('div')
  terminaux.className = 'onglets-terminaux'
  const trait = document.createElement('div')
  trait.className = 'trait-onglets'
  const fichiers = document.createElement('div')
  fichiers.className = 'onglets-fichiers'
  fichiers.addEventListener(
    'wheel',
    (e) => {
      const pas = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!pas || fichiers.scrollWidth <= fichiers.clientWidth) return
      e.preventDefault()
      fichiers.scrollLeft += pas
    },
    { passive: false }
  )
  barreEl().replaceChildren(terminaux, trait, fichiers)
  conteneurs = { terminaux, trait, fichiers }
  return conteneurs
}

// Fait voir l'onglet de fichier actif sans faire défiler autre chose que la
// liste des fichiers (scrollIntoView décalait toute la fenêtre).
function montrerActif(liste: HTMLElement): void {
  const a = liste.querySelector<HTMLElement>('.onglet.actif')
  if (!a) return
  const marge = 4
  if (a.offsetLeft < liste.scrollLeft) liste.scrollLeft = a.offsetLeft - marge
  else if (a.offsetLeft + a.offsetWidth > liste.scrollLeft + liste.clientWidth)
    liste.scrollLeft = a.offsetLeft + a.offsetWidth - liste.clientWidth + marge
}

export function dessinerBarre(): void {
  const space = spaceAffiche()
  const actif = ongletAffiche()
  const c = lesConteneurs()
  c.terminaux.replaceChildren(
    ...(space?.onglets ?? []).map((o) =>
      ongletTerminal(space!, o, memeOnglet(actif, { type: 'terminal', id: o.id }))
    )
  )
  // Workspace vide : aucun onglet, pas même les fichiers ouverts.
  const fichiers = space ? fichiersDuWorkspace() : []
  c.trait.hidden = fichiers.length === 0
  const libelles = libellesOnglets(fichiers.map((o) => o.chemin))
  c.fichiers.replaceChildren(
    ...fichiers.map((o) =>
      ongletFichier(
        o,
        libelles.get(o.chemin)!,
        memeOnglet(actif, { type: 'fichier', chemin: o.chemin })
      )
    )
  )
  const cle = JSON.stringify(actif) + fichiers.length
  if (cle !== dernierActif) {
    dernierActif = cle
    montrerActif(c.fichiers)
  }
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
    changerFichiers((x, ws) => fermerFichierWs(x, ws, ref.chemin))
    changer((e) => {
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
