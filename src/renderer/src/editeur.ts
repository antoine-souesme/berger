// L'éditeur Monaco des onglets de fichiers : un modèle par fichier ouvert,
// gardé tant que son onglet est ouvert. Changer d'onglet n'enregistre rien.
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker'
import { serveurDe } from '../../shared/langage'
import {
  appliquerThemeEditeur,
  initColoration,
  langageDuFichier,
  lireThemeVsCode
} from './coloration'
import type { EtatReglages } from '../../shared/reglages'
import { themeEditeur, type ThemeHerdr } from '../../shared/themes'
import { THEMES_EDITEUR_VSCODE } from '../../shared/themes-fournis'
import type { ThemeVsCode } from '../../shared/theme'
import { reglagesActuels, surReglages, themeConnu } from './apparence'
import { quoiFaire } from '../../shared/fichiers'
import { replisMarkdown } from '../../shared/replis-markdown'
import { initJson, suivreJson } from './json'
import { organiserImports, suivreModele } from './langage'
import { dossierAffiche } from '../../shared/libelles'
import { fermerFichierWs } from '../../shared/etat-fichiers'
import { changer, changerFichiers, etat, redessiner, surChangement } from './etat'
import { retourLigneApresReglage } from '../../shared/etat-fenetre'
import { icone } from './icones'

self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'json') return new JsonWorker()
    if (['css', 'scss', 'less'].includes(label)) return new CssWorker()
    if (['html', 'handlebars', 'razor'].includes(label)) return new HtmlWorker()
    return new EditorWorker()
  }
}

// L'aide du langage vient des serveurs de la partie Node (langage.ts) : les
// services TypeScript intégrés de Monaco sont coupés.
const SANS_SERVICES = {
  completionItems: false,
  hovers: false,
  documentSymbols: false,
  definitions: false,
  references: false,
  documentHighlights: false,
  rename: false,
  diagnostics: false,
  documentRangeFormattingEdits: false,
  signatureHelp: false,
  onTypeFormattingEdits: false,
  codeActions: false,
  inlayHints: false
}
monaco.typescript.typescriptDefaults.setModeConfiguration(SANS_SERVICES)
monaco.typescript.javascriptDefaults.setModeConfiguration(SANS_SERVICES)
monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})
monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})
initJson()

// Coloration et thème de VS Code (voir coloration.ts) : prêts avant le premier fichier.
const colorationPrete = initColoration()
  .then(() => undefined)
  .catch((e) => console.error('[berger] coloration de VS Code indisponible :', e))

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

// Un message qui reste (un service de langage arrêté) revient quand l'autre s'efface.
let messageGarde = ''

function annoncer(texte: string, duree = 0): void {
  el('fichier-message').textContent = texte || messageGarde
  if (duree) setTimeout(() => (el('fichier-message').textContent = messageGarde), duree)
}

export function annoncerFichier(texte: string): void {
  annoncer(texte, 5000)
}

export function annoncerArret(texte: string): void {
  messageGarde = texte
  annoncer(texte)
}

function nomDuLangage(id: string): string {
  return monaco.languages.getLanguages().find((l) => l.id === id)?.aliases?.[0] ?? id
}

function dessinerBandeau(chemin: string): void {
  const morceaux = dossierAffiche(chemin, maison).split('/').filter(Boolean)
  const enfants: Node[] = [icone('file', 'var(--gris-clair)')]
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

// Le retour à la ligne : celui de ⌥Z (retenu d'une session à l'autre), sinon
// le réglage « Retour à la ligne par défaut ».
function retourLigne(): boolean {
  return etat().retourLigne ?? reglagesActuels()?.reglages.editeur.retourLigne ?? false
}

// ⌥Z : retour à la ligne, retenu d'une session à l'autre.
export function basculerRetourLigne(): void {
  const avant = retourLigne()
  changer((e) => (e.retourLigne = !avant))
}

// Le thème de l'éditeur choisi : un thème de VS Code tel quel, sinon un thème
// connu (inconnu : antoine-monokai) avec le thème de VS Code de son champ `editeur`.
async function themeEditeurDe(e: EtatReglages): Promise<ThemeVsCode & { type: 'dark' | 'light' }> {
  const id = e.reglages.apparence.themeEditeur
  const vscode = THEMES_EDITEUR_VSCODE.find((t) => t.id === id)
  if (vscode) {
    const t = await lireThemeVsCode(vscode.fichier)
    return {
      colors: t.colors,
      tokenColors: t.tokenColors,
      type: t.type === 'light' ? 'light' : 'dark'
    }
  }
  const connu: ThemeHerdr = themeConnu(e, id).theme
  const fichier = connu.editeur?.vscode
  const base = fichier ? await lireThemeVsCode(fichier).catch(() => null) : null
  return themeEditeur(connu, base)
}

// Thème, police, minicarte, tabulations, retour à la ligne : à chaque
// changement des réglages (le dernier demandé gagne).
let tour = 0
let tabulations = 2
let reglageRetour: boolean | undefined
async function appliquerReglages(e: EtatReglages): Promise<void> {
  const ce = ++tour
  const theme = await themeEditeurDe(e)
  await colorationPrete
  if (ce !== tour) return
  const r = e.reglages.editeur
  const etatRetour = retourLigneApresReglage(etat().retourLigne, reglageRetour, r.retourLigne)
  reglageRetour = r.retourLigne
  if (etatRetour !== etat().retourLigne) changer((x) => (x.retourLigne = etatRetour))
  appliquerThemeEditeur(theme, r.couleurSelection)
  editeur?.updateOptions({
    fontFamily: r.police,
    fontSize: r.taille,
    minimap: { enabled: r.minicarte },
    wordWrap: retourLigne() ? 'on' : 'off'
  })
  tabulations = r.tabulations
  for (const m of monaco.editor.getModels()) m.updateOptions({ tabSize: tabulations })
}

// Un fichier ouvert a changé sur le disque : rechargé s'il n'est pas modifié
// dans Berger (curseur et défilement gardés) ; modifié des deux côtés, gardé.
async function apresDisque(chemins: string[]): Promise<void> {
  for (const chemin of new Set(chemins)) {
    const o = ouverts.get(chemin)
    if (!o) continue
    const r = await window.berger.demander<{ texte?: string }>('berger:lire', { chemin })
    if (ouverts.get(chemin) !== o || o.modele.isDisposed()) continue
    if (quoiFaire(modifie(chemin), o.texteCharge, r.texte ?? null) !== 'recharger') continue
    const texte = r.texte!
    const vue = affiche === chemin && editeur ? editeur.saveViewState() : null
    o.modele.pushEditOperations(
      [],
      [{ range: o.modele.getFullModelRange(), text: texte }],
      () => null
    )
    o.texteCharge = texte
    o.versionEnregistree = o.modele.getAlternativeVersionId()
    if (vue) editeur?.restoreViewState(vue)
    suivreModifies(chemin)
  }
}

// Markdown : repli par titres, comme VS Code (Monaco ne replie que selon le retrait).
monaco.languages.registerFoldingRangeProvider('markdown', {
  provideFoldingRanges: (modele) =>
    replisMarkdown(modele.getLinesContent()).map((r) => ({ start: r.debut, end: r.fin }))
})

export function initEditeur(m: string): void {
  maison = m
  // Le retour à la ligne suit l'état (relu au démarrage, basculé par ⌥Z).
  surChangement((e) => {
    const voulu = (e.retourLigne ?? reglagesActuels()?.reglages.editeur.retourLigne) ? 'on' : 'off'
    if (editeur && editeur.getRawOptions().wordWrap !== voulu)
      editeur.updateOptions({ wordWrap: voulu })
  })
  window.berger.ecouter(
    'berger:disque',
    ({ chemins }: { chemins: string[] }) => void apresDisque(chemins)
  )
  monaco.editor.onDidCreateModel((m) => m.updateOptions({ tabSize: tabulations }))
  const r = reglagesActuels()?.reglages.editeur
  editeur = monaco.editor.create(el('editeur'), {
    theme: 'berger-editeur',
    'semanticHighlighting.enabled': true,
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true },
    automaticLayout: true,
    fontFamily: r?.police ?? "'Fira Code', Menlo, monospace",
    fontLigatures: true,
    fontSize: r?.taille ?? 13,
    minimap: { enabled: r?.minicarte ?? true },
    wordWrap: retourLigne() ? 'on' : 'off',
    multiCursorModifier: 'alt',
    folding: true,
    scrollBeyondLastLine: false,
    fixedOverflowWidgets: true,
    // Le menu du clic droit hors du shadow DOM, pour qu'il reçoive les couleurs du thème.
    useShadowDOM: false
  })
  surReglages((e) => void appliquerReglages(e))
  // ⌘S passe par la table des raccourcis ; ⌘F est la recherche intégrée de Monaco.
  // « Organiser les imports » (⇧⌥O et menu du clic droit), fichiers TypeScript et JavaScript.
  const estTs = editeur.createContextKey<boolean>('bergerTypeScript', false)
  editeur.onDidChangeModel(() => {
    const m = editeur?.getModel()
    estTs.set(!!m && serveurDe(m.uri.fsPath) === 'typescript')
  })
  editeur.addAction({
    id: 'berger.organiserImports',
    label: 'Organiser les imports',
    keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyO],
    precondition: 'bergerTypeScript',
    contextMenuGroupId: '1_modification',
    run: (e) => {
      const m = e.getModel()
      if (m) void organiserImports(m)
    }
  })
  // Développement : le scénario `langage` pilote Monaco (voir src/main/scenario.ts).
  if (import.meta.env.DEV)
    (window as unknown as { bergerEssai: unknown }).bergerEssai = { monaco, editeur, modifie }
  editeur.onDidChangeCursorPosition(dessinerPosition)
  editeur.onDidChangeModelContent(() => {
    if (affiche) suivreModifies(affiche)
  })
}

// Le modèle porte l'adresse du fichier ; un modèle d'aperçu (⇧F12) est repris.
function adopter(chemin: string, texte: string): Ouvert {
  const uri = monaco.Uri.file(chemin)
  let modele = monaco.editor.getModel(uri)
  if (modele) {
    if (modele.getValue() !== texte) modele.setValue(texte)
  } else modele = monaco.editor.createModel(texte, langageDuFichier(chemin), uri)
  const o: Ouvert = {
    modele,
    texteCharge: texte,
    versionEnregistree: modele.getAlternativeVersionId(),
    vue: null
  }
  ouverts.set(chemin, o)
  brancherModele(chemin, modele)
  return o
}

function brancherModele(chemin: string, modele: monaco.editor.ITextModel): void {
  if (serveurDe(chemin)) suivreModele(chemin, modele)
  if (modele.getLanguageId() === 'json') suivreJson(chemin, modele)
}

// Attendre qu'un fichier soit affiché (aller à une définition dans un autre fichier).
const attentes = new Map<string, (() => void)[]>()
export function attendreAffichage(chemin: string): Promise<void> {
  if (affiche === chemin && editeur?.getModel() === ouverts.get(chemin)?.modele)
    return Promise.resolve()
  return new Promise((ok) => attentes.set(chemin, [...(attentes.get(chemin) ?? []), ok]))
}

export function revelerPlage(chemin: string, plage: monaco.IRange): void {
  if (!editeur || affiche !== chemin) return
  editeur.setSelection(plage)
  editeur.revealRangeInCenter(plage)
  editeur.focus()
}

export function modeleOuvert(chemin: string): monaco.editor.ITextModel | null {
  return ouverts.get(chemin)?.modele ?? null
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
    await colorationPrete
    if (affiche !== chemin) return true
    if (r.erreur !== undefined) {
      affiche = null
      dernierEchec = r.erreur
      return false
    }
    o = ouverts.get(chemin)
    if (!o) o = adopter(chemin, r.texte ?? '')
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
  for (const ok of attentes.get(chemin) ?? []) ok()
  attentes.delete(chemin)
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
    // Le modèle porte l'adresse du fichier : il est recréé sous la nouvelle,
    // avec son texte ; une modification en attente reste en attente.
    const avant = o.modele
    const etaitModifie = avant.getAlternativeVersionId() !== o.versionEnregistree
    const vue = affiche === ancien && editeur ? editeur.saveViewState() : o.vue
    const uri = monaco.Uri.file(nouveau)
    monaco.editor.getModel(uri)?.dispose()
    o.modele = monaco.editor.createModel(avant.getValue(), langageDuFichier(nouveau), uri)
    o.versionEnregistree = etaitModifie ? -1 : o.modele.getAlternativeVersionId()
    o.vue = vue
    if (affiche === ancien) {
      affiche = nouveau
      editeur?.setModel(o.modele)
      if (vue) editeur?.restoreViewState(vue)
      dessinerBandeau(nouveau)
    }
    avant.dispose()
    brancherModele(nouveau, o.modele)
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
