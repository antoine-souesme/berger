import { appendFileSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { app, Menu, type BrowserWindow } from 'electron'
import { tmpdir } from 'os'
import { execFile, spawnSync } from 'child_process'

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
//   `notes.md` par le menu de son onglet, tape dans le dernier ouvert, capture, puis tire le
//   dernier onglet ouvert tout à gauche et journalise l'ordre. Vérifie aussi
//   que le menu de l'onglet se ferme au clic dans l'éditeur, se pilote au clavier et rend le
//   clavier à l'éditeur (journal), que la molette fait défiler les onglets de fichiers seuls,
//   puis replie tout le premier fichier (un Markdown : repli par titres).
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
// BERGER_SCENARIO=langage BERGER_SCENARIO_DOSSIER=<dossier berger-essai…> BERGER_SCENARIO_SORTIE=<préfixe>
//   L'aide du langage. Le dossier contient tsconfig.json (strict), package.json,
//   node_modules/typescript (lien vers celui de Berger), node_modules/petit-paquet/
//   {package.json,index.d.ts} (exporte bonjour), src/b.ts (exporte somme), src/a.ts
//   (importe somme et bonjour, ligne `const café = somme(1, 2) // 🐑`), mauvais/package.json
//   (virgule manquante), .github/workflows/ci.yml (`jobs: 3`), long.txt. Ajoute la racine,
//   ouvre a.ts, F12 sur somme puis sur bonjour, tape une erreur de type, survol, complétion,
//   menu du clic droit, réécrit b.ts sur le disque, ouvre les deux fichiers mal formés,
//   renomme b.ts en c.ts par l'explorateur (a.ts modifié), ⌥Z deux fois sur long.txt.
//   Une capture et une ligne de journal par étape.
// BERGER_SCENARIO=reglages BERGER_SCENARIO_DOSSIER=<dossier berger-essai…> BERGER_SCENARIO_SORTIE=<préfixe>
//   Le dossier contient src/a.ts. Refuse un dossier de données autre que `Berger-dev`.
//   Écrit reglages.json à la main (Paper et Dark Modern, puis mal formé, puis corrigé),
//   ouvre les réglages (⌘,), choisit chaque thème de l'application puis de l'éditeur,
//   change « Diviser en bas » en ⌥⌘D (attente, conflit avec ⌘D), vérifie que ⌥⌘D divise
//   et ce qui est écrit, « Rétablir », puis un raccourci écrit à la main. Remet le
//   reglages.json d'avant. Une capture et une ligne de journal par étape.
// BERGER_SCENARIO=reprise BERGER_SCENARIO_ETAPE=1|2 BERGER_SCENARIO_SPACE=<spbergertest…>
//   BERGER_SCENARIO_DOSSIER=<dossier berger-essai…> (contenant src/a.ts) BERGER_SCENARIO_SORTIE=<préfixe>
//   Étape 1 : place la fenêtre (ou plein écran avec BERGER_SCENARIO_PLEIN=1), affiche le space de
//   test, ouvre a.ts, tire le séparateur des spaces, déplie src, capture, journal, puis quitte
//   (comme ⌘Q). Étape 2 : capture et journal de ce qui est revenu. Dossier Berger-dev seulement.
// BERGER_SCENARIO=raccourcis : ⌃1, ⌃2, ⌥⌘], ⌥⌘[, ⌘], ⌘[ et le tri des agents, avec le
//   space et l'agent choisis après chaque touche dans le journal.
type Mod = 'meta' | 'shift' | 'alt' | 'control'
type LireSpace = (id: string) => Promise<unknown>

export function jouerScenario(w: BrowserWindow, lireSpace: LireSpace): void {
  const scenario = process.env['BERGER_SCENARIO']
  if (!scenario) return
  // Jamais dans le dépôt : dans le dossier temporaire du système par défaut.
  const sortie = process.env['BERGER_SCENARIO_SORTIE'] ?? join(tmpdir(), 'berger-capture')
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
    console.log(`[berger] scenario: capture ${nom}`)
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
      console.log(`[berger] scenario: ${nom} ${JSON.stringify(r)}`)
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

  if (scenario === 'langage') {
    void jouerLangage(w, capture, touche)
    return
  }

  if (scenario === 'reprise') {
    void jouerReprise(w, capture)
    return
  }

  if (scenario === 'reglages') {
    void jouerReglages(w, capture, touche, lireSpace)
    return
  }

  if (scenario === 'fichiers') {
    jouerFichiers(w, capture, touche, sortie)
    return
  }

  if (scenario === 'explorateur') {
    const dossier = process.env['BERGER_SCENARIO_DOSSIER'] ?? ''
    if (!dossier.includes('berger-essai')) {
      console.error('[berger] explorateur scenario refused: the folder must contain berger-essai')
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

  // BERGER_SCENARIO=selection BERGER_SCENARIO_DOSSIER=<dossier berger-essai…> (avec a, b, c, d
  //   à la racine) : ⌘-clic et ⇧-clic dans l'explorateur, puis dans un space créé pour
  //   l'essai (et fermé à la fin) le double clic sur la séparation de deux panneaux et
  //   ⇧↵, ⌘←, ⌘→ dans `cat -v`.
  if (scenario === 'selection') {
    const dossier = process.env['BERGER_SCENARIO_DOSSIER'] ?? ''
    let space = ''
    if (!dossier.includes('berger-essai')) {
      console.error(
        '[berger] selection scenario refused: berger-essai folder and spbergertest space'
      )
      return
    }
    const ligne = (nom: string): string => `#arbre .ligne-arbre[data-chemin="${dossier}/${nom}"]`
    const clic = async (sel: string, modifiers: Mod[], clickCount = 1): Promise<void> => {
      const p: Point | null = await wc.executeJavaScript(`(() => {
        const el = document.querySelector(${JSON.stringify(sel)})
        if (!el) return null
        el.scrollIntoView({ block: 'nearest' })
        const r = el.getBoundingClientRect()
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
      })()`)
      if (!p) return console.error(`[berger] scenario: not found ${sel}`)
      wc.sendInputEvent({ type: 'mouseMove', x: p.x, y: p.y, modifiers })
      for (let n = 1; n <= clickCount; n++) {
        wc.sendInputEvent({
          type: 'mouseDown',
          x: p.x,
          y: p.y,
          button: 'left',
          clickCount: n,
          modifiers
        })
        wc.sendInputEvent({
          type: 'mouseUp',
          x: p.x,
          y: p.y,
          button: 'left',
          clickCount: n,
          modifiers
        })
      }
    }
    const choisis = async (nom: string): Promise<void> => {
      const l: string[] = await wc.executeJavaScript(
        `[...document.querySelectorAll('#arbre .ligne-arbre.choisie')].map((e) => e.dataset.chemin.split('/').pop())`
      )
      console.log(`[berger] scenario: ${nom} choisies=${l.join(',')}`)
    }
    const etape = (nom: string) => async (): Promise<void> => {
      await capture(nom)
      console.log(`[berger] scenario: ${nom} ${JSON.stringify(await lireSpace(space))}`)
    }
    const liste: (() => void | Promise<void>)[] = [
      () => wc.send('berger:scenario-dossier', { chemin: dossier }),
      () => clic(ligne('a'), []),
      () => clic(ligne('c'), ['meta']),
      () => choisis('01-cmd-clic'),
      () => clic(ligne('d'), ['shift']),
      () => choisis('02-shift-clic'),
      () => clic(ligne('b'), ['meta']),
      () => choisis('03-cmd-clic-retire'),
      () => capture('03-explorateur'),
      async () => {
        const r: { space?: string } = await wc.executeJavaScript(
          `window.berger.demander('berger:structure', { type: 'space.nouveau' })`
        )
        space = r.space ?? ''
        console.log(`[berger] scenario: space d'essai ${space}`)
        wc.send('berger:scenario-space', { space })
      },
      () => touche('d', ['meta']),
      () => {
        const glisser = (x1: number, x2: number, y: number): void => {
          wc.sendInputEvent({ type: 'mouseDown', x: x1, y, button: 'left', clickCount: 1 })
          for (let i = 1; i <= 5; i++)
            wc.sendInputEvent({ type: 'mouseMove', x: x1 + ((x2 - x1) * i) / 5, y, button: 'left' })
          wc.sendInputEvent({ type: 'mouseUp', x: x2, y, button: 'left', clickCount: 1 })
        }
        void wc
          .executeJavaScript(
            `(() => { const r = document.querySelector('#zone-terminaux .coupure').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })()`
          )
          .then((p: Point) => glisser(p.x, p.x + 250, p.y))
      },
      etape('04-tire'),
      () => clic('#zone-terminaux .coupure', [], 2),
      etape('05-double-clic'),
      () => clic('#zone-terminaux .panneau.clavier .corps', []),
      () => wc.insertText('cat -v'),
      () => touche('Enter'),
      () => wc.insertText('un'),
      () => touche('Enter', ['shift']),
      () => wc.insertText('deux'),
      () => touche('Left', ['meta']),
      () => touche('Right', ['meta']),
      () => touche('Enter'),
      () => capture('06-touches'),
      () => touche('c', ['control']),
      () =>
        void wc.executeJavaScript(
          `window.berger.demander('berger:structure', { type: 'space.fermer', space: ${JSON.stringify(space)} })`
        )
    ]
    jouer(liste.map((f, i) => [3000 + i * 1200, f]))
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
    const notes = fichiers.find((c) => c.endsWith('notes.md')) ?? fichiers[0]
    const journal = async (quoi: string): Promise<void> =>
      console.log(
        `[berger] scenario: ${quoi}: ` +
          JSON.stringify(
            await wc.executeJavaScript(`({
              menu: document.querySelectorAll('.menu').length,
              designee: document.querySelector('.menu .designee')?.textContent ?? null,
              clavier: document.activeElement?.className ?? null,
              fichiers: document.querySelector('.onglets-fichiers')?.scrollLeft ?? null,
              page: [document.scrollingElement.scrollLeft, document.scrollingElement.scrollTop,
                document.getElementById('droite').scrollLeft]
            })`)
          )
      )
    const molette = async (): Promise<void> => {
      const p = await wc.executeJavaScript(`(() => {
        const r = document.querySelector('.onglets-fichiers').getBoundingClientRect()
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
      })()`)
      wc.sendInputEvent({
        type: 'mouseWheel',
        x: p.x,
        y: p.y,
        deltaX: 0,
        deltaY: 300,
        hasPreciseScrollingDeltas: true,
        canScroll: true
      })
    }
    etapes.push(
      [t, () => souris('right', `.onglet-fichier[data-chemin="${notes}"]`)],
      [t + 800, () => capture('01-menu-onglet')],
      // Un clic dans l'éditeur ferme le menu ; la molette fait défiler les fichiers seuls.
      [t + 900, () => souris('left', '#editeur .view-lines')],
      [t + 1000, () => journal("menu après clic dans l'éditeur")],
      [t + 1050, () => souris('right', `.onglet-fichier[data-chemin="${notes}"]`)],
      [t + 1100, () => touche('Down')],
      [t + 1150, () => journal('menu après ↓')],
      [t + 1180, () => touche('Escape')],
      [t + 1190, () => journal('menu après Échap')],
      [t + 1195, () => souris('right', `.onglet-fichier[data-chemin="${notes}"]`)],
      [t + 1200, () => souris('left', '.menu .entree', 'Épingler')],
      [
        t + 2000,
        () => souris('left', `.onglet-fichier[data-chemin="${fichiers[fichiers.length - 1]}"]`)
      ],
      [t + 2600, () => souris('left', '#editeur .view-lines')],
      [t + 3000, () => wc.insertText('// modifié par Berger\n')],
      [t + 4000, () => capture('02-onglets')],
      [t + 4100, () => journal('avant la molette')],
      [t + 4200, () => molette()],
      [t + 4700, () => journal('après la molette')],
      [t + 4800, () => capture('03-molette')],
      // Un fichier Markdown ouvert en premier : ses titres se replient.
      [t + 4900, () => souris('left', `.onglet-fichier[data-chemin="${fichiers[0]}"]`)],
      [
        t + 5600,
        () =>
          void wc.executeJavaScript("window.bergerEssai?.editeur.getAction('editor.foldAll').run()")
      ],
      [t + 6200, () => capture('04-replis')],
      // Le dernier onglet ouvert tiré à la souris tout à gauche des ouverts.
      [
        t + 6400,
        async () => {
          const r = (await wc.executeJavaScript(`(() => {
            const o = [...document.querySelectorAll('.onglet-fichier:not(.epingle)')]
            const a = o[o.length - 1].getBoundingClientRect(), b = o[0].getBoundingClientRect()
            return [a.left + a.width / 2, b.left + 4, a.top + a.height / 2]
          })()`)) as number[]
          const [x1, x2, y] = r.map(Math.round)
          wc.sendInputEvent({ type: 'mouseDown', x: x1, y, button: 'left', clickCount: 1 })
          for (let i = 1; i <= 6; i++)
            wc.sendInputEvent({ type: 'mouseMove', x: x1 + ((x2 - x1) * i) / 6, y, button: 'left' })
          wc.sendInputEvent({ type: 'mouseUp', x: x2, y, button: 'left', clickCount: 1 })
        }
      ],
      [
        t + 7200,
        async () =>
          console.log(
            '[berger] scenario: ordre des onglets ' +
              (await wc.executeJavaScript(
                "[...document.querySelectorAll('.onglet-fichier')].map(o => (o.classList.contains('epingle') ? '📌' : '') + o.dataset.chemin.split('/').pop()).join(' ')"
              ))
          )
      ],
      [t + 7300, () => capture('05-glisse')]
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
        '[berger] ranger scenario refused: BERGER_SCENARIO_SPACE must start with spbergertest'
      )
      return
    }
    jouer([
      [3500, () => wc.send('berger:scenario-space', { space })],
      [6000, () => touche('w', ['meta'])],
      [
        7000,
        async () =>
          console.log(`[berger] scenario: closed ${JSON.stringify(await lireSpace(space))}`)
      ]
    ])
    return
  }

  if (scenario === 'depot') {
    // Dépose deux chemins (dont un avec une espace) sur un terminal de test
    // (BERGER_SCENARIO_TERMINAL, étiqueté herdr.space=spbergertest…), comme
    // depuis l'explorateur : ils s'écrivent dans sa ligne de commande.
    const terminal = process.env['BERGER_SCENARIO_TERMINAL'] ?? ''
    const fiche = terminal ? spawnSync('hc', ['get', terminal], { encoding: 'utf8' }).stdout : ''
    let space: string
    try {
      space =
        (JSON.parse(fiche) as { labels?: Record<string, string> }).labels?.['herdr.space'] ?? ''
    } catch {
      space = ''
    }
    if (!space.startsWith('spbergertest')) {
      console.error(
        '[berger] depot scenario refused: BERGER_SCENARIO_TERMINAL must be labelled herdr.space=spbergertest…'
      )
      return
    }
    const chemins = JSON.stringify(['/tmp/un dossier/a.ts', '/tmp/b.md'])
    jouer([
      [1500, () => wc.send('berger:ouvrir', { adresse: terminal })],
      [
        4000,
        async () => {
          const r = await wc.executeJavaScript(`(() => {
            const hote = document.querySelector('.xterm-hote[data-adresse=${JSON.stringify(terminal)}]')
            if (!hote) return 'terminal de test non affiché, rien déposé'
            const dt = new DataTransfer()
            dt.setData('application/x-berger-chemins', ${JSON.stringify(chemins)})
            const ev = (type) => new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true })
            hote.dispatchEvent(ev('dragover'))
            const surligne = hote.classList.contains('depot')
            hote.dispatchEvent(ev('drop'))
            return 'surligné : ' + surligne
          })()`)
          console.log(`[berger] scenario: depot ${r}`)
        }
      ],
      [5500, () => capture('depot')]
    ])
    return
  }

  if (scenario === 'cadre') {
    const space = process.env['BERGER_SCENARIO_SPACE'] ?? ''
    if (!space.startsWith('spbergertest')) {
      console.error(
        '[berger] cadre scenario refused: BERGER_SCENARIO_SPACE must start with spbergertest'
      )
      return
    }
    const etape = (nom: string) => async (): Promise<void> => {
      await capture(nom)
      console.log(`[berger] scenario: ${nom} ${JSON.stringify(await lireSpace(space))}`)
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
    if (!p) return console.error(`[berger] scenario: not found ${selecteur} ${texte ?? ''}`)
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
    console.log(`[berger] scenario: ${nom} ${JSON.stringify(resume)}`)
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
    if (!p) return console.error(`[berger] scenario: not found ${selecteur} ${texte ?? ''}`)
    wc.sendInputEvent({ type: 'mouseMove', x: p.x, y: p.y })
    wc.sendInputEvent({ type: 'mouseDown', x: p.x, y: p.y, button: bouton, clickCount: 1 })
    wc.sendInputEvent({ type: 'mouseUp', x: p.x, y: p.y, button: bouton, clickCount: 1 })
  }
  const clic = (sel: string, texte?: string) => () => souris('left', sel, texte)
  const clicDroit = (sel: string) => () => souris('right', sel)
  const glisser = (sel: string, vers: string) => async (): Promise<void> => {
    const a = await centre(sel)
    const b = await centre(vers)
    if (!a || !b) return console.error('[berger] scenario: drag failed')
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
        console.log(`[berger] scenario: space created ${JSON.stringify(cree)}`)
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
            `[berger] scenario: space ${id} in the document: ${JSON.stringify(await lireSpace(id))}`
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
    console.error('[berger] fichiers scenario refused: the folder must contain berger-essai')
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
      `[berger] scenario: ${nom} | root: ${liste(dossier)} | notes: ${liste(`${dossier}/notes`)}`
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
    if (!a || !b) return console.error(`[berger] scenario: drag failed ${de} → ${vers}`)
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
    if (!data) return console.error('[berger] scenario: drag not intercepted')
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
    if (!b) return console.error(`[berger] scenario: target not found ${selecteur}`)
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
          `[berger] scenario: File menu › ${ouvrir?.label} (${ouvrir?.accelerator ?? 'no shortcut'})`
        )
        ouvrir?.click()
      }
    ],
    [
      2500,
      () =>
        execFile('screencapture', ['-x', `${sortie}-24-ouvrir-macos.png`], () =>
          console.log('[berger] scenario: capture 24-ouvrir-macos')
        )
    ]
  ]
  let t = 0
  for (const [delai, faire] of liste) {
    t += delai
    setTimeout(() => void faire(), t)
  }
}

// Le scénario de l'aide du langage : Monaco est piloté par `window.bergerEssai`
// (posé par editeur.ts en développement).
async function jouerLangage(
  w: BrowserWindow,
  capture: (nom: string) => Promise<void>,
  touche: (keyCode: string, modifiers?: Mod[]) => void
): Promise<void> {
  const dossier = process.env['BERGER_SCENARIO_DOSSIER'] ?? ''
  if (!dossier.includes('berger-essai')) {
    console.error('[berger] langage scenario refused: the folder must contain berger-essai')
    return
  }
  const wc = w.webContents
  const lent = Number(process.env['BERGER_SCENARIO_LENTEUR'] ?? 1)
  const pause = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms * lent))
  const souris = pointeur(wc)
  const a = `${dossier}/src/a.ts`
  const js = <T>(code: string): Promise<T> =>
    wc.executeJavaScript(
      `(() => { const { monaco, editeur, modifie } = window.bergerEssai; ${code} })()`
    )
  const affiche = (): Promise<string> => js('return editeur.getModel()?.uri.fsPath ?? null')
  const marqueurs = (chemin: string): Promise<string[]> =>
    js(`return monaco.editor.getModelMarkers({ resource: monaco.Uri.file(${JSON.stringify(chemin)}) })
      .map((m) => (m.code ?? '') + ' ' + m.message.split('\\n')[0])`)
  const journal = (nom: string, valeur: unknown): void =>
    console.log(`[berger] scenario: ${nom} ${JSON.stringify(valeur)}`)
  const ouvrir = async (chemin: string, attente = 2500): Promise<void> => {
    wc.send('berger:scenario-fichier', { chemin })
    await pause(attente)
  }
  // Place le curseur sur un mot de a.ts (sa première occurrence après `apres`).
  const curseurSur = (mot: string, apres = ''): Promise<void> =>
    js(`const m = editeur.getModel()
      const t = m.getValue()
      const i = t.indexOf(${JSON.stringify(mot)}, t.indexOf(${JSON.stringify(apres)}))
      const p = m.getPositionAt(i + 1)
      editeur.setPosition(p)
      editeur.focus()`)
  const commande = (id: string): Promise<void> =>
    js(`editeur.trigger('scenario', ${JSON.stringify(id)}, {})`)

  await pause(2500)
  wc.send('berger:scenario-oublier', { prefixe: dossier })
  await pause(300)
  wc.send('berger:scenario-dossier', { chemin: dossier })
  await pause(1500)
  await capture('01-racine')

  await ouvrir(a, 4000)
  await capture('02-a')
  journal('02-a', {
    affiche: await affiche(),
    selection: await js(
      `return getComputedStyle(document.querySelector('.monaco-editor')).getPropertyValue('--vscode-editor-selectionBackground')`
    )
  })

  await curseurSur('somme', 'const café')
  await commande('editor.action.revealDefinition')
  await pause(3000)
  await capture('03-f12-somme')
  journal('03-f12-somme', await affiche())

  await ouvrir(a)
  await curseurSur('bonjour', 'export const message')
  await commande('editor.action.revealDefinition')
  await pause(3000)
  await capture('04-f12-bonjour')
  journal('04-f12-bonjour', await affiche())

  await ouvrir(a)
  await js(`const m = editeur.getModel()
    const fin = m.getFullModelRange().getEndPosition()
    editeur.executeEdits('scenario', [{ range: new monaco.Range(fin.lineNumber, fin.column, fin.lineNumber, fin.column), text: "const n: number = 'x'\\n" }])`)
  await pause(3000)
  await capture('05-erreur')
  journal('05-erreur', await marqueurs(a))

  await curseurSur('café', 'const café')
  await commande('editor.action.showHover')
  await pause(2500)
  await capture('06-survol')
  journal(
    '06-survol',
    await js(`return document.querySelector('.monaco-hover-content')?.textContent ?? null`)
  )
  touche('Escape')

  await js(`const m = editeur.getModel()
    const fin = m.getFullModelRange().getEndPosition()
    editeur.setPosition(fin)
    editeur.pushUndoStop()
    editeur.executeEdits('scenario', [{ range: new monaco.Range(fin.lineNumber, fin.column, fin.lineNumber, fin.column), text: 'som' }])
    editeur.pushUndoStop()
    editeur.focus()`)
  await commande('editor.action.triggerSuggest')
  await pause(2500)
  await capture('07-completion')
  journal(
    '07-completion',
    await js(
      `return [...document.querySelectorAll('.suggest-widget .monaco-list-row .label-name')].slice(0, 5).map((e) => e.textContent)`
    )
  )
  touche('Escape')
  await js(`editeur.trigger('scenario', 'undo', {})`)
  await pause(500)

  await souris('right', '#editeur .view-lines')
  await pause(800)
  await capture('08-menu')
  journal(
    '08-menu',
    await js(
      `const racine = [...document.querySelectorAll('.shadow-root-host')].map((h) => h.shadowRoot).find((r) => r?.querySelector('.monaco-menu')) ?? document
      const menu = racine.querySelector('.monaco-menu')
      const c = racine.querySelector('.monaco-menu-container'); return { fond: menu ? getComputedStyle(menu).backgroundColor : null, conteneur: c ? getComputedStyle(c).backgroundColor : null, variable: c ? getComputedStyle(c).getPropertyValue('--vscode-menu-background') : null, html: c?.outerHTML.slice(0, 300), entrees: [...racine.querySelectorAll('.action-label')].map((e) => e.textContent).filter(Boolean) }`
    )
  )
  touche('Escape')
  await pause(300)

  // Un agent ajoute un paramètre à somme : a.ts (modifié) garde son texte, l'erreur arrive.
  writeFileSync(
    `${dossier}/src/b.ts`,
    'export function somme(a: number, b: number, c: number): number {\n  return a + b + c\n}\n'
  )
  await pause(5000)
  await capture('09-agent')
  journal('09-agent', {
    marqueurs: await marqueurs(a),
    modifie: await js(`return modifie(${JSON.stringify(a)})`),
    intact: await js(
      `return monaco.editor.getModel(monaco.Uri.file(${JSON.stringify(a)})).getValue().includes("const n: number = 'x'")`
    )
  })

  await ouvrir(`${dossier}/mauvais/package.json`, 4000)
  await capture('10-package')
  journal('10-package', await marqueurs(`${dossier}/mauvais/package.json`))

  await ouvrir(`${dossier}/.github/workflows/ci.yml`, 8000)
  await capture('11-ci')
  journal('11-ci', await marqueurs(`${dossier}/.github/workflows/ci.yml`))

  // Renommer b.ts (ouvert) en c.ts par l'explorateur, a.ts restant modifié.
  const ligne = (chemin: string): string =>
    `#arbre .ligne-arbre[data-chemin=${JSON.stringify(chemin)}]`
  const existe = (sel: string): Promise<boolean> =>
    wc.executeJavaScript(`!!document.querySelector(${JSON.stringify(sel)})`)
  if (!(await existe(ligne(`${dossier}/src/b.ts`)))) {
    await souris('left', ligne(`${dossier}/src`))
    await pause(800)
  }
  // Deux clics : le premier ouvre l'onglet, le second rend le clavier à l'explorateur.
  await souris('left', ligne(`${dossier}/src/b.ts`))
  await pause(1000)
  await souris('left', ligne(`${dossier}/src/b.ts`))
  await pause(500)
  touche('F2')
  await pause(600)
  await wc.insertText('c')
  touche('Enter')
  await pause(2500)
  await capture('12-renomme')
  journal('12-renomme', {
    modeles: await js(
      `return monaco.editor.getModels().map((m) => m.uri.toString()).filter((u) => u.includes('/src/'))`
    ),
    aModifie: await js(`return modifie(${JSON.stringify(a)})`)
  })

  await ouvrir(`${dossier}/long.txt`)
  await js('editeur.focus()')
  touche('z', ['alt'])
  await pause(1000)
  await capture('13-retour-ligne')
  journal(
    '13-retour-ligne',
    await js(`return editeur.getOption(monaco.editor.EditorOption.wordWrap)`)
  )
  touche('z', ['alt'])
  await pause(1000)
  await capture('14-sans-retour')
  journal(
    '14-sans-retour',
    await js(`return editeur.getOption(monaco.editor.EditorOption.wordWrap)`)
  )
  console.log('[berger] scenario: end')
}

async function jouerReglages(
  w: BrowserWindow,
  capture: (nom: string) => Promise<void>,
  touche: (keyCode: string, modifiers?: Mod[]) => void,
  lireSpace: LireSpace
): Promise<void> {
  const donnees = app.getPath('userData')
  if (basename(donnees) !== 'Berger-dev') {
    console.error(`[berger] reglages scenario refused: data folder ${donnees}`)
    return
  }
  const dossier = process.env['BERGER_SCENARIO_DOSSIER'] ?? ''
  if (!dossier.includes('berger-essai')) {
    console.error('[berger] reglages scenario refused: the folder must contain berger-essai')
    return
  }
  const wc = w.webContents
  const lent = Number(process.env['BERGER_SCENARIO_LENTEUR'] ?? 1)
  const pause = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms * lent))
  const journal = (nom: string, valeur: unknown): void =>
    console.log(`[berger] scenario: ${nom} ${JSON.stringify(valeur)}`)
  const fichier = join(donnees, 'reglages.json')
  let avant: string | null
  try {
    avant = readFileSync(fichier, 'utf8')
  } catch {
    avant = null
  }
  // Facultatif : un space de test (spbergertest…) pour les terminaux et ⌥⌘D.
  const space = process.env['BERGER_SCENARIO_SPACE'] ?? ''
  if (space && !space.startsWith('spbergertest')) {
    console.error(
      '[berger] reglages scenario refused: BERGER_SCENARIO_SPACE must start with spbergertest'
    )
    return
  }
  const ecrire = (texte: string): void => writeFileSync(fichier, texte)
  const barre = (): Promise<string> =>
    wc.executeJavaScript(`document.getElementById('barre-etat').textContent`)
  const variable = (nom: string): Promise<string> =>
    wc.executeJavaScript(
      `getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(nom)}).trim()`
    )
  const fondEditeur = (): Promise<string> =>
    wc.executeJavaScript(
      `getComputedStyle(document.querySelector('.monaco-editor')).getPropertyValue('--vscode-editor-background')`
    )

  try {
    await pause(2500)
    wc.send('berger:scenario-oublier', { prefixe: dossier })
    await pause(300)
    wc.send('berger:scenario-dossier', { chemin: dossier })
    await pause(1500)
    wc.send('berger:scenario-fichier', { chemin: `${dossier}/src/a.ts` })
    await pause(3000)
    await capture('00-depart')

    // Le fichier écrit à la main s'applique tout de suite.
    ecrire(
      '{ "apparence": { "themeApplication": "paper", "themeEditeur": "vscode-dark-modern" } }\n'
    )
    await pause(1500)
    await capture('01-paper-dark-modern')
    journal('01-paper-dark-modern', {
      fond: await variable('--fond'),
      editeur: await fondEditeur()
    })

    ecrire('{ mal')
    await pause(1500)
    await capture('02-mal-forme')
    journal('02-mal-forme', { barre: await barre(), fond: await variable('--fond') })

    ecrire('{ "apparence": { "themeApplication": "ink", "themeEditeur": "paper" } }\n')
    await pause(1500)
    await capture('03-corrige')
    journal('03-corrige', {
      barre: await barre(),
      fond: await variable('--fond'),
      editeur: await fondEditeur()
    })

    await jouerFenetreReglages({
      wc,
      capture,
      touche,
      pause,
      journal,
      ecrire,
      fichier,
      space,
      lireSpace,
      dossier
    })
  } finally {
    if (avant === null) {
      try {
        unlinkSync(fichier)
      } catch {
        // déjà absent
      }
    } else ecrire(avant)
    await pause(1500)
    await capture('99-fin')
    journal('fin', 'reglages.json remis')
  }
}

// La fenêtre des réglages : thèmes choisis à la souris, raccourci modifié.
async function jouerFenetreReglages(o: {
  wc: Electron.WebContents
  capture: (nom: string) => Promise<void>
  touche: (keyCode: string, modifiers?: Mod[]) => void
  pause: (ms: number) => Promise<void>
  journal: (nom: string, valeur: unknown) => void
  ecrire: (texte: string) => void
  fichier: string
  space: string
  lireSpace: LireSpace
  dossier: string
}): Promise<void> {
  const { wc, capture, touche, pause, journal, ecrire, fichier, space, lireSpace, dossier } = o
  const souris = pointeur(wc)
  const lire = (): string => {
    try {
      return readFileSync(fichier, 'utf8')
    } catch {
      return ''
    }
  }
  const panneaux = async (): Promise<number> => {
    const s = (await lireSpace(space)) as { tabs?: { root?: unknown }[] } | null
    return (JSON.stringify(s ?? {}).match(/"terminal"/g) ?? []).length
  }
  const ouvrir = async (section?: string): Promise<void> => {
    touche(',', ['meta'])
    await pause(800)
    if (section) {
      await souris('left', `.section-reglages[data-section="${section}"]`)
      await pause(600)
    }
  }
  const fermer = async (): Promise<void> => {
    touche('Escape')
    await pause(500)
  }
  const choisir = async (bloc: 1 | 2, id: string): Promise<void> => {
    await souris('left', `.bloc-themes:nth-child(${bloc}) .choix-theme[data-theme="${id}"]`)
    await pause(1500)
  }

  ecrire('{}\n')
  await pause(1000)
  await ouvrir()
  await capture('10-apparence')
  journal('10-apparence', {
    ouvert: await wc.executeJavaScript(`!!document.querySelector('.fenetre-reglages')`),
    themes: await wc.executeJavaScript(
      `[...document.querySelectorAll('.choix-theme .nom-theme')].map((e) => e.textContent)`
    )
  })
  await fermer()

  // Chaque thème de l'application, fenêtre entière (terminal du space de test).
  const themesApp = [
    'antoine-monokai',
    'monokai',
    'atom-one-dark',
    'graphite',
    'ink',
    'moss',
    'paper'
  ]
  if (space) {
    wc.send('berger:scenario-space', { space })
    await pause(1500)
    // Le premier onglet (le terminal du space de test), pas le fichier ouvert.
    touche('1', ['meta'])
    await pause(1000)
  }
  for (const id of themesApp) {
    await ouvrir()
    await choisir(1, id)
    await fermer()
    await capture(`11-application-${id}`)
  }
  await ouvrir()
  await choisir(1, 'antoine-monokai')
  await fermer()

  // Chaque thème de l'éditeur, sur a.ts.
  wc.send('berger:scenario-fichier', { chemin: `${dossier}/src/a.ts` })
  await pause(1500)
  for (const id of [...themesApp, 'vscode-dark-modern', 'vscode-light-modern']) {
    await ouvrir()
    await choisir(2, id)
    await capture(`12-editeur-${id}-reglages`)

    await fermer()
    await capture(`12-editeur-${id}`)
  }
  // Thèmes clairs : menu du clic droit de Berger, suggestions et menu de Monaco.
  await ouvrir()
  await choisir(1, 'paper')
  await fermer()
  await souris('right', '.ligne-space.choisi')
  await pause(600)
  await capture('12-clair-menu')
  touche('Escape')
  await pause(300)
  await wc.executeJavaScript(`(() => { const { editeur } = window.bergerEssai
    editeur.focus(); editeur.setPosition({ lineNumber: 5, column: 9 })
    editeur.trigger('scenario', 'editor.action.triggerSuggest', {}) })()`)
  await pause(2000)
  await capture('12-clair-suggestions')
  touche('Escape')
  await pause(300)
  await souris('right', '.view-line')
  await pause(800)
  await capture('12-clair-menu-editeur')
  touche('Escape')
  await pause(300)
  await ouvrir()
  await choisir(1, 'antoine-monokai')
  await choisir(2, 'antoine-monokai')
  await fermer()

  // Raccourcis : « Diviser en bas » en ⌥⌘D, puis ⌘D (conflit).
  await ouvrir('raccourcis')
  await capture('13-raccourcis')
  const ligne = '.ligne-raccourci[data-commande="panneau.diviserBas"] .raccourci'
  await souris('left', ligne)
  await pause(500)
  await capture('14-attente')
  touche('d', ['meta'])
  await pause(500)
  await capture('15-conflit')
  journal(
    '15-conflit',
    await wc.executeJavaScript(`document.querySelector('${ligne}').textContent`)
  )
  touche('Enter')
  await pause(500)
  journal('15-conflit-pas-garde', lire())
  touche('d', ['meta', 'alt'])
  await pause(400)
  await capture('16-alt-cmd-d')
  touche('Enter')
  await pause(1500)
  await capture('17-garde')
  journal('17-garde', lire())
  await fermer()

  if (space) {
    wc.send('berger:scenario-space', { space })
    await pause(1500)
    // Le premier onglet (le terminal du space de test), pas le fichier ouvert.
    touche('1', ['meta'])
    await pause(1000)
    const n0 = await panneaux()
    touche('d', ['meta', 'shift'])
    await pause(2000)
    const n1 = await panneaux()
    touche('d', ['meta', 'alt'])
    await pause(2500)
    const n2 = await panneaux()
    await capture('18-divise')
    journal('18-divise', { avant: n0, apresShiftCmdD: n1, apresAltCmdD: n2 })
  }

  // « Rétablir ».
  await ouvrir('raccourcis')
  await souris('left', '.ligne-raccourci[data-commande="panneau.diviserBas"] .retablir')
  await pause(1500)
  await capture('19-retabli')
  journal('19-retabli', lire())
  await fermer()

  // Un raccourci écrit à la main : « Diviser à droite » en ⌥⌘R.
  ecrire('{ "raccourcis": { "panneau.diviserDroite": ["cmd-alt-r"] } }\n')
  await pause(1500)
  await ouvrir('raccourcis')
  await capture('20-a-la-main')
  journal(
    '20-a-la-main',
    await wc.executeJavaScript(
      `document.querySelector('.ligne-raccourci[data-commande="panneau.diviserDroite"] .raccourci').textContent`
    )
  )
  await fermer()
  if (space) {
    wc.send('berger:scenario-space', { space })
    await pause(1500)
    // Le premier onglet (le terminal du space de test), pas le fichier ouvert.
    touche('1', ['meta'])
    await pause(1000)
    const n0 = await panneaux()
    touche('r', ['meta', 'alt'])
    await pause(2500)
    journal('21-alt-cmd-r', { avant: n0, apres: await panneaux() })

    // La police du terminal écrite à la main : fine, lignes hautes, lettres
    // espacées ; la page Terminal la montre et le terminal la prend.
    ecrire(
      '{ "terminal": { "graisse": 300, "graisseGras": 800, "interligne": 1.6, "espacement": 2 } }\n'
    )
    await pause(2000)
    await capture('21-terminal-police')
    await ouvrir('terminal')
    await capture('21-terminal-reglages')
    journal(
      '21-terminal-reglages',
      await wc.executeJavaScript(
        `[...document.querySelectorAll('.fenetre-reglages select')].map((s) => s.value)`
      )
    )
    await fermer()
  }

  // Mal formé, fenêtre des réglages ouverte : message, et rien n'est écrit.
  await ouvrir()
  ecrire('{ mal')
  await pause(1500)
  await choisir(1, 'ink')
  await capture('22-mal-forme')
  journal('22-mal-forme', {
    alerte: await wc.executeJavaScript(`document.querySelector('.alerte-reglages').textContent`),
    fichier: lire()
  })
  await fermer()
}

async function jouerReprise(
  w: BrowserWindow,
  capture: (nom: string) => Promise<void>
): Promise<void> {
  if (basename(app.getPath('userData')) !== 'Berger-dev') {
    console.error('[berger] reprise scenario refused: data folder other than Berger-dev')
    return
  }
  const space = process.env['BERGER_SCENARIO_SPACE'] ?? ''
  const dossier = process.env['BERGER_SCENARIO_DOSSIER'] ?? ''
  if (!space.startsWith('spbergertest') || !dossier.includes('berger-essai')) {
    console.error(
      '[berger] reprise scenario refused: needs space spbergertest… and folder berger-essai…'
    )
    return
  }
  const wc = w.webContents
  const pause = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms))
  const etat = async (): Promise<unknown> => ({
    cadre: w.getNormalBounds(),
    pleinEcran: w.isFullScreen(),
    ui: await wc.executeJavaScript(`({
      space: document.querySelector('.ligne-space.choisi')?.dataset.id ?? document.querySelector('.ligne-space.choisi .nom')?.textContent,
      onglets: [...document.querySelectorAll('#barre-onglets .onglet')].map((o) => o.textContent),
      ongletChoisi: document.querySelector('#barre-onglets .onglet.actif, #barre-onglets .onglet.choisi')?.textContent,
      largeurSpaces: document.getElementById('spaces')?.getBoundingClientRect().width,
      largeurExplorateur: document.getElementById('explorateur')?.getBoundingClientRect().width,
      explorateurMasque: document.getElementById('explorateur')?.hidden,
      deplies: [...document.querySelectorAll('.ligne-arbre')].filter((l) => l.textContent.trim() === 'src').length
    })`)
  })
  await pause(3500)
  if (process.env['BERGER_SCENARIO_ETAPE'] === '2') {
    await pause(1500)
    await capture('reprise-2')
    console.log(`[berger] scenario: reprise-2 ${JSON.stringify(await etat())}`)
    return
  }
  if (process.env['BERGER_SCENARIO_PLEIN'] === '1') w.setFullScreen(true)
  else w.setBounds({ x: 120, y: 80, width: 1300, height: 820 })
  await pause(1500)
  wc.send('berger:scenario-space', { space })
  await pause(1000)
  wc.send('berger:scenario-oublier', { prefixe: dossier })
  await pause(300)
  wc.send('berger:scenario-dossier', { chemin: dossier })
  await pause(1200)
  wc.send('berger:scenario-fichier', { chemin: `${dossier}/src/a.ts` })
  await pause(1500)
  // Le séparateur des spaces tiré de 60 px.
  const x = await wc.executeJavaScript(
    `Math.round(document.querySelector('.separateur[data-largeur="spaces"]').getBoundingClientRect().x + 2)`
  )
  wc.sendInputEvent({ type: 'mouseDown', x, y: 400, button: 'left', clickCount: 1 })
  for (let i = 1; i <= 5; i++)
    wc.sendInputEvent({ type: 'mouseMove', x: x + i * 12, y: 400, button: 'left' })
  wc.sendInputEvent({ type: 'mouseUp', x: x + 60, y: 400, button: 'left', clickCount: 1 })
  await pause(2500)
  await capture('reprise-1')
  console.log(`[berger] scenario: reprise-1 ${JSON.stringify(await etat())}`)
  app.quit()
}
