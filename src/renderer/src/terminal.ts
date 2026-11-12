import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

// La vue du terminal ouvert : xterm.js branché sur le processus principal.
const zone = (): HTMLElement => document.getElementById('terminal')!
let terminal: Terminal | null = null
let ajustement: FitAddon | null = null
let adresseOuverte = ''
const encodeur = new TextEncoder()

function annoncerTaille(): void {
  if (!terminal || !ajustement) return
  ajustement.fit()
  window.berger.envoyer('berger:taille', {
    adresse: adresseOuverte,
    cols: terminal.cols,
    rows: terminal.rows
  })
}

export function initTerminal(): void {
  window.berger.ecouter('berger:sortie', ({ adresse, octets }) => {
    if (adresse === adresseOuverte) terminal?.write(octets)
  })
  window.berger.ecouter('berger:fin-terminal', () => {
    terminal?.dispose()
    terminal = null
    zone().replaceChildren(message('Terminal terminé'))
  })
  new ResizeObserver(() => annoncerTaille()).observe(zone())
  // Comme dans Herdr : la fenêtre où l'on travaille impose sa taille.
  window.addEventListener('focus', () => {
    window.berger.envoyer('berger:focus', { actif: true })
    annoncerTaille()
  })
  window.addEventListener('blur', () => window.berger.envoyer('berger:focus', { actif: false }))
}

function message(texte: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'message'
  el.textContent = texte
  return el
}

export function ouvrirTerminal(adresse: string): void {
  if (adresseOuverte) window.berger.envoyer('berger:detacher', { adresse: adresseOuverte })
  adresseOuverte = adresse
  terminal?.dispose()
  zone().replaceChildren()
  terminal = new Terminal({
    fontFamily: 'Menlo, monospace',
    fontSize: 13,
    cursorBlink: true,
    theme: { background: '#1e1f1c', foreground: '#e6e6e1', cursor: '#e6e6e1' }
  })
  ajustement = new FitAddon()
  terminal.loadAddon(ajustement)
  terminal.open(zone())
  ajustement.fit()
  terminal.onData((texte) =>
    window.berger.envoyer('berger:touches', {
      adresse: adresseOuverte,
      octets: encodeur.encode(texte)
    })
  )
  terminal.onBinary((texte) =>
    window.berger.envoyer('berger:touches', {
      adresse: adresseOuverte,
      octets: Uint8Array.from(texte, (c) => c.charCodeAt(0))
    })
  )
  window.berger.envoyer('berger:attacher', { adresse, cols: terminal.cols, rows: terminal.rows })
  terminal.focus()
}
