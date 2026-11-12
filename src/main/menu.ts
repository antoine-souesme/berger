import { Menu } from 'electron'

// Le menu de l'application. Il ne porte aucun des raccourcis de Berger
// (⌘W, ⌘T, ⌘=, ⌘-, ⌘0, ⌘B, ⌘D…) : sinon macOS les prend avant la fenêtre.
export function poserMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Berger',
        submenu: [
          { role: 'about', label: 'À propos de Berger' },
          { type: 'separator' },
          { role: 'hide', label: 'Masquer Berger' },
          { role: 'hideOthers', label: 'Masquer les autres' },
          { type: 'separator' },
          { role: 'quit', label: 'Quitter Berger' }
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
