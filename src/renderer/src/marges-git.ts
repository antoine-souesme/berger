// Les différences git dans la marge de l'éditeur (maquette differences.html a) :
// barre verte pour une ligne ajoutée, bleue pour une ligne modifiée, triangle
// rose là où des lignes ont été supprimées, par rapport au dernier commit. Mis à
// jour en tapant ; le dernier commit est relu au retour dans la fenêtre et de
// temps en temps (un commit fait dans un terminal).
import * as monaco from 'monaco-editor'
import { marquesDiff } from '../../shared/diff-lignes'

const RELECTURE = 4000

let editeur: monaco.editor.IStandaloneCodeEditor | null = null
let marques: monaco.editor.IEditorDecorationsCollection | null = null
let modele: monaco.editor.ITextModel | null = null
let origine: string | null = null
let suivi: monaco.IDisposable | null = null
let attente: ReturnType<typeof setTimeout> | undefined

const couleur = (nom: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(nom).trim()

function dessiner(): void {
  if (!marques) return
  if (!modele || origine === null) return marques.clear()
  const vert = couleur('--vert')
  const bleu = couleur('--clavier')
  const rose = couleur('--rouge')
  const regle = (c: string): monaco.editor.IModelDecorationOverviewRulerOptions => ({
    color: c,
    position: monaco.editor.OverviewRulerLane.Left
  })
  marques.set(
    marquesDiff(origine, modele.getValue()).map((m) =>
      m.type === 'suppression'
        ? {
            range: new monaco.Range(m.ligne, 1, m.ligne, 1),
            options: {
              linesDecorationsClassName: m.enBas ? 'git-suppression bas' : 'git-suppression',
              overviewRuler: regle(rose)
            }
          }
        : {
            range: new monaco.Range(m.debut, 1, m.fin, 1),
            options: {
              isWholeLine: true,
              linesDecorationsClassName: m.type === 'ajout' ? 'git-ajout' : 'git-modif',
              overviewRuler: regle(m.type === 'ajout' ? vert : bleu)
            }
          }
    )
  )
}

async function relire(): Promise<void> {
  const m = modele
  if (!m) return
  const texte = await window.berger.demander<string | null>('berger:texte-commit', {
    chemin: m.uri.fsPath
  })
  if (modele !== m || texte === origine) return
  origine = texte
  dessiner()
}

export function initMargesGit(e: monaco.editor.IStandaloneCodeEditor): void {
  editeur = e
  marques = editeur.createDecorationsCollection()
  window.addEventListener('focus', () => void relire())
  setInterval(() => {
    if (document.visibilityState === 'visible' && modele) void relire()
  }, RELECTURE)
}

// Le fichier affiché a changé (ou plus aucun fichier : `null`).
export function suivreMargesGit(m: monaco.editor.ITextModel | null): void {
  if (m === modele) return
  suivi?.dispose()
  suivi = null
  clearTimeout(attente)
  modele = m
  origine = null
  dessiner()
  if (!m) return
  suivi = m.onDidChangeContent(() => {
    clearTimeout(attente)
    attente = setTimeout(dessiner, 200)
  })
  void relire()
}
