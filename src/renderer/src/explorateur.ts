// L'explorateur (maquettes vue-principale.html et explorateur.html) : une
// racine par space du workspace ouvert, puis les dossiers ajoutés à la main.
// Les dossiers se lisent un par un quand on les déplie ; les couleurs git et
// les changements du disque arrivent du processus principal.
import {
  ajouterDossier,
  basculerDeplie,
  basculerRacine,
  deWorkspace,
  pourVisionneuse,
  racines,
  toutReplier
} from '../../shared/etat-fichiers'
import {
  decoration,
  dossiersAPerimer,
  plage,
  type Entree,
  type GenreGit
} from '../../shared/explorateur'
import { iconeFichier } from '../../shared/icones-fichiers'
import {
  changer,
  changerFichiers,
  etat,
  ouvrirChemins,
  spacesVisiblesUi,
  surChangement,
  workspaceOuvert
} from './etat'
import { icone, iconeMaterial } from './icones'
import { fichierAffiche, laisserLeClavier } from './editeur'

export type Liste = { entrees: Entree[]; tronque: boolean } | { erreur: string }
type Git = { depot: string; statut: [string, GenreGit][] } | null
export type Ligne = { chemin: string; dossier: boolean; racine: string; profondeur: number }

const el = (id: string): HTMLElement => document.getElementById(id)!
const arbre = (): HTMLElement => el('arbre')

const GRIS_IGNORE = 'var(--gris)'
const TEXTE = 'var(--texte)'

let maison = ''
// Le contenu des dossiers déjà lus, gardé tant que le disque ne le change pas.
const cache = new Map<string, Liste>()
const enLecture = new Set<string>()
const gits = new Map<string, Git>()
const gitPrevu = new Map<string, NodeJS.Timeout>()
// Ce qui est choisi dans l'arbre (plusieurs avec ⌘-clic et ⇧-clic), le dernier
// choisi, et la ligne d'où part une plage choisie au ⇧-clic.
export const selection = new Set<string>()
export let choisi: Ligne | null = null
let ancre: string | null = null
// Les lignes dessinées, dans l'ordre (pour retrouver une ligne par son chemin).
export let lignes: Ligne[] = []
let version = 0
let dernierDessin = ''
let racinesSurveillees = ''

export const parent = (c: string): string => c.slice(0, c.lastIndexOf('/')) || '/'
export const nomDe = (c: string): string => c.slice(c.lastIndexOf('/') + 1)

// Un message passager en tête de l'explorateur (fichier impossible à ouvrir…).
export function annoncer(texte: string): void {
  const m = el('explorateur-message')
  m.textContent = texte
  m.hidden = false
  setTimeout(() => {
    if (m.textContent === texte) m.hidden = true
  }, 4000)
}

// Redessiner au prochain passage, même si l'état de la fenêtre n'a pas changé.
export function aRedessiner(): void {
  version++
  changer(() => {})
}

export function racinesDuWorkspace(): string[] {
  const w = workspaceOuvert()
  const f = w && etat().fichiersWs ? deWorkspace(etat().fichiersWs!, w.id) : null
  const dossiersSpaces = spacesVisiblesUi()
    .map((s) => s.dossier)
    .filter(Boolean)
  return f ? racines(dossiersSpaces, f) : [...new Set(dossiersSpaces)]
}

// Les dossiers ajoutés à la main au workspace ouvert.
export function dossiersAjoutes(): string[] {
  const w = workspaceOuvert()
  return w && etat().fichiersWs ? deWorkspace(etat().fichiersWs!, w.id).dossiers : []
}

function dossiersDesSpaces(): Set<string> {
  return new Set(spacesVisiblesUi().map((s) => s.dossier))
}

export function relire(dossier: string): void {
  if (enLecture.has(dossier)) return
  enLecture.add(dossier)
  void window.berger.demander<Liste>('berger:dossier', { dossier }).then((r) => {
    enLecture.delete(dossier)
    cache.set(dossier, r)
    aRedessiner()
  })
}

function lireGit(racine: string): void {
  if (gitPrevu.has(racine)) return
  gitPrevu.set(
    racine,
    setTimeout(() => {
      gitPrevu.delete(racine)
      void window.berger.demander<Git>('berger:git', { racine }).then((g) => {
        gits.set(racine, g)
        aRedessiner()
      })
    }, 500)
  )
}

// Ce qu'un dossier contient, lu au premier affichage.
function contenu(dossier: string): Liste | null {
  const c = cache.get(dossier)
  if (!c) relire(dossier)
  return c ?? null
}

function decorer(racine: string, chemin: string, dossier: boolean): ReturnType<typeof decoration> {
  const g = gits.get(racine)
  if (!g) return null
  if (chemin !== g.depot && !chemin.startsWith(g.depot + '/')) return null
  return decoration(g.statut, chemin === g.depot ? '' : chemin.slice(g.depot.length + 1), dossier)
}

export function estDeplie(l: { chemin: string; racine: string }): boolean {
  const w = workspaceOuvert()
  const f = w && etat().fichiersWs ? deWorkspace(etat().fichiersWs!, w.id) : null
  if (l.chemin === l.racine) return !f?.replies.includes(l.chemin)
  return !!f?.deplies.includes(l.chemin)
}

export function cheminAffiche(chemin: string): string {
  return maison && (chemin === maison || chemin.startsWith(maison + '/'))
    ? '~' + chemin.slice(maison.length)
    : chemin
}

// Les lignes visibles de l'arbre : chaque racine, puis son contenu déplié.
function calculerLignes(liste: string[]): Ligne[] {
  const r: Ligne[] = []
  const descendre = (racine: string, dossier: string, profondeur: number): void => {
    const c = contenu(dossier)
    if (!c || 'erreur' in c) return
    for (const e of c.entrees) {
      const chemin = `${dossier === '/' ? '' : dossier}/${e.nom}`
      const l = { chemin, dossier: e.dossier, racine, profondeur }
      r.push(l)
      if (e.dossier && estDeplie(l)) descendre(racine, chemin, profondeur + 1)
    }
  }
  for (const racine of liste) {
    r.push({ chemin: racine, dossier: true, racine, profondeur: 0 })
    if (estDeplie({ chemin: racine, racine })) descendre(racine, racine, 1)
  }
  return r
}

function entreeDe(l: Ligne): Entree | null {
  const c = cache.get(parent(l.chemin))
  if (!c || 'erreur' in c) return null
  return c.entrees.find((e) => e.nom === nomDe(l.chemin)) ?? null
}

// Le dernier choisi change sans toucher à la sélection (clic droit dans la sélection).
export function designer(l: Ligne): void {
  choisi = l
}

export function choisir(l: Ligne, ajouter = false): void {
  if (ajouter) {
    if (selection.has(l.chemin)) selection.delete(l.chemin)
    else selection.add(l.chemin)
  } else {
    selection.clear()
    selection.add(l.chemin)
  }
  choisi = l
  ancre = l.chemin
  aRedessiner()
}

// ⇧-clic : la plage de l'ancre à cette ligne (ajoutée à la sélection avec ⌘).
function choisirPlage(l: Ligne, ajouter: boolean): void {
  if (!ajouter) selection.clear()
  for (const c of plage(
    lignes.map((x) => x.chemin),
    ancre,
    l.chemin
  ))
    selection.add(c)
  if (!ancre || !selection.size) ancre = l.chemin
  choisi = l
  aRedessiner()
}

function cliquer(l: Ligne, ev: MouseEvent): void {
  arbre().focus()
  if (ev.shiftKey) return choisirPlage(l, ev.metaKey)
  if (ev.metaKey) return choisir(l, true)
  choisir(l)
  if (!l.dossier) {
    if (fichierAffiche() !== l.chemin && !pourVisionneuse(l.chemin)) laisserLeClavier()
    ouvrirChemins([l.chemin])
  } else if (l.chemin === l.racine) changerFichiers((x, ws) => basculerRacine(x, ws, l.chemin))
  else changerFichiers((x, ws) => basculerDeplie(x, ws, l.chemin))
}

// Rappels branchés par la partie « ranger » (menu, glisser-déposer, champs).
type Rappels = {
  ligneDessinee: (ligne: HTMLElement, l: Ligne) => void
  remplacerNom: (l: Ligne) => HTMLElement | null
  lignesEnPlus: (l: Ligne) => HTMLElement[]
  cleEdition: () => string
}
let rappels: Rappels = {
  ligneDessinee: () => {},
  remplacerNom: () => null,
  lignesEnPlus: () => [],
  cleEdition: () => ''
}
export function brancherRanger(r: Rappels): void {
  rappels = r
}

export function pointCouleur(d: ReturnType<typeof decoration>, marge: boolean): HTMLElement | null {
  if (!d) return null
  const s = document.createElement('span')
  s.className = 'deco' + (marge ? ' marge' : '')
  s.style.color = d.couleur
  s.style.fontSize = d.lettre === '•' ? '16px' : '11px'
  s.textContent = d.lettre
  return s
}

function ligneRacine(l: Ligne): HTMLElement {
  const ligne = document.createElement('div')
  ligne.className = 'ligne-arbre racine-arbre'
  const ouvert = estDeplie(l)
  const d = decorer(l.racine, l.chemin, true)
  const nom = document.createElement('span')
  nom.className = 'nom-racine'
  nom.textContent = nomDe(l.chemin) || l.chemin
  nom.style.color = d?.couleur ?? TEXTE
  const chemin = document.createElement('span')
  chemin.className = 'chemin-racine'
  chemin.textContent = cheminAffiche(l.chemin)
  ligne.append(
    icone(ouvert ? 'chevron-down' : 'chevron-right', 'var(--gris-clair)', 16, 1.75),
    iconeMaterial(iconeFichier(nomDe(l.chemin), true, ouvert))
  )
  const remplace = rappels.remplacerNom(l)
  if (remplace) ligne.append(remplace)
  else ligne.append(nom, chemin)
  const p = pointCouleur(d, false)
  if (p) ligne.append(p)
  return ligne
}

function ligneEntree(l: Ligne): HTMLElement {
  const ligne = document.createElement('div')
  ligne.className = 'ligne-arbre'
  ligne.style.paddingLeft = `${4 + 8 * l.profondeur}px`
  const e = entreeDe(l)
  const d = decorer(l.racine, l.chemin, l.dossier)
  const ouvert = l.dossier && estDeplie(l)
  ligne.style.color = d?.couleur ?? (e?.ignore ? GRIS_IGNORE : TEXTE)
  if (l.dossier)
    ligne.append(icone(ouvert ? 'chevron-down' : 'chevron-right', 'currentColor', 16, 1.75))
  else {
    const vide = document.createElement('span')
    vide.className = 'sans-chevron'
    ligne.append(vide)
  }
  ligne.append(iconeMaterial(iconeFichier(nomDe(l.chemin), l.dossier, ouvert)))
  const remplace = rappels.remplacerNom(l)
  if (remplace) ligne.append(remplace)
  else {
    const nom = document.createElement('span')
    nom.className = 'nom-arbre'
    nom.textContent = nomDe(l.chemin)
    ligne.append(nom)
  }
  const p = pointCouleur(d, true)
  if (p) ligne.append(p)
  return ligne
}

function message(texte: string, profondeur: number): HTMLElement {
  const m = document.createElement('div')
  m.className = 'ligne-arbre message-arbre'
  m.style.paddingLeft = `${4 + 8 * profondeur + 22}px`
  m.textContent = texte
  return m
}

export async function ajouterUnDossier(): Promise<void> {
  const chemin = await window.berger.demander<string | null>('berger:choisir-dossier')
  if (chemin) changerFichiers((x, ws) => ajouterDossier(x, ws, chemin))
}

function dessiner(): void {
  const e = etat()
  const liste = racinesDuWorkspace()
  const w = workspaceOuvert()
  const f = w && e.fichiersWs ? deWorkspace(e.fichiersWs, w.id) : null
  // Surveiller exactement les racines affichées.
  const cleRacines = JSON.stringify(liste)
  if (cleRacines !== racinesSurveillees) {
    racinesSurveillees = cleRacines
    window.berger.envoyer('berger:surveiller', { racines: liste })
    for (const r of liste) if (!gits.has(r)) lireGit(r)
  }
  const cle = JSON.stringify([
    cleRacines,
    f?.deplies,
    f?.replies,
    version,
    e.explorateurMasque,
    rappels.cleEdition()
  ])
  if (cle === dernierDessin) return
  dernierDessin = cle
  el('explorateur-vide').hidden = liste.length > 0 || !e.workspaces
  arbre().hidden = liste.length === 0
  el('pied-explorateur').hidden = liste.length === 0
  if (!liste.length) {
    lignes = []
    arbre().replaceChildren()
    return
  }
  lignes = calculerLignes(liste)
  const spaces = dossiersDesSpaces()
  const enfants: HTMLElement[] = []
  let precedente: Ligne | null = null
  for (const l of lignes) {
    if (
      l.profondeur === 0 &&
      precedente &&
      spaces.has(precedente.racine) &&
      !spaces.has(l.chemin)
    ) {
      const t = document.createElement('div')
      t.className = 'trait-arbre-racines'
      enfants.push(t)
    }
    precedente = l
    const ligne = l.profondeur === 0 ? ligneRacine(l) : ligneEntree(l)
    if (selection.has(l.chemin)) ligne.classList.add('choisie')
    ligne.dataset['chemin'] = l.chemin
    ligne.title = l.chemin
    ligne.addEventListener('click', (ev) => cliquer(l, ev))
    rappels.ligneDessinee(ligne, l)
    enfants.push(ligne)
    enfants.push(...rappels.lignesEnPlus(l))
    if (l.dossier && estDeplie(l)) {
      const c = cache.get(l.chemin)
      if (c && 'erreur' in c) enfants.push(message(c.erreur, l.profondeur + 1))
      else if (c?.tronque)
        enfants.push(message('Dossier limité aux 2 000 premiers éléments', l.profondeur + 1))
    }
  }
  arbre().replaceChildren(...enfants)
}

export function basculerExplorateur(): void {
  changer((e) => (e.explorateurMasque = !e.explorateurMasque))
}

export function initExplorateur(m: string): void {
  maison = m
  el('ajouter-dossier').prepend(icone('folder-plus', 'currentColor', 14, 1.75))
  el('ajouter-dossier').onclick = () => void ajouterUnDossier()
  el('tout-replier').replaceChildren(icone('chevrons-down-up', 'currentColor', 15, 1.75))
  el('tout-replier').onclick = () =>
    changerFichiers((x, ws) => toutReplier(x, ws, racinesDuWorkspace()))
  el('vide-ajouter').onclick = () => void ajouterUnDossier()
  surChangement(dessiner)
  window.berger.ecouter('berger:disque', ({ chemins }: { chemins: string[] }) => {
    for (const d of dossiersAPerimer(chemins, [...cache.keys()])) relire(d)
    for (const r of racinesDuWorkspace())
      if (chemins.some((c) => c === r || c.startsWith(r + '/'))) lireGit(r)
  })
}
