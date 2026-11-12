import { dialog, Menu, type BrowserWindow } from 'electron'
import { envoyerA } from './envoi'

// Le menu de l'application. Il ne porte aucun des raccourcis de Berger
// (⌘W, ⌘T, ⌘=, ⌘-, ⌘0, ⌘B, ⌘D…) : sinon macOS les prend avant la fenêtre.
// Seule exception : ⌘O, « Fichier › Ouvrir un fichier… » (sélecteur de macOS).
// « Réglages… » montre ⌘, sans l'enregistrer.
export function poserMenu(fenetre: () => BrowserWindow | null): void {
  const ouvrirUnFichier = async (): Promise<void> => {
    const w = fenetre()
    const options = { properties: ['openFile' as const, 'multiSelections' as const] }
    const r = w ? await dialog.showOpenDialog(w, options) : await dialog.showOpenDialog(options)
    if (!r.canceled && r.filePaths.length)
      envoyerA(fenetre(), 'berger:ouvrir-fichiers', { chemins: r.filePaths })
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Berger',
        submenu: [
          { role: 'about', label: 'À propos de Berger' },
          { type: 'separator' },
          {
            // ⌘, affiché seulement : la touche passe par la table des raccourcis.
            label: 'Réglages…',
            accelerator: 'CmdOrCtrl+,',
            registerAccelerator: false,
            click: () => envoyerA(fenetre(), 'berger:ouvrir-reglages', {})
          },
          { type: 'separator' },
          { role: 'hide', label: 'Masquer Berger' },
          { role: 'hideOthers', label: 'Masquer les autres' },
          { type: 'separator' },
          { role: 'quit', label: 'Quitter Berger' }
        ]
      },
      {
        label: 'Fichier',
        submenu: [
          {
            label: 'Ouvrir un fichier…',
            accelerator: 'CmdOrCtrl+O',
            click: () => void ouvrirUnFichier()
          }
        ]
      },
      {
        label: 'Édition',
        submenu: [
          { role: 'undo', label: 'Annuler' },
          { role: 'redo', label: 'Rétablir' },
          { type: 'separator' },
          { role: 'cut', label: 'Couper' },
          { role: 'copy', label: 'Copier' },
          { role: 'paste', label: 'Coller' },
          { role: 'selectAll', label: 'Tout sélectionner' }
        ]
      }
    ])
  )
}
