import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { writeFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Coeur, type EtatConnexion } from './coeur'
import { envoyerA } from './envoi'
import { suivreLaVue } from './vue'
import { Terminaux } from './terminaux'
import { brancherFichiers } from './fichiers'
import { brancherActions } from './actions'
import { brancherEtat } from './etat'
import { poserMenu } from './menu'
import { jouerScenario } from './scenario'

const coeur = new Coeur()
let fenetre: BrowserWindow | null = null
let etatConnexion: EtatConnexion = 'deconnecte'
// Vrai quand la fenêtre a répondu qu'on peut fermer (fichiers enregistrés ou
// abandonnés) ; `quitter` : la fermeture vient de ⌘Q.
let fermetureAccordee = false
let quitter = false

const terminaux = new Terminaux({
  sortie: (adresse, octets) => envoyerA(fenetre, 'berger:sortie', { adresse, octets }),
  fin: (adresse, raison) => envoyerA(fenetre, 'berger:fin-terminal', { adresse, raison })
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'Berger',
    backgroundColor: '#1e1f1c',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 16 },
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  fenetre = mainWindow
  fermetureAccordee = false
  mainWindow.on('closed', () => {
    if (fenetre === mainWindow) fenetre = null
  })
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
  // Avant de fermer : la fenêtre demande quoi faire des fichiers non enregistrés.
  // Une fenêtre dont la page a planté ne répondra pas : on la laisse fermer.
  mainWindow.webContents.on('render-process-gone', () => (fermetureAccordee = true))
  mainWindow.on('close', (e) => {
    if (fermetureAccordee) return
    e.preventDefault()
    envoyerA(mainWindow, 'berger:non-enregistres', {})
  })

  // Pour vérifier l'app sans la regarder à la main : BERGER_CAPTURE=chemin.png
  // enregistre une image de la fenêtre quelques secondes après le chargement.
  const capture = process.env['BERGER_CAPTURE']
  if (capture) {
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(
        async () => {
          const image = await mainWindow.webContents.capturePage()
          writeFileSync(capture, image.toPNG())
          console.log(`[berger] capture enregistrée : ${capture}`)
        },
        Number(process.env['BERGER_CAPTURE_DELAI'] ?? 4000)
      )
    })
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('fr.antoine.berger')
  poserMenu()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  coeur.surEtat((etat) => {
    console.log(`[berger] herdr-core : ${etat}`)
    etatConnexion = etat
    envoyerA(fenetre, 'berger:connexion', { etat })
  })
  const vueActuelle = suivreLaVue(coeur, (vue) => envoyerA(fenetre, 'berger:vue', vue))
  // La fenêtre demande l'état courant au chargement (elle a pu rater les envois).
  ipcMain.handle('berger:etat', () => ({
    connexion: etatConnexion,
    vue: vueActuelle(),
    maison: homedir()
  }))
  void coeur.demarrer()
  brancherFichiers(coeur, () => fenetre)
  brancherActions(coeur, () => fenetre)
  const etat = brancherEtat()

  ipcMain.on('berger:attacher', (_e, { adresse, cols, rows }) =>
    terminaux.attacher(adresse, cols, rows)
  )
  ipcMain.on('berger:detacher', (_e, { adresse }) => terminaux.detacher(adresse))
  ipcMain.on('berger:touches', (_e, { adresse, octets }) => terminaux.ecrire(adresse, octets))
  ipcMain.on('berger:taille', (_e, { adresse, cols, rows }) =>
    terminaux.redimensionner(adresse, cols, rows)
  )
  ipcMain.on('berger:focus', (_e, { actif }) => terminaux.focus(actif))
  ipcMain.on('berger:zoom', (e, { pas }) => {
    const wc = e.sender
    wc.setZoomLevel(pas === 0 ? 0 : wc.getZoomLevel() + pas * 0.5)
  })
  ipcMain.on('berger:reponse-quitter', (_e, { quitter: accord }) => {
    if (!accord) {
      quitter = false
      return
    }
    // Les terminaux sont détachés, jamais tués : ils continuent dans Herdr.
    terminaux.detacherTout()
    etat.vider()
    fermetureAccordee = true
    fenetre?.close()
    if (quitter) app.quit()
  })
  app.on('before-quit', () => {
    quitter = true
    etat.vider()
  })

  // Vérification sans clic (développement) : BERGER_OUVRIR=<adresse> ouvre ce
  // terminal au chargement, BERGER_TAPER=<texte> y tape ce texte ensuite.
  app.on('browser-window-created', (_e, w) => {
    let joue = false
    w.webContents.on('did-finish-load', () => {
      if (joue) return
      joue = true
      jouerScenario(w, async (id) => {
        const r = await coeur.requetes?.requete<{ value: { spaces?: { id: string }[] } }>(
          'doc.get',
          { name: 'herdr-app' }
        )
        return r?.value.spaces?.find((s) => s.id === id) ?? null
      })
      const adresse = process.env['BERGER_OUVRIR']
      if (!adresse) return
      setTimeout(() => w.webContents.send('berger:ouvrir', { adresse }), 1500)
      const texte = process.env['BERGER_TAPER']
      if (texte)
        setTimeout(
          () => terminaux.ecrire(adresse, new TextEncoder().encode(texte.replace(/\\r/g, '\r'))),
          3000
        )
    })
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
