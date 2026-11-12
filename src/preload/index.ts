import { contextBridge, ipcRenderer } from 'electron'

// Pont entre la fenêtre et le processus principal : seulement les canaux `berger:`.
const verifier = (canal: string): void => {
  if (!canal.startsWith('berger:')) throw new Error(`canal refusé : ${canal}`)
}

const berger = {
  ecouter(canal: string, f: (donnees: any) => void): void {
    verifier(canal)
    ipcRenderer.on(canal, (_e, donnees) => f(donnees))
  },
  envoyer(canal: string, donnees?: unknown): void {
    verifier(canal)
    ipcRenderer.send(canal, donnees)
  },
  demander<T>(canal: string, donnees?: unknown): Promise<T> {
    verifier(canal)
    return ipcRenderer.invoke(canal, donnees)
  }
}

export type ApiBerger = typeof berger

contextBridge.exposeInMainWorld('berger', berger)
