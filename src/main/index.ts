import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Coeur, type EtatConnexion } from './coeur'
import { envoyerA } from './envoi'
import { suivreLaVue } from './vue'
import { TerminalOuvert } from './terminal'
import { brancherFichiers } from './fichiers'
import { jouerScenario } from './scenario'

const coeur = new Coeur()
let fenetre: BrowserWindow | null = null
let etatConnexion: EtatConnexion = 'deconnecte'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    title: 'Berger',
    backgroundColor: '#1e1f1c',
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  fenetre = mainWindow
  mainWindow.on('closed', () => {
    if (fenetre === mainWindow) fenetre = null
  })
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('fr.antoine.berger')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
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
  ipcMain.handle('berger:etat', () => ({ connexion: etatConnexion, vue: vueActuelle() }))
  void coeur.demarrer()
  brancherFichiers(coeur, () => fenetre)

  // Un seul terminal ouvert à la fois ; en ouvrir un autre détache le précédent.
  let ouvert: TerminalOuvert | null = null
  ipcMain.on('berger:attacher', (_e, { adresse, cols, rows }) => {
    ouvert?.detacher()
    const celuiCi: TerminalOuvert = new TerminalOuvert(adresse, cols, rows, {
      sortie: (octets) => envoyerA(fenetre, 'berger:sortie', octets),
      fin: (raison) => {
        if (ouvert === celuiCi) envoyerA(fenetre, 'berger:fin-terminal', { raison })
      }
    })
    ouvert = celuiCi
  })
  // Vérification sans clic (développement) : BERGER_OUVRIR=<adresse> ouvre ce
  // terminal au chargement, BERGER_TAPER=<texte> y tape ce texte ensuite.
  app.on('browser-window-created', (_e, w) => {
    w.webContents.on('did-finish-load', () => {
      jouerScenario(w)
      const adresse = process.env['BERGER_OUVRIR']
      if (!adresse) return
      setTimeout(() => w.webContents.send('berger:ouvrir', { adresse }), 1500)
      const texte = process.env['BERGER_TAPER']
      if (texte)
        setTimeout(
          () => ouvert?.ecrire(new TextEncoder().encode(texte.replace(/\\r/g, '\r'))),
          3000
        )
    })
  })
  ipcMain.on('berger:touches', (_e, { octets }) => ouvert?.ecrire(octets))
  ipcMain.on('berger:taille', (_e, { cols, rows }) => ouvert?.redimensionner(cols, rows))
  ipcMain.on('berger:focus', (_e, { actif }) => ouvert?.focus(actif))
  ipcMain.on('berger:detacher', () => {
    ouvert?.detacher()
    ouvert = null
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
