// Ranger les fichiers dans l'explorateur (maquette explorateur.html a, b, c) :
// menu du clic droit, nouveau fichier ou dossier et renommage sur place,
// copier-coller par le presse-papiers de macOS, glisser-déposer (dans l'arbre
// et depuis le Finder), mise à la corbeille après confirmation.
import {
  basculerDeplie,
  basculerRacine,
  deplacerRacine,
  fermerFichierWs,
  retirerDossier,
  suivreDeplacement
} from '../../shared/etat-fichiers'
import { dossierDeCollage, peutDeposer } from '../../shared/explorateur'
import { ouvrirDialogue } from './dialogue'
import { modifie, oublierFichier, suivreDeplacementEditeur } from './editeur'
import {
  changer,
  changerFichiers,
  fichiersDuWorkspace,
  ouvrirChemins,
  spacesVisiblesUi
} from './etat'
import {
  aRedessiner,
  annoncer,
  brancherRanger,
  choisi,
  choisir,
  designer,
  dossiersAjoutes,
  estDeplie,
  lignes,
  nomDe,
  parent,
  racinesDuWorkspace,
  relire,
  selection,
  type Ligne
} from './explorateur'
import { icone } from './icones'
import { ouvrirMenu } from './menus'

type Edition =
  | { type: 'renommer'; chemin: string }
  | { type: 'nouveau'; dossier: string; estDossier: boolean; profondeur: number }
  | null

let edition: Edition = null
const INTERNE = 'application/x-berger-chemins'
const RACINE = 'application/x-berger-racine'
const DANS_LUI_MEME = 'Impossible de déplacer un dossier dans lui-même.'

const arbre = (): HTMLElement => document.getElementById('arbre')!
const estRacine = (l: Ligne): boolean => l.chemin === l.racine
const espaces = (): Set<string> => new Set(spacesVisiblesUi().map((s) => s.dossier))

// Les éléments visés : la sélection si elle contient le dernier choisi, sinon lui seul.
function choisis(): Ligne[] {
  if (!choisi) return []
  if (!selection.has(choisi.chemin)) return [choisi]
  return lignes.filter((l) => selection.has(l.chemin))
}

// Rien de ce qui suit ne touche à une racine (dossier d'un space ou ajouté).
const sansRacines = (liste: Ligne[]): Ligne[] => liste.filter((l) => !estRacine(l))

function suivre(paires: [string, string][]): void {
  if (!paires.length) return
  changerFichiers((x) => suivreDeplacement(x, paires))
  suivreDeplacementEditeur(paires)
  for (const [a, b] of paires) if (selection.delete(a)) selection.add(b)
}

// Après une mise à la corbeille : les onglets sous ces chemins se ferment,
// sauf ceux qui ont une modification en attente (l'enregistrer recrée le fichier).
function fermerOngletsSous(chemins: string[]): void {
  const sous = (c: string): boolean => chemins.some((p) => c === p || c.startsWith(p + '/'))
  for (const o of fichiersDuWorkspace()) {
    if (!sous(o.chemin) || modifie(o.chemin)) continue
    changerFichiers((x, ws) => fermerFichierWs(x, ws, o.chemin))
    oublierFichier(o.chemin)
    changer((e) => {
      if (e.onglet?.type === 'fichier' && e.onglet.chemin === o.chemin) e.onglet = null
    })
  }
}

// ——— Champs sur place ———

function champ(valeur: string, valider: (v: string) => void, choisirNom: boolean): HTMLElement {
  const input = document.createElement('input')
  input.className = 'renommage champ-arbre'
  input.value = valeur
  input.spellcheck = false
  let fini = false
  const finir = (ok: boolean): void => {
    if (fini) return
    fini = true
    edition = null
    aRedessiner()
    arbre().focus()
    const v = input.value.trim()
    if (ok && v) valider(v)
  }
  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') finir(true)
    else if (e.key === 'Escape') finir(false)
  })
  input.addEventListener('click', (e) => e.stopPropagation())
  input.addEventListener('blur', () => finir(false))
  requestAnimationFrame(() => {
    input.focus()
    const point = valeur.lastIndexOf('.')
    if (choisirNom && point > 0) input.setSelectionRange(0, point)
    else input.select()
  })
  return input
}

function nomValide(nom: string): boolean {
  if (nom.includes('/') || nom === '.' || nom === '..') {
    annoncer('Ce nom n’est pas valable.')
    return false
  }
  return true
}

async function creerIci(dossier: string, nom: string, estDossier: boolean): Promise<void> {
  if (!nomValide(nom)) return
  const chemin = `${dossier === '/' ? '' : dossier}/${nom}`
  const r = await window.berger.demander<{ ok?: true; erreur?: string }>('berger:creer', {
    chemin,
    dossier: estDossier
  })
  if (r.erreur) return annoncer(r.erreur)
  relire(dossier)
  selection.clear()
  selection.add(chemin)
  if (!estDossier) ouvrirChemins([chemin])
}

async function renommerEn(ancien: string, nom: string): Promise<void> {
  if (nom === nomDe(ancien) || !nomValide(nom)) return
  const nouveau = `${parent(ancien) === '/' ? '' : parent(ancien)}/${nom}`
  const r = await window.berger.demander<{ ok?: true; erreur?: string }>(
    'berger:renommer-fichier',
    { ancien, nouveau }
  )
  if (r.erreur) return annoncer(r.erreur)
  suivre([[ancien, nouveau]])
  relire(parent(ancien))
}

export function nouveau(l: Ligne, estDossier: boolean): void {
  const dossier = l.dossier ? l.chemin : parent(l.chemin)
  const ligneDossier = l.dossier ? l : (lignes.find((x) => x.chemin === dossier) ?? l)
  // Le dossier visé est déplié d'abord.
  if (!estDeplie({ chemin: dossier, racine: l.racine })) {
    if (dossier === l.racine) changerFichiers((x, ws) => basculerRacine(x, ws, dossier))
    else changerFichiers((x, ws) => basculerDeplie(x, ws, dossier))
  }
  edition = {
    type: 'nouveau',
    dossier,
    estDossier,
    profondeur: (l.dossier ? l.profondeur : ligneDossier.profondeur) + 1
  }
  aRedessiner()
}

export function renommerChoisi(): void {
  const l = choisi
  if (!l || estRacine(l)) return
  edition = { type: 'renommer', chemin: l.chemin }
  aRedessiner()
}

// ——— Presse-papiers, Finder, VS Code, corbeille ———

export async function copierChoisis(): Promise<void> {
  const liste = choisis()
  if (!liste.length) return
  const r = await window.berger.demander<{ ok: boolean }>('berger:copier-fichiers', {
    chemins: liste.map((l) => l.chemin)
  })
  if (!r.ok) annoncer('Copie impossible.')
}

export async function collerIci(): Promise<void> {
  if (!choisi) return
  const cible = dossierDeCollage({ chemin: choisi.chemin, dossier: choisi.dossier })
  const r = await window.berger.demander<{ faits: [string, string][]; erreurs: string[] }>(
    'berger:coller',
    { cible }
  )
  if (r.erreurs.length) annoncer(r.erreurs[0])
  relire(cible)
}

export function copierCheminChoisi(): void {
  if (choisi) void window.berger.demander('berger:copier-chemin', { chemin: choisi.chemin })
}

export async function corbeilleChoisis(): Promise<void> {
  const liste = sansRacines(choisis())
  if (!liste.length) return
  const r = await ouvrirDialogue({
    titre:
      liste.length === 1
        ? `Supprimer « ${nomDe(liste[0].chemin)} » ?`
        : `Supprimer ${liste.length} éléments ?`,
    texte:
      liste.length === 1
        ? 'Il sera placé dans la corbeille.'
        : 'Ils seront placés dans la corbeille.',
    bouton: { libelle: 'Mettre à la corbeille', danger: true }
  })
  if (!r) return
  const chemins = liste.map((l) => l.chemin)
  const rep = await window.berger.demander<{ erreurs: string[] }>('berger:corbeille', { chemins })
  if (rep.erreurs.length) annoncer(rep.erreurs[0])
  for (const c of chemins) selection.delete(c)
  fermerOngletsSous(chemins)
  for (const d of new Set(chemins.map(parent))) relire(d)
}

function menu(l: Ligne, x: number, y: number): void {
  if (!selection.has(l.chemin)) choisir(l)
  else designer(l)
  const racine = estRacine(l)
  const ajoutee = racine && dossiersAjoutes().includes(l.chemin) && !espaces().has(l.chemin)
  ouvrirMenu(
    x,
    y,
    [
      { libelle: 'Nouveau fichier', icone: 'file-plus', faire: () => nouveau(l, false) },
      { libelle: 'Nouveau dossier', icone: 'folder-plus', faire: () => nouveau(l, true) },
      'separateur',
      {
        libelle: 'Renommer',
        raccourci: 'F2',
        icone: 'pencil',
        inactif: racine,
        faire: renommerChoisi
      },
      { libelle: 'Copier', raccourci: '⌘C', icone: 'copy', faire: () => void copierChoisis() },
      {
        libelle: 'Coller',
        raccourci: '⌘V',
        icone: 'clipboard-paste',
        faire: () => void collerIci()
      },
      {
        libelle: 'Copier le chemin',
        raccourci: '⌥⌘C',
        icone: 'link',
        faire: copierCheminChoisi
      },
      'separateur',
      {
        libelle: 'Afficher dans le Finder',
        icone: 'folder-open',
        faire: () => void window.berger.demander('berger:finder', { chemin: l.chemin })
      },
      {
        libelle: 'Ouvrir dans VS Code',
        icone: 'code',
        faire: () => void window.berger.demander('berger:vscode', { chemin: l.chemin })
      },
      ...(ajoutee
        ? [
            'separateur' as const,
            {
              libelle: "Retirer de l'explorateur",
              icone: 'folder-minus',
              faire: () => changerFichiers((x, ws) => retirerDossier(x, ws, l.chemin))
            }
          ]
        : []),
      'separateur',
      {
        libelle: 'Mettre à la corbeille',
        raccourci: '⌘⌫',
        icone: 'trash-2',
        danger: true,
        inactif: racine,
        faire: () => void corbeilleChoisis()
      }
    ],
    'Actions du fichier'
  )
}

// ——— Glisser-déposer ———

// Le dossier où va un dépôt sur cette ligne : elle-même si c'est un dossier,
// sinon le dossier du fichier.
const dossierDe = (l: Ligne): string => (l.dossier ? l.chemin : parent(l.chemin))

function surligner(dossier: string | null): void {
  const rangees = [...arbre().querySelectorAll<HTMLElement>('.ligne-arbre[data-chemin]')]
  for (const r of rangees) r.classList.remove('cible', 'cible-haut', 'cible-bas')
  if (!dossier) return
  const dedans = rangees.filter((r) => {
    const c = r.dataset['chemin']!
    return c === dossier || c.startsWith(dossier + '/')
  })
  for (const r of dedans) r.classList.add('cible')
  dedans[0]?.classList.add('cible-haut')
  dedans[dedans.length - 1]?.classList.add('cible-bas')
}

async function deposer(sources: string[], cible: string, copier: boolean): Promise<void> {
  const refusees = sources.filter((s) => !peutDeposer(s, cible))
  if (refusees.length) annoncer(DANS_LUI_MEME)
  const liste = sources.filter((s) => peutDeposer(s, cible) && parent(s) !== cible)
  if (!liste.length) return
  const pris = await window.berger.demander<string[]>('berger:noms-pris', {
    sources: liste,
    cible
  })
  let conflit: 'remplacer' | 'garder' | null = null
  if (pris.length) {
    const r = await window.berger.demander<number>('berger:question', {
      message:
        pris.length === 1
          ? `« ${pris[0]} » existe déjà dans « ${nomDe(cible)} ».`
          : `${pris.length} éléments existent déjà dans « ${nomDe(cible)} ».`,
      boutons: ['Remplacer', 'Garder les deux', 'Annuler'],
      defaut: 1,
      annuler: 2
    })
    if (r === 2) return
    conflit = r === 0 ? 'remplacer' : 'garder'
  }
  const r = await window.berger.demander<{ faits: [string, string][]; erreurs: string[] }>(
    'berger:transferer',
    { sources: liste, cible, copier, conflit }
  )
  if (r.erreurs.length) annoncer(r.erreurs[0])
  if (!copier) suivre(r.faits)
  relire(cible)
  for (const d of new Set(liste.map(parent))) relire(d)
}

function brancherGlisser(ligne: HTMLElement, l: Ligne): void {
  ligne.draggable = !edition
  ligne.addEventListener('dragstart', (ev) => {
    const dt = ev.dataTransfer!
    if (estRacine(l)) {
      dt.setData(RACINE, l.chemin)
      dt.effectAllowed = 'move'
      return
    }
    const sources = selection.has(l.chemin)
      ? sansRacines(lignes.filter((x) => selection.has(x.chemin))).map((x) => x.chemin)
      : [l.chemin]
    dt.setData(INTERNE, JSON.stringify(sources))
    dt.effectAllowed = 'copyMove'
    requestAnimationFrame(() => {
      for (const s of sources)
        arbre()
          .querySelector(`.ligne-arbre[data-chemin="${CSS.escape(s)}"]`)
          ?.classList.add('glissee')
    })
  })
  ligne.addEventListener('dragend', () => {
    surligner(null)
    for (const r of arbre().querySelectorAll('.glissee')) r.classList.remove('glissee')
  })
  ligne.addEventListener('dragover', (ev) => {
    const types = ev.dataTransfer?.types ?? []
    if (types.includes(RACINE)) {
      if (!estRacine(l)) return
      ev.preventDefault()
      ev.stopPropagation()
      ev.dataTransfer!.dropEffect = 'move'
      return
    }
    if (!types.includes(INTERNE) && !types.includes('Files')) return
    ev.preventDefault()
    ev.stopPropagation()
    ev.dataTransfer!.dropEffect = types.includes('Files') || ev.altKey ? 'copy' : 'move'
    surligner(dossierDe(l))
  })
  ligne.addEventListener('drop', (ev) => {
    const dt = ev.dataTransfer
    if (!dt) return
    const racine = dt.getData(RACINE)
    if (racine) {
      if (!estRacine(l)) return
      ev.preventDefault()
      ev.stopPropagation()
      const actuelles = racinesDuWorkspace()
      changerFichiers((x, ws) =>
        deplacerRacine(x, ws, actuelles, racine, actuelles.indexOf(l.chemin))
      )
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    surligner(null)
    const interne = dt.getData(INTERNE)
    if (interne) void deposer(JSON.parse(interne) as string[], dossierDe(l), ev.altKey)
    else if (dt.files.length)
      void deposer(
        [...dt.files].map((f) => window.berger.cheminDe(f)).filter(Boolean),
        dossierDe(l),
        true
      )
  })
}

export function initRanger(): void {
  brancherRanger({
    ligneDessinee: (ligne, l) => {
      ligne.addEventListener('contextmenu', (ev) => {
        ev.preventDefault()
        arbre().focus()
        menu(l, ev.clientX, ev.clientY)
      })
      brancherGlisser(ligne, l)
    },
    remplacerNom: (l) => {
      if (edition?.type !== 'renommer' || edition.chemin !== l.chemin) return null
      const ancien = l.chemin
      return champ(nomDe(ancien), (v) => void renommerEn(ancien, v), !l.dossier)
    },
    lignesEnPlus: (l) => {
      if (edition?.type !== 'nouveau' || edition.dossier !== l.chemin) return []
      const e = edition
      const ligne = document.createElement('div')
      ligne.className = 'ligne-arbre ligne-nouvelle'
      ligne.style.paddingLeft = `${4 + 8 * e.profondeur}px`
      const vide = document.createElement('span')
      vide.className = 'sans-chevron'
      ligne.append(
        e.estDossier ? icone('chevron-right', 'currentColor', 16, 1.75) : vide,
        icone(e.estDossier ? 'folder' : 'file', '#a59f85', 16, 1.75),
        champ('', (v) => void creerIci(e.dossier, v, e.estDossier), false)
      )
      return [ligne]
    },
    cleEdition: () => JSON.stringify(edition)
  })
  arbre().addEventListener('dragleave', (ev) => {
    if (!arbre().contains(ev.relatedTarget as Node)) surligner(null)
  })
  // Dépôt du Finder ailleurs dans la fenêtre : chaque fichier s'ouvre, le dernier est affiché.
  window.addEventListener(
    'dragover',
    (ev) => {
      if ((ev.target as Element | null)?.closest?.('#arbre .ligne-arbre')) return
      if (ev.dataTransfer?.types.includes('Files')) {
        ev.preventDefault()
        ev.stopPropagation()
        ev.dataTransfer.dropEffect = 'copy'
      }
    },
    true
  )
  window.addEventListener(
    'drop',
    (ev) => {
      if ((ev.target as Element | null)?.closest?.('#arbre .ligne-arbre')) return
      const dt = ev.dataTransfer
      if (!dt || !dt.files.length || dt.types.includes(INTERNE)) return
      ev.preventDefault()
      ev.stopPropagation()
      const chemins = [...dt.files].map((f) => window.berger.cheminDe(f)).filter(Boolean)
      void window.berger
        .demander<string[]>('berger:fichiers-seuls', { chemins })
        .then((seuls) => ouvrirChemins(seuls))
    },
    true
  )
}
