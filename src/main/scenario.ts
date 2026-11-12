import { appendFileSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app, type BrowserWindow } from 'electron'

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
// BERGER_SCENARIO=workspaces BERGER_SCENARIO_SORTIE=<préfixe>
//   Crée un workspace « Test Berger », y crée un space (⌘N), le renomme « Essai »,
//   change son emoji, le glisse en premier, revient au workspace d'origine, puis
//   le supprime (son space est fermé) et rouvre le workspace d'origine. Capture
//   et journal de workspaces.json à chaque étape. Ne ferme que le space créé.
// BERGER_SCENARIO=raccourcis : ⌃1, ⌃2, ⌥⌘], ⌥⌘[, ⌘], ⌘[ et le tri des agents, avec le
//   space et l'agent choisis après chaque touche dans le journal.
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

  if (scenario === 'raccourcis') {
    // ⌃1, ⌃2, ⌥⌘], ⌘], ⌘[ et le bouton de tri des agents : journal du space et
    // de l'agent choisis après chaque touche (aucune écriture).
    const choisis = async (nom: string): Promise<void> => {
      const r = await wc.executeJavaScript(`({
        space: document.querySelector('.ligne-space.choisi .nom')?.textContent,
        agent: document.querySelector('.ligne-agent.choisi')?.dataset.cle,
        tri: document.getElementById('tri-agents')?.title
      })`)
      console.log(`[berger] scénario : ${nom} ${JSON.stringify(r)}`)
    }
    const etapes: [string, () => void][] = [
      ['debut', () => {}],
      ['ctrl-1', () => touche('1', ['control'])],
      ['ctrl-2', () => touche('2', ['control'])],
      ['alt-cmd-]', () => touche(']', ['alt', 'meta'])],
      ['alt-cmd-[', () => touche('[', ['alt', 'meta'])],
      ['cmd-]', () => touche(']', ['meta'])],
      ['cmd-]-bis', () => touche(']', ['meta'])],
      ['cmd-[', () => touche('[', ['meta'])],
      ['tri', () => void wc.executeJavaScript("document.getElementById('tri-agents').click()")]
    ]
    jouer(
      etapes.map(([nom, faire], i) => [
        3000 + i * 1500,
        async () => {
          faire()
          await new Promise((ok) => setTimeout(ok, 700))
          await choisis(nom)
        }
      ])
    )
    return
  }

  if (scenario === 'workspaces') {
    jouerWorkspaces(w, capture, touche, lireSpace)
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

type Point = { x: number; y: number }

// Le scénario des workspaces : les boutons sont retrouvés par leur
// `aria-label` (ou leur texte), puis on joue de vrais événements souris.
function jouerWorkspaces(
  w: BrowserWindow,
  capture: (nom: string) => Promise<void>,
  touche: (keyCode: string, modifiers?: Mod[]) => void,
  lireSpace: LireSpace
): void {
  const wc = w.webContents
  const fichier = join(app.getPath('userData'), 'workspaces.json')
  type Ws = {
    id: string
    nom: string
    emoji: string
    spaces: string[]
    dernierSpace: string | null
  }
  const lire = (): { liste: Ws[]; ouvert: string } | null => {
    try {
      return JSON.parse(readFileSync(fichier, 'utf8'))
    } catch {
      return null
    }
  }
  const journal = (nom: string): void => {
    const e = lire()
    const resume = e?.liste.map(
      (x) => `${x.id === e.ouvert ? '*' : ''}${x.emoji} ${x.nom} [${x.spaces.length}]`
    )
    console.log(`[berger] scénario : ${nom} ${JSON.stringify(resume)}`)
  }
  const etape = (nom: string) => async (): Promise<void> => {
    await capture(nom)
    journal(nom)
  }
  // Le centre d'un élément : sélecteur CSS, ou texte d'une entrée de menu / d'un bouton.
  const centre = (selecteur: string, texte?: string): Promise<Point | null> =>
    wc.executeJavaScript(`(() => {
      const liste = [...document.querySelectorAll(${JSON.stringify(selecteur)})]
      const texte = ${JSON.stringify(texte ?? null)}
      const el = texte === null ? liste[0] : liste.find((e) => e.textContent.trim() === texte)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    })()`)
  const souris = async (
    bouton: 'left' | 'right',
    selecteur: string,
    texte?: string
  ): Promise<void> => {
    const p = await centre(selecteur, texte)
    if (!p) return console.error(`[berger] scénario : introuvable ${selecteur} ${texte ?? ''}`)
    wc.sendInputEvent({ type: 'mouseMove', x: p.x, y: p.y })
    wc.sendInputEvent({ type: 'mouseDown', x: p.x, y: p.y, button: bouton, clickCount: 1 })
    wc.sendInputEvent({ type: 'mouseUp', x: p.x, y: p.y, button: bouton, clickCount: 1 })
  }
  const clic = (sel: string, texte?: string) => () => souris('left', sel, texte)
  const clicDroit = (sel: string) => () => souris('right', sel)
  const glisser = (sel: string, vers: string) => async (): Promise<void> => {
    const a = await centre(sel)
    const b = await centre(vers)
    if (!a || !b) return console.error('[berger] scénario : glisser impossible')
    const y2 = b.y - 10
    wc.sendInputEvent({ type: 'mouseDown', x: a.x, y: a.y, button: 'left', clickCount: 1 })
    for (let i = 1; i <= 8; i++)
      wc.sendInputEvent({
        type: 'mouseMove',
        x: a.x,
        y: a.y + ((y2 - a.y) * i) / 8,
        button: 'left'
      })
    wc.sendInputEvent({ type: 'mouseUp', x: a.x, y: y2, button: 'left', clickCount: 1 })
  }
  const taper = (texte: string) => (): Promise<void> => wc.insertText(texte)
  const bouton = (nom: string): string => `#workspaces [aria-label="Workspace ${nom}"]`

  const depart = lire()
  const origine = depart?.ouvert ?? ''
  let cree: string[] = []
  const liste: [number, () => void | Promise<void>][] = [
    [2500, () => journal('00-debut')],
    [500, clic('[aria-label="Nouveau workspace"]')],
    [2000, etape('01-nouveau')],
    [500, taper('Test Berger')],
    [300, () => touche('Enter')],
    [2500, etape('02-cree')],
    [500, () => touche('n', ['meta'])],
    [4000, etape('03-space')],
    // Un deuxième space, supprimé par le clic droit sur sa ligne.
    [500, () => touche('n', ['meta'])],
    [4000, etape('03b-deux-spaces')],
    [500, clicDroit('#liste-spaces .ligne-space.choisi')],
    [1500, etape('03c-menu-space')],
    [500, clic('.menu .entree', 'Supprimer')],
    [1500, etape('03d-question-space')],
    [500, clic('.dialogue .bouton-dialogue', 'Supprimer')],
    [4000, etape('03e-space-supprime')],
    [500, clicDroit(bouton('Test Berger'))],
    [1500, etape('04-menu')],
    [500, clic('.menu .entree', 'Renommer')],
    [800, taper('Essai')],
    [300, () => touche('Enter')],
    [2000, etape('05-renomme')],
    [500, clicDroit(bouton('Essai'))],
    [800, clic('.menu .entree', "Changer l'emoji")],
    [800, taper('🧪')],
    [300, () => touche('Enter')],
    [2000, etape('06-emoji')],
    [500, glisser(bouton('Essai'), '#workspaces .workspace')],
    [2000, etape('07-deplace')],
    [500, clic(`#workspaces [data-id="${origine}"]`)],
    [2500, etape('08-retour')],
    [
      500,
      () => {
        cree = lire()?.liste.find((x) => x.nom === 'Essai')?.spaces ?? []
        console.log(`[berger] scénario : space créé ${JSON.stringify(cree)}`)
      }
    ],
    [300, clic(bouton('Essai'))],
    [1500, clicDroit(bouton('Essai'))],
    [800, clic('.menu .entree', 'Supprimer')],
    [1500, etape('09-question')],
    [500, clic('.dialogue .bouton-dialogue', 'Supprimer')],
    [4000, etape('10-supprime')],
    [
      300,
      async () => {
        for (const id of cree)
          console.log(
            `[berger] scénario : space ${id} dans le document : ${JSON.stringify(await lireSpace(id))}`
          )
      }
    ],
    // Retour au workspace d'origine, pour laisser les workspaces comme au début.
    [300, clic(`#workspaces [data-id="${origine}"]`)],
    [2500, etape('11-fin')]
  ]
  let t = 0
  for (const [delai, faire] of liste) {
    t += delai
    setTimeout(() => void faire(), t)
  }
}
