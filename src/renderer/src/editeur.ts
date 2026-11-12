// L'éditeur Monaco des onglets de fichiers : un modèle par fichier ouvert,
// gardé tant que son onglet est ouvert. Changer d'onglet n'enregistre rien.
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker'
import { langageDe } from '../../shared/fichiers'
import { dossierAffiche } from '../../shared/libelles'
import { fermerFichierWs } from '../../shared/etat-fichiers'
import { changer, changerFichiers, etat, redessiner } from './etat'
import { icone } from './icones'

self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'json') return new JsonWorker()
    if (['css', 'scss', 'less'].includes(label)) return new CssWorker()
    if (['html', 'handlebars', 'razor'].includes(label)) return new HtmlWorker()
    if (['typescript', 'javascript'].includes(label)) return new TsWorker()
    return new EditorWorker()
  }
}

// Couleurs reprises du thème `antoine-monokai` de Herdr (voir docs/COPIES.md).
monaco.editor.defineTheme('antoine-monokai', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '75715e' },
    { token: 'string', foreground: 'e6db74' },
    { token: 'number', foreground: 'ae81ff' },
    { token: 'keyword', foreground: 'f92672' },
    { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
    { token: 'function', foreground: 'a6e22e' },
    { token: 'variable', foreground: 'd0d0c8' },
    { token: 'tag', foreground: 'f92672' },
    { token: 'attribute.name', foreground: 'a6e22e' },
    { token: 'keyword.md', foreground: 'f92672' },
    { token: 'strong', fontStyle: 'bold' },
    { token: 'emphasis', fontStyle: 'italic' }
  ],
  colors: {
    'editor.background': '#272822',
    'editor.foreground': '#d0d0c8',
    'editor.selectionBackground': '#49483e',
    'editor.lineHighlightBackground': '#3e3d32',
    'editorCursor.foreground': '#f8f8f0',
    'editorWidget.background': '#1e1f1c',
    'editorLineNumber.foreground': '#75715e',
    'minimap.background': '#272822'
  }
})

type Ouvert = {
  modele: monaco.editor.ITextModel
  texteCharge: string
  versionEnregistree: number
  vue: monaco.editor.ICodeEditorViewState | null
}

const ouverts = new Map<string, Ouvert>()
let editeur: monaco.editor.IStandaloneCodeEditor | null = null
let affiche: string | null = null
let maison = ''
let dernierEchec = ''
// Un fichier ouvert d'un clic dans l'explorateur laisse le clavier à l'explorateur.
let garderClavier = false

export function laisserLeClavier(): void {
  garderClavier = true
}

export function raisonEchec(): string {
  return dernierEchec
}

const el = (id: string): HTMLElement => document.getElementById(id)!

function annoncer(texte: string, duree = 0): void {
  el('fichier-message').textContent = texte
  if (duree) setTimeout(() => (el('fichier-message').textContent = ''), duree)
}

function nomDuLangage(id: string): string {
  return monaco.languages.getLanguages().find((l) => l.id === id)?.aliases?.[0] ?? id
}

function dessinerBandeau(chemin: string): void {
  const morceaux = dossierAffiche(chemin, maison).split('/').filter(Boolean)
  const enfants: Node[] = [icone('file', '#a59f85')]
  morceaux.forEach((m, i) => {
    const s = document.createElement('span')
    const dernier = i === morceaux.length - 1
    s.className = dernier ? 'chemin-nom' : 'gris'
    s.textContent = m
    if (i > 0) {
      const sep = document.createElement('span')
      sep.className = 'chemin-sep'
      sep.textContent = '›'
      enfants.push(sep)
    }
    enfants.push(s)
  })
  el('fichier-bandeau').replaceChildren(...enfants)
}

function dessinerPosition(): void {
  const p = editeur?.getPosition()
  el('fichier-position').textContent = p ? `Ligne ${p.lineNumber}, colonne ${p.column}` : ''
}

export function modifie(chemin: string): boolean {
  const o = ouverts.get(chemin)
  return !!o && o.modele.getAlternativeVersionId() !== o.versionEnregistree
}

function suivreModifies(chemin: string): void {
  const m = modifie(chemin)
  if (etat().modifies.has(chemin) === m) return
  if (m) etat().modifies.add(chemin)
  else etat().modifies.delete(chemin)
  redessiner()
}

export function initEditeur(m: string): void {
  maison = m
  editeur = monaco.editor.create(el('editeur'), {
    theme: 'antoine-monokai',
    automaticLayout: true,
    fontFamily: 'Menlo, monospace',
    fontSize: 13,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fixedOverflowWidgets: true
  })
  // ⌘S : enregistrer. ⌘F est la recherche intégrée de Monaco.
  editeur.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    if (affiche) void enregistrer(affiche)
  })
  editeur.onDidChangeCursorPosition(dessinerPosition)
  editeur.onDidChangeModelContent(() => {
    if (affiche) suivreModifies(affiche)
  })
}

// Montre un fichier ; le lit au premier affichage. Rend faux s'il est illisible.
export async function afficherFichier(chemin: string): Promise<boolean> {
  if (!editeur) return false
  if (affiche && affiche !== chemin) {
    const avant = ouverts.get(affiche)
    if (avant) avant.vue = editeur.saveViewState()
  }
  affiche = chemin
  let o = ouverts.get(chemin)
  if (!o) {
    const r = await window.berger.demander<{ texte?: string; erreur?: string }>('berger:lire', {
      chemin
    })
    if (affiche !== chemin) return true
    if (r.erreur !== undefined) {
      affiche = null
      dernierEchec = r.erreur
      return false
    }
    o = ouverts.get(chemin)
    if (!o) {
      const modele = monaco.editor.createModel(r.texte ?? '', langageDe(chemin))
      o = {
        modele,
        texteCharge: r.texte ?? '',
        versionEnregistree: modele.getAlternativeVersionId(),
        vue: null
      }
      ouverts.set(chemin, o)
    }
  }
  editeur.setModel(o.modele)
  if (o.vue) editeur.restoreViewState(o.vue)
  dessinerBandeau(chemin)
  el('fichier-langage').textContent = nomDuLangage(o.modele.getLanguageId())
  dessinerPosition()
  annoncer('')
  editeur.layout()
  if (garderClavier) garderClavier = false
  else editeur.focus()
  return true
}

export function cacherEditeur(): void {
  if (editeur && affiche) {
    const o = ouverts.get(affiche)
    if (o) o.vue = editeur.saveViewState()
  }
  affiche = null
}

export function fichierAffiche(): string | null {
  return affiche
}

export async function enregistrer(chemin: string): Promise<boolean> {
  const o = ouverts.get(chemin)
  if (!o) return true
  const texte = o.modele.getValue()
  const version = o.modele.getAlternativeVersionId()
  const r = await window.berger.demander<{ ok?: boolean; annule?: boolean; erreur?: string }>(
    'berger:ecrire',
    { chemin, texte, texteCharge: o.texteCharge }
  )
  if (r.ok) {
    o.texteCharge = texte
    o.versionEnregistree = version
    suivreModifies(chemin)
    if (affiche === chemin) annoncer('Enregistré', 1500)
    return true
  }
  if (r.erreur && affiche === chemin) annoncer(r.erreur)
  return false
}

// Oublie le modèle d'un fichier (sans question) : son onglet a été fermé.
export function oublierFichier(chemin: string): void {
  const o = ouverts.get(chemin)
  if (!o) return
  if (affiche === chemin) {
    editeur?.setModel(null)
    affiche = null
  }
  o.modele.dispose()
  ouverts.delete(chemin)
}

const question = (q: {
  message: string
  detail?: string
  boutons: string[]
  defaut: number
  annuler: number
}): Promise<number> => window.berger.demander<number>('berger:question', q)

// Fermer un onglet de fichier : la question de VS Code s'il est modifié.
export async function fermerFichierAvecQuestion(chemin: string): Promise<boolean> {
  if (modifie(chemin)) {
    const nom = chemin.slice(chemin.lastIndexOf('/') + 1)
    const r = await question({
      message: `Voulez-vous enregistrer les modifications de ${nom} ?`,
      detail: 'Vos modifications seront perdues si vous ne les enregistrez pas.',
      boutons: ['Enregistrer', 'Ne pas enregistrer', 'Annuler'],
      defaut: 0,
      annuler: 2
    })
    if (r === 2) return false
    if (r === 0 && !(await enregistrer(chemin))) return false
  }
  oublierFichier(chemin)
  return true
}

export async function quitterAvecQuestion(): Promise<boolean> {
  const liste = [...ouverts.keys()].filter(modifie)
  if (liste.length === 0) return true
  const r = await question({
    message:
      liste.length === 1
        ? `Voulez-vous enregistrer les modifications de ${liste[0].slice(liste[0].lastIndexOf('/') + 1)} ?`
        : `Voulez-vous enregistrer les modifications de ${liste.length} fichiers ?`,
    detail: 'Vos modifications seront perdues si vous ne les enregistrez pas.',
    boutons: ['Tout enregistrer', 'Ne pas enregistrer', 'Annuler'],
    defaut: 0,
    annuler: 2
  })
  if (r === 2) return false
  if (r === 0) for (const chemin of liste) if (!(await enregistrer(chemin))) return false
  return true
}

export function chercher(): void {
  editeur?.getAction('actions.find')?.run()
}

export function donnerClavierEditeur(): void {
  editeur?.focus()
}

// Un fichier retenu qui ne s'ouvre plus : son onglet est retiré.
export function retirerOnglet(chemin: string): void {
  changerFichiers((x, ws) => fermerFichierWs(x, ws, chemin))
  changer((e) => {
    if (e.onglet?.type === 'fichier' && e.onglet.chemin === chemin) e.onglet = null
  })
}

const suivre = (p: string, paires: [string, string][]): string => {
  for (const [a, b] of paires) {
    if (p === a) return b
    if (p.startsWith(a + '/')) return b + p.slice(a.length)
  }
  return p
}

// Des fichiers ou dossiers ont été déplacés ou renommés : les modèles ouverts
// (et leurs modifications en attente) suivent leur nouveau chemin.
export function suivreDeplacementEditeur(paires: [string, string][]): void {
  if (!paires.length) return
  // Un fichier remplacé (mis à la corbeille) qui était ouvert : son modèle est oublié.
  const cles = [...ouverts.keys()]
  const arrivees = new Set(cles.map((c) => suivre(c, paires)).filter((n, i) => n !== cles[i]))
  for (const c of arrivees)
    if (ouverts.has(c) && suivre(c, paires) === c) {
      ouverts.get(c)!.modele.dispose()
      ouverts.delete(c)
    }
  for (const [ancien, o] of [...ouverts]) {
    const nouveau = suivre(ancien, paires)
    if (nouveau === ancien) continue
    ouverts.delete(ancien)
    ouverts.set(nouveau, o)
    if (affiche === ancien) {
      affiche = nouveau
      dessinerBandeau(nouveau)
    }
  }
  changer((e) => {
    e.modifies = new Set([...e.modifies].map((c) => suivre(c, paires)))
    if (e.onglet?.type === 'fichier')
      e.onglet = { type: 'fichier', chemin: suivre(e.onglet.chemin, paires) }
    for (const [s, o] of Object.entries(e.ongletParSpace))
      if (o.type === 'fichier')
        e.ongletParSpace[s] = { type: 'fichier', chemin: suivre(o.chemin, paires) }
  })
}
