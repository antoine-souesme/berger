// Un xterm par terminal affiché, branché sur le processus principal. Il est
// gardé tant que son onglet est affiché ; les autres sont détachés (jamais
// tués) et rattachés au retour.
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import { actionDe } from '../../shared/raccourcis'
import { AFFICHAGE } from '../../shared/terminaux'

type Ouvert = {
  el: HTMLElement
  xterm: Terminal
  ajustement: FitAddon
  attache: boolean
  cree: number
  ouvert: boolean
}

// Police et couleurs du terminal de Herdr (`~/.config/herdr-app/settings.json`,
// thème `antoine-monokai`).
const THEME = {
  background: AFFICHAGE.bg,
  foreground: AFFICHAGE.fg,
  cursor: AFFICHAGE.cursor,
  selectionBackground: '#49483e',
  black: '#333333',
  red: '#c4265e',
  green: '#86b42b',
  yellow: '#b3b42b',
  blue: '#6a7ec8',
  magenta: '#8c6bc8',
  cyan: '#56adbc',
  white: '#c4c4be',
  brightBlack: '#666666',
  brightRed: '#f92672',
  brightGreen: '#a6e22e',
  brightYellow: '#e2e22e',
  brightBlue: '#819aff',
  brightMagenta: '#ae81ff',
  brightCyan: '#66d9ef',
  brightWhite: '#d8d8d2'
}

// Le rendu graphique de xterm donne au canevas une police qui commence par une
// espace quand le texte n'est pas en italique (« ␣normal 12px … ») ; le Chromium
// d'Electron 44 la refuse et dessine en « 10px sans-serif », d'où des lettres
// minuscules et espacées. On retire l'espace avant de la donner au canevas.
for (const proto of [
  CanvasRenderingContext2D.prototype,
  OffscreenCanvasRenderingContext2D.prototype
]) {
  const police = Object.getOwnPropertyDescriptor(proto, 'font')
  if (!police?.set) continue
  Object.defineProperty(proto, 'font', {
    ...police,
    set(this: CanvasRenderingContext2D, valeur: string) {
      police.set!.call(this, typeof valeur === 'string' ? valeur.trim() : valeur)
    }
  })
}

const POLICE = "'IBM Plex Mono', Menlo, monospace"

const ouverts = new Map<string, Ouvert>()

// La police doit être chargée avant le rendu par la carte graphique : sinon il
// dessine ses lettres avec une autre police que celle qui a mesuré les cases.
const policePrete = document.fonts.load("12px 'IBM Plex Mono'").catch(() => [])

// Terminaux dont le flux s'est arrêté juste après l'ouverture : on ne les
// rouvre pas en boucle, on montre la raison.
const arretes = new Map<string, string>()
const encodeur = new TextEncoder()
let surFin: (adresse: string) => void = () => {}

function envoyerTaille(adresse: string, o: Ouvert): void {
  if (!o.attache || !document.hasFocus()) return
  window.berger.envoyer('berger:taille', { adresse, cols: o.xterm.cols, rows: o.xterm.rows })
}

// Rendu par la carte graphique, comme Herdr : les caractères de bloc (logo de
// Claude Code) sont dessinés pleins, sans jour entre les lignes. Le terminal
// n'est ouvert qu'une fois son élément dans la page (sinon les cases sont mal
// mesurées et les lettres s'écartent), et la carte graphique n'est branchée
// qu'une fois la police chargée. Contexte graphique perdu : rendu ordinaire.
function ouvrir(adresse: string, o: Ouvert): void {
  o.ouvert = true
  o.xterm.open(o.el)
  void policePrete.then(() => {
    if (ouverts.get(adresse) !== o) return
    try {
      const webgl = new WebglAddon()
      webgl.onContextLoss(() => webgl.dispose())
      o.xterm.loadAddon(webgl)
    } catch {
      // Pas de WebGL : rendu ordinaire.
    }
  })
}

function ajuster(adresse: string, o: Ouvert): void {
  if (!o.el.isConnected || o.el.clientWidth === 0 || o.el.clientHeight === 0) return
  if (!o.ouvert) ouvrir(adresse, o)
  o.ajustement.fit()
  if (!o.attache) {
    o.attache = true
    // En arrière-plan, l'attache n'impose pas sa taille (le focus la donnera).
    window.berger.envoyer('berger:attacher', {
      adresse,
      cols: o.xterm.cols,
      rows: o.xterm.rows,
      actif: document.hasFocus()
    })
    return
  }
  // Un terminal n'a qu'une taille : Berger n'impose la sienne que s'il a le focus.
  envoyerTaille(adresse, o)
}

export function initTerminaux(rappels: { fin: (adresse: string) => void }): void {
  surFin = rappels.fin
  window.berger.ecouter('berger:sortie', ({ adresse, octets }) =>
    ouverts.get(adresse)?.xterm.write(octets)
  )
  window.berger.ecouter('berger:fin-terminal', ({ adresse, raison }) => {
    const o = ouverts.get(adresse)
    if (!o) return
    if (Date.now() - o.cree < 3000) arretes.set(adresse, raison)
    o.xterm.dispose()
    o.el.remove()
    ouverts.delete(adresse)
    surFin(adresse)
  })
  window.berger.ecouter('berger:connexion', ({ etat }) => {
    if (etat === 'connecte') arretes.clear()
  })
  // Comme dans Herdr : la fenêtre où l'on travaille impose sa taille.
  window.addEventListener('focus', () => {
    window.berger.envoyer('berger:focus', { actif: true })
    for (const [adresse, o] of ouverts) envoyerTaille(adresse, o)
  })
  window.addEventListener('blur', () => window.berger.envoyer('berger:focus', { actif: false }))
}

export function raisonArret(adresse: string): string | undefined {
  return arretes.get(adresse)
}

// Crée ou rend l'élément du terminal ; il s'attache dès qu'il a une taille.
export function vueTerminal(adresse: string): HTMLElement {
  const deja = ouverts.get(adresse)
  if (deja) return deja.el
  const el = document.createElement('div')
  el.className = 'xterm-hote'
  el.style.width = '100%'
  el.style.height = '100%'
  const xterm = new Terminal({
    fontFamily: POLICE,
    fontSize: 12,
    // Le rendu natif de Herdr est plus épais : la graisse « Medium » s'en approche.
    fontWeight: '500',
    fontWeightBold: '700',
    cursorBlink: true,
    allowProposedApi: true,
    theme: THEME
  })
  const ajustement = new FitAddon()
  xterm.loadAddon(ajustement)
  const o: Ouvert = { el, xterm, ajustement, attache: false, cree: Date.now(), ouvert: false }
  ouverts.set(adresse, o)
  xterm.onData((texte) =>
    window.berger.envoyer('berger:touches', { adresse, octets: encodeur.encode(texte) })
  )
  xterm.onBinary((texte) =>
    window.berger.envoyer('berger:touches', {
      adresse,
      octets: Uint8Array.from(texte, (c) => c.charCodeAt(0))
    })
  )
  // Les raccourcis de Berger ne partent pas au terminal.
  xterm.attachCustomKeyEventHandler((e) => actionDe(e, 'terminal') === null)
  new ResizeObserver(() => ajuster(adresse, o)).observe(el)
  return el
}

export function oublierTerminauxSauf(adresses: Set<string>): void {
  for (const [adresse, o] of ouverts) {
    if (adresses.has(adresse)) continue
    if (o.attache) window.berger.envoyer('berger:detacher', { adresse })
    o.xterm.dispose()
    o.el.remove()
    ouverts.delete(adresse)
  }
}

export function donnerClavier(adresse: string): void {
  ouverts.get(adresse)?.xterm.focus()
}

export function aLeClavier(adresse: string): boolean {
  const o = ouverts.get(adresse)
  return !!o && o.el.contains(document.activeElement)
}
