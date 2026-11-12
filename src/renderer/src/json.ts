// Les schémas du service JSON de Monaco : un par modèle JSON ouvert dont le
// schéma est connu (`$schema` déclaré, sinon la table de SchemaStore), lu par
// la partie Node (`berger:schema`).
import * as monaco from 'monaco-editor'
import { schemaJson } from '../../shared/schemas'

type Schema = { uri: string; fileMatch: string[]; schema: unknown }
const parModele = new Map<string, Schema>()
const suivis = new Set<string>()

function appliquer(): void {
  monaco.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    trailingCommas: 'warning',
    enableSchemaRequest: false,
    schemaRequest: 'ignore',
    schemas: [...parModele.values()]
  })
}

// La coloration vient des grammaires de VS Code (coloration.ts), pas du mode JSON.
export function initJson(): void {
  monaco.json.jsonDefaults.setModeConfiguration({
    ...monaco.json.jsonDefaults.modeConfiguration,
    tokens: false
  })
  appliquer()
}

async function relire(chemin: string, modele: monaco.editor.ITextModel): Promise<void> {
  const cle = modele.uri.toString()
  const url = schemaJson(chemin, modele.getValue())
  const avant = parModele.get(cle)
  if (avant?.uri === url) return
  let schema: unknown = null
  if (url) {
    const texte = await window.berger.demander<string | null>('berger:schema', { url })
    try {
      schema = texte ? JSON.parse(texte) : null
    } catch {
      schema = null
    }
  }
  if (modele.isDisposed()) return
  if (url && schema) parModele.set(cle, { uri: url, fileMatch: [cle], schema })
  else if (!avant) return
  else parModele.delete(cle)
  appliquer()
}

export function suivreJson(chemin: string, modele: monaco.editor.ITextModel): void {
  const cle = modele.uri.toString()
  if (suivis.has(cle)) return
  suivis.add(cle)
  void relire(chemin, modele)
  let minuteur: ReturnType<typeof setTimeout> | undefined
  const changement = modele.onDidChangeContent(() => {
    clearTimeout(minuteur)
    minuteur = setTimeout(() => void relire(chemin, modele), 1000)
  })
  modele.onWillDispose(() => {
    clearTimeout(minuteur)
    changement.dispose()
    suivis.delete(cle)
    if (parModele.delete(cle)) appliquer()
  })
}
