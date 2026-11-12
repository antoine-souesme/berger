type FenetreMinimale = {
  isDestroyed(): boolean
  webContents: { send(canal: string, donnees: unknown): void }
}

// Envoie à la fenêtre si elle existe encore (sur macOS, l'app reste ouverte
// quand on ferme la fenêtre).
export function envoyerA(fenetre: FenetreMinimale | null, canal: string, donnees: unknown): void {
  if (!fenetre || fenetre.isDestroyed()) return
  fenetre.webContents.send(canal, donnees)
}
