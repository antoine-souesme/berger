import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker'
import { langageDe } from '../../shared/fichiers'

self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'json') return new JsonWorker()
    if (['css', 'scss', 'less'].includes(label)) return new CssWorker()
    if (['html', 'handlebars', 'razor'].includes(label)) return new HtmlWorker()
    if (['typescript', 'javascript'].includes(label)) return new TsWorker()
    return new EditorWorker()
  }
}

// Couleurs reprises du thème `antoine-monokai` de Herdr (voir COPIES.md).
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
    'editorLineNumber.foreground': '#75715e'
  }
})

const zone = (): HTMLElement => document.getElementById('editeur-texte')!
let editeur: monaco.editor.IStandaloneCodeEditor | null = null
let cheminOuvert: string | null = null
let texteCharge = ''

function annoncer(texte: string): void {
  const el = document.getElementById('editeur-message')!
  el.textContent = texte
  el.hidden = !texte
}

export function initEditeur(): void {
  editeur = monaco.editor.create(zone(), {
    theme: 'antoine-monokai',
    automaticLayout: true,
    fontFamily: 'Menlo, monospace',
    fontSize: 13,
    minimap: { enabled: true },
    value: ''
  })
  // cmd-s : enregistrer. cmd-f est la recherche intégrée de Monaco.
  editeur.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => void enregistrer())
}

export async function ouvrirFichier(chemin: string): Promise<void> {
  const r = await window.berger.demander<{ texte?: string; erreur?: string }>('berger:lire', {
    chemin
  })
  if (r.erreur !== undefined) {
    annoncer(r.erreur)
    return
  }
  cheminOuvert = chemin
  texteCharge = r.texte ?? ''
  const ancien = editeur!.getModel()
  editeur!.setModel(monaco.editor.createModel(texteCharge, langageDe(chemin)))
  ancien?.dispose()
  document.getElementById('editeur-chemin')!.textContent = chemin
  annoncer('')
  editeur!.focus()
}

async function enregistrer(): Promise<void> {
  if (!cheminOuvert || !editeur) return
  const texte = editeur.getValue()
  const r = await window.berger.demander<{ ok?: boolean; annule?: boolean; erreur?: string }>(
    'berger:ecrire',
    {
      chemin: cheminOuvert,
      texte,
      texteCharge
    }
  )
  if (r.ok) {
    texteCharge = texte
    annoncer('Enregistré')
    setTimeout(() => annoncer(''), 1500)
  } else if (r.erreur) {
    annoncer(r.erreur)
  }
}
