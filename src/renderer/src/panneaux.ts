// L'onglet de terminal affiché : l'arbre des découpages dessiné en boîtes
// flexibles, un bandeau par panneau, le panneau qui a le clavier, les
// séparateurs qu'on tire, le menu du clic droit et les actions de panneau.
import {
  egaliserCoupure,
  feuilles,
  poidsDe,
  voisin,
  type Bloc,
  type Conteneur,
  type Noeud
} from '../../shared/arbre'
import { COULEUR_AGENT } from '../../shared/libelles'
import type { ActionClavier } from '../../shared/raccourcis'
import type { VueOnglet, VueSpace } from '../../shared/spaces'
import { changer, etat, ongletAffiche, spaceAffiche } from './etat'
import { icone } from './icones'
import { dialogueOuvert } from './dialogue'
import { ouvrirMenu } from './menus'
import { aLeClavier, donnerClavier, raisonArret, vueTerminal } from './terminal'

const zone = (): HTMLElement => document.getElementById('zone-terminaux')!
let signature = ''

// Le panneau qui a le clavier dans un onglet (le premier par défaut).
export function panneauClavier(onglet: VueOnglet): Bloc | null {
  const blocs = feuilles(onglet.racine)
  const id = etat().focus[onglet.id]
  return blocs.find((b) => b.id === id) ?? blocs[0] ?? null
}

function ongletTerminal(): { space: VueSpace; onglet: VueOnglet } | null {
  const space = spaceAffiche()
  const a = ongletAffiche()
  if (!space || !a || a.type !== 'terminal') return null
  const onglet = space.onglets.find((o) => o.id === a.id)
  return onglet ? { space, onglet } : null
}

// Le dossier où lancer un terminal à côté du panneau qui a le clavier.
export function dossierDuClavier(space: VueSpace, onglet: VueOnglet | null): string {
  const bloc = onglet ? panneauClavier(onglet) : null
  const adresse = bloc?.content?.terminal
  return (adresse && etat().vue.terminaux[adresse]?.cwd) || space.dossier
}

// La croix à droite du bandeau ferme le panneau (le clic sur le panneau l'a
// d'abord choisi) : elle reste là quand les clics droits vont au programme.
function croixPanneau(): HTMLElement {
  const b = document.createElement('button')
  b.className = 'fermer-panneau'
  b.title = 'Fermer le panneau (⇧⌘W)'
  b.setAttribute('aria-label', 'Fermer le panneau')
  b.append(icone('x', 'currentColor', 13))
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    void actionPanneau({ type: 'panneau.fermer' })
  })
  return b
}

function remplirBandeau(bandeau: HTMLElement, bloc: Bloc): void {
  const adresse = bloc.content?.terminal
  if (!adresse) {
    const nom = document.createElement('span')
    nom.className = 'programme'
    nom.textContent = 'Panneau de Herdr'
    const mod = document.createElement('span')
    mod.className = 'gris'
    mod.textContent = bloc.content?.mod ?? ''
    bandeau.replaceChildren(icone('puzzle', 'var(--gris-clair)'), nom, mod, croixPanneau())
    return
  }
  const t = etat().vue.terminaux[adresse]
  const couleur = t?.agent ? COULEUR_AGENT : 'var(--gris-clair)'
  const nom = document.createElement('span')
  nom.className = 'programme'
  nom.textContent = t?.programme.nom ?? adresse
  const dossier = document.createElement('span')
  dossier.className = 'gris'
  dossier.textContent = t?.dossier ?? ''
  bandeau.replaceChildren(
    icone(t?.programme.icone ?? 'terminal', couleur),
    nom,
    dossier,
    croixPanneau()
  )
}

function message(texte: string): HTMLElement {
  const m = document.createElement('div')
  m.className = 'message'
  m.textContent = texte
  return m
}

function choisirPanneau(onglet: string, panneau: string): void {
  if (etat().focus[onglet] === panneau) return
  changer((e) => (e.focus[onglet] = panneau))
}

function dessinerPanneau(onglet: VueOnglet, bloc: Bloc): HTMLElement {
  const p = document.createElement('div')
  p.className = 'panneau'
  p.dataset['panneau'] = bloc.id
  const bandeau = document.createElement('div')
  bandeau.className = 'bandeau'
  remplirBandeau(bandeau, bloc)
  const corps = document.createElement('div')
  corps.className = 'corps'
  const adresse = bloc.content?.terminal
  if (adresse) {
    const t = etat().vue.terminaux[adresse]
    const arret = raisonArret(adresse)
    if (!t || !t.vivant) corps.append(message('Terminal terminé'))
    else if (arret) corps.append(message(`Terminal injoignable (${arret})`))
    else corps.append(vueTerminal(adresse))
  }
  p.append(bandeau, corps)
  p.addEventListener('mousedown', () => choisirPanneau(onglet.id, bloc.id))
  p.addEventListener('focusin', () => choisirPanneau(onglet.id, bloc.id))
  p.addEventListener('contextmenu', (e) => {
    const t = adresse ? etat().vue.terminaux[adresse] : undefined
    // Les clics droits peuvent être laissés au programme ; Maj ouvre toujours le menu.
    if (t?.clicsDroitsAuProgramme && !e.shiftKey) return
    e.preventDefault()
    choisirPanneau(onglet.id, bloc.id)
    ouvrirMenu(e.clientX, e.clientY, [
      {
        libelle: 'Diviser à droite',
        raccourci: '⌘D',
        icone: 'columns-2',
        faire: () => actionPanneau({ type: 'panneau.diviser', sens: 'right' })
      },
      {
        libelle: 'Diviser en bas',
        raccourci: '⇧⌘D',
        icone: 'rows-2',
        faire: () => actionPanneau({ type: 'panneau.diviser', sens: 'down' })
      },
      {
        libelle: 'Agrandir le panneau',
        raccourci: '⇧⌘↵',
        icone: 'maximize-2',
        faire: () => actionPanneau({ type: 'panneau.agrandir' })
      },
      ...(adresse
        ? [
            {
              libelle: 'Envoyer les clics droits au terminal',
              icone: 'terminal',
              coche: !!t?.clicsDroitsAuProgramme,
              faire: () =>
                void window.berger.demander('berger:clics-droits', {
                  adresse,
                  auProgramme: !t?.clicsDroitsAuProgramme
                })
            }
          ]
        : []),
      'separateur',
      {
        libelle: 'Fermer le panneau',
        raccourci: '⇧⌘W',
        icone: 'x',
        faire: () => actionPanneau({ type: 'panneau.fermer' })
      }
    ])
  })
  return p
}

// Tirer la coupure entre deux enfants d'un conteneur : les poids changent à
// l'écran, et partent au core au relâchement.
function brancherCoupure(
  coupure: HTMLElement,
  boite: HTMLElement,
  conteneur: Conteneur,
  i: number,
  space: VueSpace,
  onglet: VueOnglet
): void {
  // Le double clic remet les deux panneaux de part et d'autre à égalité.
  coupure.addEventListener('dblclick', (ev) => {
    ev.preventDefault()
    void window.berger.demander('berger:structure', {
      type: 'panneau.poids',
      space: space.id,
      onglet: onglet.id,
      conteneur: conteneur.id,
      poids: egaliserCoupure(conteneur, i)
    })
  })
  coupure.addEventListener('mousedown', (ev) => {
    ev.preventDefault()
    const horizontal = conteneur.type === 'row'
    const enfants = [...boite.children].filter(
      (c) => !(c as HTMLElement).classList.contains('coupure')
    ) as HTMLElement[]
    const tailles = enfants.map((c) =>
      horizontal ? c.getBoundingClientRect().width : c.getBoundingClientRect().height
    )
    const total = conteneur.children.reduce((s, c) => s + poidsDe(c), 0)
    const depart = horizontal ? ev.clientX : ev.clientY
    const somme = tailles[i] + tailles[i + 1]
    let actuelles = [...tailles]
    let bouge = false
    const bouger = (m: MouseEvent): void => {
      bouge = true
      const d = (horizontal ? m.clientX : m.clientY) - depart
      const a = Math.min(somme - 40, Math.max(40, tailles[i] + d))
      actuelles = [...tailles]
      actuelles[i] = a
      actuelles[i + 1] = somme - a
      enfants.forEach((c, j) => (c.style.flexGrow = String(actuelles[j])))
    }
    const lacher = (): void => {
      window.removeEventListener('mousemove', bouger)
      window.removeEventListener('mouseup', lacher)
      // Un simple clic (ou le début d'un double clic) ne change rien.
      if (!bouge) return
      const px = actuelles.reduce((s, x) => s + x, 0) || 1
      const poids = actuelles.map((x) => Number(((x / px) * total).toFixed(4)))
      void window.berger.demander('berger:structure', {
        type: 'panneau.poids',
        space: space.id,
        onglet: onglet.id,
        conteneur: conteneur.id,
        poids
      })
    }
    window.addEventListener('mousemove', bouger)
    window.addEventListener('mouseup', lacher)
  })
}

function dessinerNoeud(n: Noeud, space: VueSpace, onglet: VueOnglet): HTMLElement {
  if (n.type === 'block') return dessinerPanneau(onglet, n)
  const boite = document.createElement('div')
  boite.className = `noeud ${n.type}`
  boite.dataset['id'] = n.id
  // Des poids dont la somme est sous 1 ne rempliraient pas la place : on les
  // ramène en proportions (sur 100).
  const total = (n.children ?? []).reduce((s, c) => s + poidsDe(c), 0) || 1
  ;(n.children ?? []).forEach((enfant, i) => {
    if (i > 0) {
      const coupure = document.createElement('div')
      coupure.className = 'coupure'
      brancherCoupure(coupure, boite, n, i - 1, space, onglet)
      boite.append(coupure)
    }
    const el = dessinerNoeud(enfant, space, onglet)
    el.style.flex = `${(poidsDe(enfant) / total) * 100} 1 0`
    boite.append(el)
  })
  return boite
}

function adressesAffichees(onglet: VueOnglet): string[] {
  const blocs = feuilles(onglet.racine)
  const agrandi = blocs.find((b) => b.id === etat().agrandi[onglet.id])
  return (agrandi ? [agrandi] : blocs).flatMap((b) =>
    b.content?.terminal ? [b.content.terminal] : []
  )
}

export function adressesDeLOngletAffiche(): Set<string> {
  const o = ongletTerminal()
  return new Set(o ? adressesAffichees(o.onglet) : [])
}

let dernierClavier = ''

export function dessinerOnglet(space: VueSpace, onglet: VueOnglet): void {
  const e = etat()
  const blocs = feuilles(onglet.racine)
  const agrandi = blocs.find((b) => b.id === e.agrandi[onglet.id])
  const vivants = blocs.map((b) => {
    const a = b.content?.terminal
    return a ? `${a}:${e.vue.terminaux[a]?.vivant ? 1 : 0}:${raisonArret(a) ?? ''}` : ''
  })
  const sig = JSON.stringify([space.id, onglet.id, onglet.racine, agrandi?.id, vivants])
  if (sig !== signature) {
    signature = sig
    const racine = agrandi
      ? dessinerPanneau(onglet, agrandi)
      : dessinerNoeud(onglet.racine, space, onglet)
    racine.style.flex = '1 1 0'
    zone().replaceChildren(racine)
  } else {
    for (const p of zone().querySelectorAll<HTMLElement>('.panneau')) {
      const bloc = blocs.find((b) => b.id === p.dataset['panneau'])
      if (bloc) remplirBandeau(p.querySelector('.bandeau')!, bloc)
    }
  }
  const clavier = panneauClavier(onglet)
  for (const p of zone().querySelectorAll<HTMLElement>('.panneau'))
    p.classList.toggle('clavier', p.dataset['panneau'] === clavier?.id)
  // Le clavier va au terminal du panneau choisi quand ce choix change.
  const cle = `${onglet.id}/${clavier?.id}`
  const adresse = clavier?.content?.terminal
  if (cle !== dernierClavier && adresse) {
    const actif = document.activeElement
    // Un dialogue ouvert ou un champ de saisie gardent le clavier.
    const occupe = dialogueOuvert() || (actif instanceof HTMLInputElement && actif.id !== 'filtre')
    if (!occupe && !aLeClavier(adresse)) donnerClavier(adresse)
    dernierClavier = cle
  }
}

export function viderZoneTerminaux(): void {
  signature = ''
  dernierClavier = ''
  zone().replaceChildren()
}

// Après un changement d'onglet, le clavier repart au panneau choisi.
export function oublierClavier(): void {
  dernierClavier = ''
}

export async function actionPanneau(
  a: Extract<ActionClavier, { type: `panneau.${string}` }>
): Promise<void> {
  const o = ongletTerminal()
  if (!o) return
  const { space, onglet } = o
  const bloc = panneauClavier(onglet)
  if (!bloc) return
  switch (a.type) {
    case 'panneau.diviser': {
      const r = await window.berger.demander<{ panneau?: string; erreur?: string }>(
        'berger:structure',
        {
          type: 'panneau.diviser',
          space: space.id,
          onglet: onglet.id,
          panneau: bloc.id,
          sens: a.sens,
          dossier: dossierDuClavier(space, onglet)
        }
      )
      if (r.panneau) {
        const nouveau = r.panneau
        changer((e) => {
          e.focus[onglet.id] = nouveau
          delete e.agrandi[onglet.id]
        })
      }
      return
    }
    case 'panneau.fermer': {
      const suivant =
        (['left', 'up', 'right', 'down'] as const)
          .map((d) => voisin(onglet.racine, bloc.id, d))
          .find((x) => x !== null) ?? null
      // Le seul panneau du seul onglet : le fermer ferme le space, on demande.
      if (!suivant && space.onglets.length === 1) {
        const r = await window.berger.demander<number>('berger:question', {
          message: `Fermer le dernier panneau ferme aussi le space « ${space.nom} ». Continuer ?`,
          boutons: ['Fermer', 'Annuler'],
          defaut: 1,
          annuler: 1
        })
        if (r !== 0) return
      }
      if (suivant) changer((e) => (e.focus[onglet.id] = suivant))
      await window.berger.demander('berger:structure', {
        type: 'panneau.fermer',
        space: space.id,
        onglet: onglet.id,
        panneau: bloc.id,
        terminal: bloc.content?.terminal
      })
      return
    }
    case 'panneau.agrandir':
      changer((e) => {
        if (e.agrandi[onglet.id] === bloc.id) delete e.agrandi[onglet.id]
        else e.agrandi[onglet.id] = bloc.id
      })
      return
    case 'panneau.aller': {
      const v = voisin(onglet.racine, bloc.id, a.direction)
      if (v)
        changer((e) => {
          e.focus[onglet.id] = v
          if (e.agrandi[onglet.id]) e.agrandi[onglet.id] = v
        })
      return
    }
    case 'panneau.echanger': {
      const v = voisin(onglet.racine, bloc.id, a.direction)
      if (v)
        await window.berger.demander('berger:structure', {
          type: 'panneau.echanger',
          space: space.id,
          onglet: onglet.id,
          a: bloc.id,
          b: v
        })
      return
    }
  }
}
