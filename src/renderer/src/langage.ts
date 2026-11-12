// L'aide du langage dans Monaco : des fournisseurs branchés sur les serveurs de
// langage de la partie Node (canaux `berger:lsp-*`, voir src/main/services/langage.ts).
// Une requête en erreur ou trop lente rend un résultat vide : jamais d'exception
// dans l'éditeur, jamais d'attente pour la frappe.
import * as monaco from 'monaco-editor'
import type {
  CompletionItem,
  CompletionList,
  Diagnostic,
  Hover,
  Location,
  LocationLink,
  ServerCapabilities,
  SemanticTokens,
  TextEdit,
  WorkspaceEdit,
  CodeAction,
  InsertReplaceEdit
} from 'vscode-languageserver-protocol'
import {
  appliquerEditions,
  editionsParFichier,
  graviteMonaco,
  idLsp,
  plageDeLsp,
  plageVersLsp,
  serveurDe,
  texteSurvol,
  versLsp
} from '../../shared/langage'
import { cleSemantique } from '../../shared/theme'
import { clesSemantiques, langageDuFichier } from './coloration'

type Options = {
  ouvrirA: (chemin: string, plage?: monaco.IRange) => Promise<void>
  modeleOuvert: (chemin: string) => monaco.editor.ITextModel | null
  annoncerArret: (texte: string) => void
}

type Suivi = {
  chemin: string
  modele: monaco.editor.ITextModel
  version: number
  cle: string | null
}

const suivis = new Map<string, Suivi>() // uri → suivi
const langagesBranches = new Set<string>()
let options: Options | null = null

const MESSAGES_ARRET: Record<string, string> = {
  typescript: "Le service TypeScript s'est arrêté.",
  yaml: "Le service YAML s'est arrêté."
}

const cheminDe = (m: monaco.editor.ITextModel): string => m.uri.fsPath

async function requete<T>(chemin: string, methode: string, params: unknown): Promise<T | null> {
  try {
    const r = await window.berger.demander<{ resultat?: unknown; erreur?: string }>(
      'berger:lsp-requete',
      { fichier: chemin, methode, params }
    )
    return r.erreur !== undefined ? null : ((r.resultat ?? null) as T | null)
  } catch {
    return null
  }
}

const notifier = (chemin: string, methode: string, params: unknown): void =>
  window.berger.envoyer('berger:lsp-notifier', { fichier: chemin, methode, params })

const docLsp = (m: monaco.editor.ITextModel): { uri: string } => ({ uri: m.uri.toString() })

// Le modèle d'un fichier : celui qui existe, sinon lu et créé (aperçus de ⇧F12).
export async function modelePour(chemin: string): Promise<monaco.editor.ITextModel | null> {
  const uri = monaco.Uri.file(chemin)
  const existant = monaco.editor.getModel(uri)
  if (existant) return existant
  const r = await window.berger.demander<{ texte?: string; erreur?: string }>('berger:lire', {
    chemin
  })
  if (r.texte === undefined) return null
  return (
    monaco.editor.getModel(uri) ?? monaco.editor.createModel(r.texte, langageDuFichier(chemin), uri)
  )
}

function ouvrir(s: Suivi): void {
  notifier(s.chemin, 'textDocument/didOpen', {
    textDocument: {
      uri: s.modele.uri.toString(),
      languageId: idLsp(s.chemin),
      version: s.version,
      text: s.modele.getValue()
    }
  })
}

export function suivreModele(chemin: string, modele: monaco.editor.ITextModel): void {
  const cle = modele.uri.toString()
  if (suivis.has(cle) || !serveurDe(chemin)) return
  const s: Suivi = { chemin, modele, version: 1, cle: null }
  suivis.set(cle, s)
  void window.berger
    .demander<string | null>('berger:lsp-cle', { fichier: chemin })
    .then((c) => (s.cle = c))
  ouvrir(s)
  void brancherLangage(modele.getLanguageId(), chemin)
  const changement = modele.onDidChangeContent((e) => {
    s.version++
    notifier(chemin, 'textDocument/didChange', {
      textDocument: { uri: cle, version: s.version },
      contentChanges: e.changes.map((c) => ({
        range: plageVersLsp(c.range),
        rangeLength: c.rangeLength,
        text: c.text
      }))
    })
  })
  modele.onWillDispose(() => {
    changement.dispose()
    suivis.delete(cle)
    notifier(chemin, 'textDocument/didClose', { textDocument: { uri: cle } })
  })
}

// --- conversions vers Monaco ---

const K = monaco.languages.CompletionItemKind
// CompletionItemKind du protocole (1 à 25) → Monaco.
const GENRES = [
  K.Text,
  K.Text,
  K.Method,
  K.Function,
  K.Constructor,
  K.Field,
  K.Variable,
  K.Class,
  K.Interface,
  K.Module,
  K.Property,
  K.Unit,
  K.Value,
  K.Enum,
  K.Keyword,
  K.Snippet,
  K.Color,
  K.File,
  K.Reference,
  K.Folder,
  K.EnumMember,
  K.Constant,
  K.Struct,
  K.Event,
  K.Operator,
  K.TypeParameter
]

const plage = (r: Parameters<typeof plageDeLsp>[0]): monaco.IRange => plageDeLsp(r)

const documentation = (
  d: CompletionItem['documentation']
): monaco.IMarkdownString | string | undefined =>
  d === undefined ? undefined : typeof d === 'string' ? d : { value: d.value }

const editionMonaco = (e: TextEdit): monaco.languages.TextEdit => ({
  range: plage(e.range),
  text: e.newText
})

type ElementBerger = monaco.languages.CompletionItem & { brut: CompletionItem; chemin: string }

function elementMonaco(i: CompletionItem, defaut: monaco.IRange, chemin: string): ElementBerger {
  const te = i.textEdit as TextEdit | InsertReplaceEdit | undefined
  const range: monaco.languages.CompletionItem['range'] = !te
    ? defaut
    : 'range' in te
      ? plage(te.range)
      : { insert: plage(te.insert), replace: plage(te.replace) }
  return {
    label: i.labelDetails
      ? { label: i.label, detail: i.labelDetails.detail, description: i.labelDetails.description }
      : i.label,
    kind: GENRES[i.kind ?? 1] ?? K.Text,
    detail: i.detail,
    documentation: documentation(i.documentation),
    sortText: i.sortText,
    filterText: i.filterText,
    preselect: i.preselect,
    insertText: te?.newText ?? i.insertText ?? i.label,
    insertTextRules:
      i.insertTextFormat === 2
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
    range,
    commitCharacters: i.commitCharacters,
    additionalTextEdits: i.additionalTextEdits?.map(editionMonaco),
    tags: i.tags,
    brut: i,
    chemin
  }
}

const emplacements = (r: Location | Location[] | LocationLink[] | null): LocationLink[] =>
  !r
    ? []
    : (Array.isArray(r) ? r : [r]).map((x) =>
        'targetUri' in x
          ? x
          : { targetUri: x.uri, targetRange: x.range, targetSelectionRange: x.range }
      )

async function versMonaco(liens: LocationLink[]): Promise<monaco.languages.LocationLink[]> {
  // Les autres fichiers ont besoin d'un modèle pour l'aperçu.
  const chemins = [...new Set(liens.map((l) => monaco.Uri.parse(l.targetUri).fsPath))]
  await Promise.all(chemins.map((c) => modelePour(c)))
  return liens.map((l) => ({
    uri: monaco.Uri.parse(l.targetUri),
    range: plage(l.targetSelectionRange ?? l.targetRange),
    targetSelectionRange: plage(l.targetSelectionRange ?? l.targetRange),
    originSelectionRange: l.originSelectionRange ? plage(l.originSelectionRange) : undefined
  }))
}

const suivi = (m: monaco.editor.ITextModel): Suivi | undefined => suivis.get(m.uri.toString())

// --- renommage ---

async function renommer(
  m: monaco.editor.ITextModel,
  p: monaco.Position,
  nom: string
): Promise<monaco.languages.WorkspaceEdit & monaco.languages.Rejection> {
  const r = await requete<WorkspaceEdit>(cheminDe(m), 'textDocument/rename', {
    textDocument: docLsp(m),
    position: versLsp(p),
    newName: nom
  })
  if (!r) return { edits: [], rejectReason: 'Ce symbole ne peut pas être renommé.' }
  const edits: monaco.languages.IWorkspaceTextEdit[] = []
  for (const [chemin, liste] of editionsParFichier(r)) {
    const ouvert = options?.modeleOuvert(chemin) ?? (chemin === cheminDe(m) ? m : null)
    if (ouvert) {
      for (const e of liste)
        edits.push({ resource: ouvert.uri, textEdit: editionMonaco(e), versionId: undefined })
      continue
    }
    // Fichier sans onglet : modifié et écrit sur le disque tout de suite.
    const lu = await window.berger.demander<{ texte?: string }>('berger:lire', { chemin })
    if (lu.texte === undefined) continue
    const texte = appliquerEditions(lu.texte, liste)
    const ecrit = await window.berger.demander<{ ok?: boolean }>('berger:ecrire', {
      chemin,
      texte,
      texteCharge: lu.texte
    })
    const apercu = monaco.editor.getModel(monaco.Uri.file(chemin))
    if (apercu) {
      if (ecrit.ok) apercu.setValue(texte)
      else apercu.dispose()
    }
  }
  return { edits }
}

// --- organiser les imports ---

export async function organiserImports(m: monaco.editor.ITextModel): Promise<void> {
  if (serveurDe(cheminDe(m)) !== 'typescript') return
  const fin = m.getFullModelRange()
  const r = await requete<CodeAction[]>(cheminDe(m), 'textDocument/codeAction', {
    textDocument: docLsp(m),
    range: plageVersLsp(fin),
    context: { diagnostics: [], only: ['source.organizeImports'] }
  })
  const action = r?.find((a) => 'edit' in a && a.edit)
  if (!action?.edit || m.isDisposed()) return
  const liste = editionsParFichier(action.edit).get(cheminDe(m)) ?? []
  m.pushStackElement()
  m.pushEditOperations(
    [],
    liste.map((e) => ({ range: plage(e.range), text: e.newText })),
    () => null
  )
  m.pushStackElement()
}

// --- jetons sémantiques ---

function jetonsSemantiques(
  donnees: number[],
  legende: { tokenTypes: string[]; tokenModifiers: string[] },
  types: Map<string, number>
): Uint32Array {
  const sortie: number[] = []
  let ligne = 0
  let car = 0
  let ligneSortie = 0
  let carSortie = 0
  for (let i = 0; i + 4 < donnees.length; i += 5) {
    ligne += donnees[i]
    car = donnees[i] === 0 ? car + donnees[i + 1] : donnees[i + 1]
    const mods = legende.tokenModifiers.filter((_, k) => donnees[i + 4] & (1 << k))
    const type = types.get(cleSemantique(legende.tokenTypes[donnees[i + 3]] ?? '', mods))
    // Un jeton sans style garde la couleur TextMate (comme VS Code).
    if (type === undefined) continue
    const dl = ligne - ligneSortie
    sortie.push(dl, dl === 0 ? car - carSortie : car, donnees[i + 2], type, 0)
    ligneSortie = ligne
    carSortie = car
  }
  return new Uint32Array(sortie)
}

// --- branchement des fournisseurs, une fois par langage ---

async function brancherLangage(langage: string, chemin: string): Promise<void> {
  if (langagesBranches.has(langage)) return
  langagesBranches.add(langage)
  const capacites = await window.berger
    .demander<ServerCapabilities | null>('berger:lsp-capacites', { fichier: chemin })
    .catch(() => null)
  if (!capacites) {
    langagesBranches.delete(langage)
    return
  }
  if (capacites.completionProvider)
    monaco.languages.registerCompletionItemProvider(langage, {
      triggerCharacters: capacites.completionProvider.triggerCharacters,
      async provideCompletionItems(m, p, contexte) {
        if (!suivi(m)) return { suggestions: [] }
        const r = await requete<CompletionList | CompletionItem[]>(
          cheminDe(m),
          'textDocument/completion',
          {
            textDocument: docLsp(m),
            position: versLsp(p),
            context: {
              triggerKind: contexte.triggerKind + 1,
              triggerCharacter: contexte.triggerCharacter
            }
          }
        )
        const mot = m.getWordUntilPosition(p)
        const defaut = new monaco.Range(p.lineNumber, mot.startColumn, p.lineNumber, mot.endColumn)
        const liste = !r ? [] : Array.isArray(r) ? r : r.items
        return {
          suggestions: liste.map((i) => elementMonaco(i, defaut, cheminDe(m))),
          incomplete: !!r && !Array.isArray(r) && r.isIncomplete
        }
      },
      resolveCompletionItem: capacites.completionProvider.resolveProvider
        ? async (element) => {
            const e = element as ElementBerger
            const r = await requete<CompletionItem>(e.chemin, 'completionItem/resolve', e.brut)
            if (!r) return element
            return {
              ...element,
              detail: r.detail ?? element.detail,
              documentation: documentation(r.documentation) ?? element.documentation,
              additionalTextEdits:
                r.additionalTextEdits?.map(editionMonaco) ?? element.additionalTextEdits
            }
          }
        : undefined
    })
  if (capacites.hoverProvider)
    monaco.languages.registerHoverProvider(langage, {
      async provideHover(m, p) {
        if (!suivi(m)) return null
        const r = await requete<Hover>(cheminDe(m), 'textDocument/hover', {
          textDocument: docLsp(m),
          position: versLsp(p)
        })
        if (!r) return null
        const texte = texteSurvol(r.contents)
        if (!texte.trim()) return null
        return { contents: [{ value: texte }], range: r.range ? plage(r.range) : undefined }
      }
    })
  if (capacites.definitionProvider)
    monaco.languages.registerDefinitionProvider(langage, {
      async provideDefinition(m, p) {
        if (!suivi(m)) return null
        const r = await requete<Location | Location[] | LocationLink[]>(
          cheminDe(m),
          'textDocument/definition',
          { textDocument: docLsp(m), position: versLsp(p) }
        )
        return versMonaco(emplacements(r))
      }
    })
  if (capacites.referencesProvider)
    monaco.languages.registerReferenceProvider(langage, {
      async provideReferences(m, p, contexte) {
        if (!suivi(m)) return null
        const r = await requete<Location[]>(cheminDe(m), 'textDocument/references', {
          textDocument: docLsp(m),
          position: versLsp(p),
          context: { includeDeclaration: contexte.includeDeclaration }
        })
        return versMonaco(emplacements(r))
      }
    })
  if (capacites.renameProvider)
    monaco.languages.registerRenameProvider(langage, {
      provideRenameEdits: (m, p, nom) => renommer(m, p, nom)
    })
  const legende = capacites.semanticTokensProvider?.legend
  if (legende && capacites.semanticTokensProvider?.full) {
    const noms = [...clesSemantiques()]
    const types = new Map(noms.map((n, i) => [n, i]))
    monaco.languages.registerDocumentSemanticTokensProvider(langage, {
      getLegend: () => ({ tokenTypes: noms, tokenModifiers: [] }),
      async provideDocumentSemanticTokens(m) {
        if (!suivi(m)) return null
        const r = await requete<SemanticTokens>(cheminDe(m), 'textDocument/semanticTokens/full', {
          textDocument: docLsp(m)
        })
        if (!r) return null
        return { data: jetonsSemantiques(r.data, legende, types), resultId: undefined }
      },
      releaseDocumentSemanticTokens: () => undefined
    })
  }
}

// --- diagnostics et vie des serveurs ---

function poserDiagnostics(p: { uri: string; diagnostics: Diagnostic[] }): void {
  const m = monaco.editor.getModel(monaco.Uri.parse(p.uri))
  if (!m) return
  monaco.editor.setModelMarkers(
    m,
    'berger-lsp',
    p.diagnostics.map((d) => ({
      ...plage(d.range),
      severity: graviteMonaco(d.severity),
      message: typeof d.message === 'string' ? d.message : d.message.value,
      code: d.code === undefined ? undefined : String(d.code),
      source: d.source,
      tags: d.tags as monaco.MarkerTag[] | undefined
    }))
  )
}

// Un fichier du projet a changé sur le disque (un agent) : les fichiers ouverts
// sont redonnés au serveur, qui recalcule leurs erreurs.
let relecture: ReturnType<typeof setTimeout> | undefined
function apresDisque(chemins: string[]): void {
  if (!chemins.some((c) => serveurDe(c) || /(^|\/)(tsconfig[^/]*|jsconfig|package)\.json$/.test(c)))
    return
  clearTimeout(relecture)
  relecture = setTimeout(() => {
    for (const s of suivis.values()) {
      if (s.modele.isDisposed()) continue
      s.version++
      notifier(s.chemin, 'textDocument/didChange', {
        textDocument: { uri: s.modele.uri.toString(), version: s.version },
        contentChanges: [{ text: s.modele.getValue() }]
      })
    }
  }, 500)
}

export function initLangage(o: Options): void {
  options = o
  window.berger.ecouter('berger:disque', ({ chemins }: { chemins: string[] }) =>
    apresDisque(chemins)
  )
  window.berger.ecouter('berger:lsp-notif', ({ methode, params }) => {
    if (methode === 'textDocument/publishDiagnostics') poserDiagnostics(params)
  })
  // Un serveur relancé ne connaît plus les fichiers ouverts : on les lui redonne.
  window.berger.ecouter('berger:lsp-redemarre', ({ cle }: { cle: string }) => {
    for (const s of suivis.values()) if (s.cle === cle) ouvrir(s)
  })
  window.berger.ecouter('berger:lsp-arrete', ({ serveur }: { serveur: string }) => {
    options?.annoncerArret(MESSAGES_ARRET[serveur] ?? "Un service de langage s'est arrêté.")
  })
  // Aller à un autre fichier (F12, ⌘ clic, aperçu) : son onglet s'ouvre.
  monaco.editor.registerEditorOpener({
    openCodeEditor(_source, resource, selection) {
      if (resource.scheme !== 'file') return false
      const r =
        selection && 'startLineNumber' in selection
          ? selection
          : selection
            ? new monaco.Range(
                selection.lineNumber,
                selection.column,
                selection.lineNumber,
                selection.column
              )
            : undefined
      void o.ouvrirA(resource.fsPath, r)
      return true
    }
  })
}
