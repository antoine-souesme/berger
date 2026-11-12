import { appendFileSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app, Menu, type BrowserWindow } from 'electron'
import { execFile } from 'child_process'

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
// BERGER_SCENARIO=onglets BERGER_SCENARIO_FICHIERS=<chemin>:<chemin>:… BERGER_SCENARIO_SORTIE=<préfixe>
//   Ouvre ces fichiers (chemins contenant `berger-essai`), épingle celui qui finit par
//   `notes.md` par le menu de son onglet, tape dans le dernier ouvert, capture.
// BERGER_SCENARIO=explorateur BERGER_SCENARIO_DOSSIER=<dossier berger-essai…> BERGER_SCENARIO_SORTIE=<préfixe>
//   Ajoute ce dossier comme racine, déplie `node_modules`, crée `nouveau.txt` (il doit
//   apparaître seul), ⇧⌘E deux fois, retire la racine. Une capture par étape.
// BERGER_SCENARIO=fichiers BERGER_SCENARIO_DOSSIER=<dossier berger-essai…> BERGER_SCENARIO_SORTIE=<préfixe>
//   (BERGER_SCENARIO_REPONSE=1 : « Garder les deux » à la question de conflit). Le dossier
//   contient src/main/index.ts, src/renderer/index.ts, logo.png ; un dossier voisin
//   `<dossier>-externe` contient externe.txt et ouvert.md (« du Finder »). Ajoute le dossier
//   comme racine, crée a.txt et notes sur place, renomme a.txt en b.txt, copie-colle b.txt,
//   glisse b.txt sur notes, colle « b copie.txt » dans notes puis y glisse celui de la racine
//   (conflit), dépose externe.txt sur notes et ouvert.md sur l'éditeur, ouvre logo.png, ⌘P
//   « bt », ouvre les deux index.ts, en épingle un, ferme l'autre au clic molette, met
//   notes/b.txt à la corbeille, retire la racine, puis ouvre « Fichier › Ouvrir un fichier… »
//   (capture d'écran de macOS). Une capture et une ligne de journal par étape.
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

  if (scenario === 'fichiers') {
    jouerFichiers(w, capture, touche, sortie)
    return
  }

  if (scenario === 'explorateur') {
    const dossier = process.env['BERGER_SCENARIO_DOSSIER'] ?? ''
    if (!dossier.includes('berger-essai')) {
      console.error('[berger] scénario explorateur refusé : le dossier doit contenir berger-essai')
      return
    }
    const souris = pointeur(wc)
    const ligne = (chemin: string): string => `#arbre .ligne-arbre[data-chemin="${chemin}"]`
    jouer([
      [2500, () => wc.send('berger:scenario-dossier', { chemin: dossier })],
      [
        3500,
        () =>
          void wc.executeJavaScript(
            `document.querySelector(${JSON.stringify(ligne(dossier))})?.scrollIntoView()`
          )
      ],
      [4000, () => souris('left', ligne(`${dossier}/node_modules`))],
      [5500, () => capture('01-racine')],
      [6000, () => writeFileSync(`${dossier}/nouveau.txt`, 'neuf\n')],
      [7500, () => capture('02-nouveau')],
      [8000, () => touche('e', ['meta', 'shift'])],
      [9000, () => capture('03-masque')],
      [9500, () => touche('e', ['meta', 'shift'])],
      [10500, () => capture('04-affiche')],
      [11000, () => wc.send('berger:scenario-retirer-dossier', { chemin: dossier })]
    ])
    return
  }

  if (scenario === 'onglets') {
    const fichiers = (process.env['BERGER_SCENARIO_FICHIERS'] ?? '')
      .split(':')
      .filter((c) => c.includes('berger-essai'))
    const souris = pointeur(wc)
    const etapes: [number, () => void | Promise<void>][] = fichiers.map((chemin, i) => [
      2500 + i * 800,
      () => wc.send('berger:scenario-fichier', { chemin })
    ])
    const t = 2500 + fichiers.length * 800 + 1000
    const notes = fichiers.find((c) => c.endsWith('notes.md'))
    etapes.push(
      [t, () => souris('right', `.onglet-fichier[data-chemin="${notes}"]`)],
      [t + 800, () => capture('01-menu-onglet')],
      [t + 1200, () => souris('left', '.menu .entree', 'Épingler')],
      [
        t + 2000,
        () => souris('left', `.onglet-fichier[data-chemin="${fichiers[fichiers.length - 1]}"]`)
      ],
      [t + 2600, () => souris('left', '#editeur .view-lines')],
      [t + 3000, () => wc.insertText('// modifié par Berger\n')],
      [t + 4000, () => capture('02-onglets')]
    )
    jouer(etapes)
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

// Un clic de souris réel au centre d'un élément (sélecteur CSS, ou texte exact
// d'une entrée de menu ou d'un bouton).
function pointeur(
  wc: Electron.WebContents
): (bouton: 'left' | 'right' | 'middle', selecteur: string, texte?: string) => Promise<void> {
  return async (bouton, selecteur, texte) => {
    const p: Point | null = await wc.executeJavaScript(`(() => {
      const liste = [...document.querySelectorAll(${JSON.stringify(selecteur)})]
      const texte = ${JSON.stringify(texte ?? null)}
      const el = texte === null ? liste[0] : liste.find((e) => e.textContent.trim() === texte)
      if (!el) return null
      el.scrollIntoView({ block: 'nearest' })
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    })()`)
    if (!p) return console.error(`[berger] scénario : introuvable ${selecteur} ${texte ?? ''}`)
    wc.sendInputEvent({ type: 'mouseMove', x: p.x, y: p.y })
    wc.sendInputEvent({ type: 'mouseDown', x: p.x, y: p.y, button: bouton, clickCount: 1 })
    wc.sendInputEvent({ type: 'mouseUp', x: p.x, y: p.y, button: bouton, clickCount: 1 })
  }
}

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

// Le scénario des fichiers (phase 4) : vrais événements souris et clavier,
// glisser-déposer par le protocole de débogage de Chromium.
function jouerFichiers(
  w: BrowserWindow,
  capture: (nom: string) => Promise<void>,
  touche: (keyCode: string, modifiers?: Mod[]) => void,
  sortie: string
): void {
  const dossier = process.env['BERGER_SCENARIO_DOSSIER'] ?? ''
  if (!dossier.includes('berger-essai')) {
    console.error('[berger] scénario fichiers refusé : le dossier doit contenir berger-essai')
    return
  }
  const externe = `${dossier}-externe`
  const wc = w.webContents
  const souris = pointeur(wc)
  const ligne = (chemin: string): string =>
    `#arbre .ligne-arbre[data-chemin=${JSON.stringify(chemin)}]`
  const centre = (selecteur: string): Promise<Point | null> =>
    wc.executeJavaScript(`(() => {
      const el = document.querySelector(${JSON.stringify(selecteur)})
      if (!el) return null
      el.scrollIntoView({ block: 'nearest' })
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    })()`)
  const journal = (nom: string): void => {
    const liste = (d: string): string => {
      try {
        return readdirSync(d).sort().join(', ')
      } catch {
        return '(absent)'
      }
    }
    console.log(
      `[berger] scénario : ${nom} | racine : ${liste(dossier)} | notes : ${liste(`${dossier}/notes`)}`
    )
  }
  const etape = (nom: string) => async (): Promise<void> => {
    await capture(nom)
    journal(nom)
  }
  const taper = (texte: string) => (): Promise<void> => wc.insertText(texte)

  // Glisser-déposer : le glisser interne est intercepté puis rejoué ; un dépôt
  // « du Finder » porte des fichiers.
  const dbg = wc.debugger
  let intercepte: ((data: unknown) => void) | null = null
  const brancherDebogueur = async (): Promise<void> => {
    if (!dbg.isAttached()) dbg.attach('1.3')
    dbg.on('message', (_e, methode, params) => {
      if (methode === 'Input.dragIntercepted' && intercepte) intercepte(params.data)
    })
    await dbg.sendCommand('Input.setInterceptDrags', { enabled: true })
  }
  const deposerDonnees = async (data: unknown, b: Point, modifiers = 0): Promise<void> => {
    for (const type of ['dragEnter', 'dragOver'])
      await dbg.sendCommand('Input.dispatchDragEvent', { type, x: b.x, y: b.y, data, modifiers })
    await new Promise((ok) => setTimeout(ok, 300))
    await dbg.sendCommand('Input.dispatchDragEvent', {
      type: 'drop',
      x: b.x,
      y: b.y,
      data,
      modifiers
    })
  }
  const glisser = (de: string, vers: string) => async (): Promise<void> => {
    const a = await centre(ligne(de))
    const b = await centre(ligne(vers))
    if (!a || !b) return console.error(`[berger] scénario : glisser impossible ${de} → ${vers}`)
    const recu = new Promise<unknown>((ok) => (intercepte = ok))
    const m = (type: string, p: Point, extra = {}): Promise<unknown> =>
      dbg.sendCommand('Input.dispatchMouseEvent', {
        type,
        x: p.x,
        y: p.y,
        button: 'left',
        ...extra
      })
    await m('mousePressed', a, { clickCount: 1, buttons: 1 })
    for (let i = 1; i <= 6; i++)
      await m('mouseMoved', { x: a.x, y: a.y + ((b.y - a.y) * i) / 6 }, { buttons: 1 })
    const data = await Promise.race([recu, new Promise((ok) => setTimeout(() => ok(null), 2000))])
    intercepte = null
    if (!data) return console.error('[berger] scénario : glisser non intercepté')
    await deposerDonnees(data, b)
    await m('mouseReleased', b, { clickCount: 1 })
  }
  const deposerFinder = (fichier: string, selecteur: string) => async (): Promise<void> => {
    await dbg
      .sendCommand('Input.dispatchDragEvent', {
        type: 'dragCancel',
        x: 0,
        y: 0,
        data: { items: [], dragOperationsMask: 1 }
      })
      .catch(() => {})
    const b = await centre(selecteur)
    if (!b) return console.error(`[berger] scénario : cible introuvable ${selecteur}`)
    await deposerDonnees({ items: [], files: [fichier], dragOperationsMask: 1 }, b)
  }

  const index = [`${dossier}/src/main/index.ts`, `${dossier}/src/renderer/index.ts`]
  const liste: [number, () => void | Promise<void>][] = [
    [2500, () => brancherDebogueur()],
    [100, () => wc.send('berger:scenario-oublier', { prefixe: dossier })],
    [300, () => wc.send('berger:scenario-oublier', { prefixe: externe })],
    [300, () => wc.send('berger:scenario-dossier', { chemin: dossier })],
    [1500, () => void centre(ligne(dossier))],
    [500, () => souris('right', ligne(dossier))],
    [800, etape('01-menu-racine')],
    [300, () => souris('left', '.menu .entree .libelle', 'Nouveau fichier')],
    [600, etape('02-champ-nouveau')],
    [300, taper('a.txt')],
    [200, () => touche('Enter')],
    [1200, etape('03-a-cree')],
    [300, () => souris('right', ligne(dossier))],
    [600, () => souris('left', '.menu .entree .libelle', 'Nouveau dossier')],
    [600, taper('notes')],
    [200, () => touche('Enter')],
    [1200, etape('04-notes-cree')],
    [300, () => souris('left', ligne(`${dossier}/a.txt`))],
    [500, () => touche('F2')],
    [600, etape('05-renommage')],
    [300, taper('b')],
    [200, () => touche('Enter')],
    [1200, etape('06-renomme')],
    [300, () => souris('left', ligne(`${dossier}/b.txt`))],
    [400, () => touche('c', ['meta'])],
    [800, () => touche('v', ['meta'])],
    [1500, etape('07-colle')],
    [300, glisser(`${dossier}/b.txt`, `${dossier}/notes`)],
    [1500, etape('08-glisse')],
    [300, () => souris('left', ligne(`${dossier}/b copie.txt`))],
    [400, () => touche('c', ['meta'])],
    [600, () => souris('left', ligne(`${dossier}/notes`))],
    [600, () => souris('right', ligne(`${dossier}/notes`))],
    [600, () => souris('left', '.menu .entree .libelle', 'Coller')],
    [1500, etape('09-colle-dans-notes')],
    [300, glisser(`${dossier}/b copie.txt`, `${dossier}/notes`)],
    [2000, etape('10-conflit-garde')],
    [300, deposerFinder(`${externe}/externe.txt`, ligne(`${dossier}/notes`))],
    [1500, etape('11-depot-finder')],
    [300, deposerFinder(`${externe}/ouvert.md`, '#barre-onglets')],
    [1500, etape('12-depot-fenetre')],
    [300, () => souris('left', ligne(`${dossier}/logo.png`))],
    [1500, etape('13-image')],
    [300, () => touche('p', ['meta'])],
    [600, etape('14-recents')],
    [300, taper('bt')],
    [800, etape('15-recherche')],
    [300, () => touche('Enter')],
    [1200, etape('16-ouvert')],
    [300, () => wc.send('berger:scenario-fichier', { chemin: index[0] })],
    [600, () => wc.send('berger:scenario-fichier', { chemin: index[1] })],
    [1200, etape('17-deux-index')],
    [300, () => souris('right', `.onglet-fichier[data-chemin=${JSON.stringify(index[0])}]`)],
    [600, etape('18-menu-onglet')],
    [300, () => souris('left', '.menu .entree .libelle', 'Épingler')],
    [800, () => souris('middle', `.onglet-fichier[data-chemin=${JSON.stringify(index[1])}]`)],
    [1200, etape('19-epingle-ferme')],
    [300, () => souris('left', ligne(`${dossier}/notes/b.txt`))],
    [300, () => souris('left', ligne(`${dossier}/notes/b.txt`))],
    [400, () => touche('Backspace', ['meta'])],
    [800, etape('20-corbeille')],
    [300, () => souris('left', '.dialogue .bouton-dialogue', 'Mettre à la corbeille')],
    [1500, etape('21-jete')],
    [300, () => souris('right', ligne(dossier))],
    [800, etape('22-menu-retirer')],
    [300, () => souris('left', '.menu .entree .libelle', "Retirer de l'explorateur")],
    [1200, etape('23-retire')],
    [
      300,
      () => {
        const fichier = Menu.getApplicationMenu()?.items.find((i) => i.label === 'Fichier')
        const ouvrir = fichier?.submenu?.items.find((i) => i.label === 'Ouvrir un fichier…')
        console.log(
          `[berger] scénario : menu Fichier › ${ouvrir?.label} (${ouvrir?.accelerator ?? 'sans raccourci'})`
        )
        ouvrir?.click()
      }
    ],
    [
      2500,
      () =>
        execFile('screencapture', ['-x', `${sortie}-24-ouvrir-macos.png`], () =>
          console.log('[berger] scénario : capture 24-ouvrir-macos')
        )
    ]
  ]
  let t = 0
  for (const [delai, faire] of liste) {
    t += delai
    setTimeout(() => void faire(), t)
  }
}
