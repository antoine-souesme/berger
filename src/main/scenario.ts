import { appendFileSync, unlinkSync, writeFileSync } from 'fs'
import type { BrowserWindow } from 'electron'

// Vérification sans clic (développement seulement), avec des captures.
//
// BERGER_SCENARIO=editeur BERGER_SCENARIO_DOSSIER=<dossier> BERGER_SCENARIO_SORTIE=<préfixe>
//   Le dossier doit contenir `essai.md` et `long.txt` (lignes de 400 caractères). BERGER_SCENARIO=conflit modifie le
//   fichier sur le disque avant l'enregistrement, BERGER_SCENARIO=supprime le
//   supprime (la question « n'a pas pu être relu » doit venir). À la fin, une
//   modification de `long.txt` puis ⌘W (la question d'enregistrement doit venir).
// BERGER_SCENARIO=cadre BERGER_SCENARIO_SPACE=<id d'un space de test> BERGER_SCENARIO_SORTIE=<préfixe>
//   Joue les actions de structure (⌘T, ⌘D, ⇧⌘D, ⌥⌘←, ⌥⇧⌘→, F2, ⇧⌘↵, menus,
//   ⇧⌘W, ⌘W) dans ce space seulement ; refuse tout space dont l'id ne
//   commence pas par `spbergertest`. BERGER_SCENARIO=ranger ferme ce space
//   (⌘W sur son onglet ; avec BERGER_SCENARIO_REPONSE=0, la question est acceptée).
type Mod = 'meta' | 'shift' | 'alt' | 'control'
type LireSpace = (id: string) => Promise<unknown>

export function jouerScenario(w: BrowserWindow, lireSpace: LireSpace): void {
  const scenario = process.env['BERGER_SCENARIO']
  if (!scenario) return
  const sortie = process.env['BERGER_SCENARIO_SORTIE'] ?? 'capture'
  const wc = w.webContents
  const touche = (keyCode: string, modifiers: Mod[] = []): void => {
    wc.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
    wc.sendInputEvent({ type: 'keyUp', keyCode, modifiers })
  }
  const clicDroit = (x: number, y: number): void => {
    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'right', clickCount: 1 })
    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'right', clickCount: 1 })
  }
  const capture = async (nom: string): Promise<void> => {
    writeFileSync(`${sortie}-${nom}.png`, (await wc.capturePage()).toPNG())
    console.log(`[berger] scénario : capture ${nom}`)
  }
  const lent = Number(process.env['BERGER_SCENARIO_LENTEUR'] ?? 1)
  const jouer = (etapes: [number, () => void | Promise<void>][]): void => {
    for (const [delai, faire] of etapes) setTimeout(() => void faire(), delai * lent)
  }

  if (scenario === 'editeur' || scenario === 'conflit' || scenario === 'supprime') {
    const dossier = process.env['BERGER_SCENARIO_DOSSIER']
    if (!dossier) return
    jouer([
      [1500, () => wc.send('berger:scenario-fichier', { chemin: `${dossier}/essai.md` })],
      [3000, () => touche('f', ['meta'])],
      [3500, () => wc.insertText('Monaco')],
      [4500, () => capture('recherche')],
      [5000, () => touche('Escape')],
      [5300, () => touche('Up', ['meta'])],
      [5600, () => wc.insertText('Ligne ajoutée par Berger\n')],
      [6000, () => capture('modifie')],
      [
        6200,
        () => {
          if (scenario === 'conflit')
            appendFileSync(`${dossier}/essai.md`, '\nModifié par un agent\n')
          if (scenario === 'supprime') unlinkSync(`${dossier}/essai.md`)
        }
      ],
      [6500, () => touche('s', ['meta'])],
      [7500, () => capture('enregistre')],
      // Lignes longues : la fin d'une ligne défilée reste lisible à gauche de la minicarte.
      [8000, () => wc.send('berger:scenario-fichier', { chemin: `${dossier}/long.txt` })],
      [9800, () => touche('End')],
      [10800, () => capture('minicarte')],
      [11000, () => wc.insertText('x')],
      [11500, () => touche('w', ['meta'])],
      [12500, () => capture('question-fermeture')]
    ])
    return
  }

  if (scenario === 'ranger') {
    // Ferme le dernier onglet affiché du space de test (et donc le space) ;
    // avec BERGER_SCENARIO_REPONSE=0 la question est acceptée.
    const space = process.env['BERGER_SCENARIO_SPACE'] ?? ''
    if (!space.startsWith('spbergertest')) {
      console.error(
        '[berger] scénario ranger refusé : BERGER_SCENARIO_SPACE doit commencer par spbergertest'
      )
      return
    }
    jouer([
      [3500, () => wc.send('berger:scenario-space', { space })],
      [6000, () => touche('w', ['meta'])],
      [
        7000,
        async () =>
          console.log(`[berger] scénario : rangé ${JSON.stringify(await lireSpace(space))}`)
      ]
    ])
    return
  }

  if (scenario === 'cadre') {
    const space = process.env['BERGER_SCENARIO_SPACE'] ?? ''
    if (!space.startsWith('spbergertest')) {
      console.error(
        '[berger] scénario cadre refusé : BERGER_SCENARIO_SPACE doit commencer par spbergertest'
      )
      return
    }
    const etape = (nom: string) => async (): Promise<void> => {
      await capture(nom)
      console.log(`[berger] scénario : ${nom} ${JSON.stringify(await lireSpace(space))}`)
    }
    const pas = 2500
    const glisser = (x1: number, x2: number, y: number): void => {
      wc.sendInputEvent({ type: 'mouseDown', x: x1, y, button: 'left', clickCount: 1 })
      for (let i = 1; i <= 5; i++)
        wc.sendInputEvent({ type: 'mouseMove', x: x1 + ((x2 - x1) * i) / 5, y, button: 'left' })
      wc.sendInputEvent({ type: 'mouseUp', x: x2, y, button: 'left', clickCount: 1 })
    }
    const largeur = Number(process.env['BERGER_SCENARIO_LARGEUR'] ?? 0)
    const liste: (() => void | Promise<void>)[] = [
      () => wc.send('berger:scenario-space', { space }),
      // BERGER_SCENARIO_LARGEUR=<px> : tire le séparateur de l'explorateur de ce nombre de pixels.
      () => {
        if (largeur) glisser(351, 351 + largeur, 450)
      },
      etape('01-debut'),
      () => touche('t', ['meta']),
      etape('02-nouvel-onglet'),
      () => touche('d', ['meta']),
      etape('03-divise-droite'),
      () => touche('d', ['meta', 'shift']),
      etape('04-divise-bas'),
      () => touche('Left', ['meta', 'alt']),
      etape('05-aller-gauche'),
      () => touche('Right', ['meta', 'alt', 'shift']),
      etape('06-echange-droite'),
      () => touche('F2'),
      () => wc.insertText('essai'),
      () => touche('Enter'),
      etape('07-renomme'),
      () => touche('Enter', ['meta', 'shift']),
      etape('08-agrandi'),
      () => touche('Enter', ['meta', 'shift']),
      etape('09-retabli'),
      () => clicDroit(1000, 300),
      etape('10-menu-panneau'),
      () => touche('Escape'),
      () => clicDroit(640, 26),
      etape('11-menu-onglet'),
      () => touche('Escape'),
      () => touche('w', ['meta', 'shift']),
      etape('12-panneau-ferme'),
      () => touche('w', ['meta']),
      etape('13-onglet-ferme')
    ]
    jouer(liste.map((f, i) => [2000 + i * pas, f]))
  }
}
