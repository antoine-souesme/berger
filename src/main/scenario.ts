import { appendFileSync, writeFileSync } from 'fs'
import type { BrowserWindow } from 'electron'

// Vérification de l'éditeur sans clic (développement seulement) :
// BERGER_SCENARIO=editeur BERGER_SCENARIO_DOSSIER=<dossier> BERGER_SCENARIO_SORTIE=<préfixe des captures>
// Le dossier doit contenir `essai.md`. BERGER_SCENARIO=conflit modifie le
// fichier sur le disque avant l'enregistrement.
export function jouerScenario(w: BrowserWindow): void {
  const scenario = process.env['BERGER_SCENARIO']
  const dossier = process.env['BERGER_SCENARIO_DOSSIER']
  const sortie = process.env['BERGER_SCENARIO_SORTIE'] ?? 'capture'
  if (!scenario || !dossier) return
  const wc = w.webContents
  const touche = (keyCode: string, modifiers: ('meta' | 'shift')[] = []): void => {
    wc.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
    wc.sendInputEvent({ type: 'keyUp', keyCode, modifiers })
  }
  const capture = async (nom: string): Promise<void> => {
    writeFileSync(`${sortie}-${nom}.png`, (await wc.capturePage()).toPNG())
    console.log(`[berger] scénario : capture ${nom}`)
  }
  const etapes: [number, () => void | Promise<void>][] = [
    [1500, () => wc.send('berger:dossier', { dossier })],
    [2500, () => wc.insertText(process.env['BERGER_SCENARIO_FICHIER'] ?? 'essai')],
    [3000, () => touche('Enter')],
    [4000, () => touche('f', ['meta'])],
    [4500, () => wc.insertText('Monaco')],
    [5500, () => capture('recherche')],
    [6000, () => touche('Escape')],
    [6300, () => touche('Up', ['meta'])],
    [6600, () => wc.insertText('Ligne ajoutée par Berger\n')],
    [
      7000,
      () => {
        if (scenario === 'conflit') appendFileSync(`${dossier}/essai.md`, '\nModifié par un agent\n')
      }
    ],
    [7300, () => touche('s', ['meta'])],
    [8300, () => capture('enregistre')]
  ]
  for (const [delai, faire] of etapes) setTimeout(() => void faire(), delai)
}
