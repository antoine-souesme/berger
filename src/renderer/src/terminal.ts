// Un xterm par terminal affiché, branché sur le processus principal. Il est
// gardé tant que son onglet est affiché ; les autres sont détachés (jamais
// tués) et rattachés au retour.
import { Terminal, type FontWeight, type ILink, type ITheme } from '@xterm/xterm'
import { WebglAddon } from '@xterm/addon-webgl'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { actionDe } from '../../shared/raccourcis'
import { sequenceMac } from '../../shared/touches-mac'
import { CHEMINS_GLISSES, cheminsDesUrl, texteDepot } from '../../shared/depot'
import { dispositionActuelle, tableActuelle } from './table-raccourcis'
import { couleursTerminal, type CouleursTerminal } from '../../shared/themes'
import { THEMES_FOURNIS } from '../../shared/themes-fournis'
import { REGLAGES_PAR_DEFAUT, type Reglages } from '../../shared/reglages'
import { lienWeb } from '../../shared/liens'
import {
  candidatsFichiers,
  cibleLienFichier,
  resoudreChemin,
  type CibleFichier
} from '../../shared/liens-fichiers'

type Ouvert = {
  el: HTMLElement
  xterm: Terminal
  attache: boolean
  cree: number
  ouvert: boolean
  // Redimensionnement en attente (le cadre bouge encore).
  attente?: ReturnType<typeof setTimeout>
}

// Tant que le cadre bouge (séparateur tiré, fenêtre redimensionnée), le
// terminal garde sa taille : chaque nouvelle taille fait tout effacer et
// redessiner au programme (Claude Code, lazygit), d'où des terminaux vides.
const PAUSE_REDIMENSION = 120

// Couleurs et police courantes (thème de l'application, réglages).
let THEME: ITheme = couleursTerminal(THEMES_FOURNIS[0].theme)
let POLICE: Reglages['terminal'] = REGLAGES_PAR_DEFAUT.terminal

const optionsPolice = (p: Reglages['terminal']) => ({
  fontFamily: p.police,
  fontSize: p.taille,
  fontWeight: p.graisse as FontWeight,
  fontWeightBold: p.graisseGras as FontWeight,
  lineHeight: p.interligne,
  letterSpacing: p.espacement
})

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

const ouverts = new Map<string, Ouvert>()

// La police doit être chargée avant le rendu par la carte graphique : sinon il
// dessine ses lettres avec une autre police que celle qui a mesuré les cases.
const policePrete = document.fonts.load("12px 'IBM Plex Mono'").catch(() => [])

// Terminaux dont le flux s'est arrêté juste après l'ouverture : on ne les
// rouvre pas en boucle, on montre la raison.
const arretes = new Map<string, string>()
const encodeur = new TextEncoder()
let surFin: (adresse: string) => void = () => {}
// Ouvrir un fichier dans l'éditeur, et d'où partent les chemins relatifs.
let liensFichiers: {
  dossier: (adresse: string) => string
  maison: string
  ouvrir: (cible: CibleFichier) => void
} | null = null

export function brancherLiensFichiers(l: NonNullable<typeof liensFichiers>): void {
  liensFichiers = l
}

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
    // La carte graphique arrondit les cases au pixel (7 px au lieu de 7,2) : le
    // nombre de colonnes et de lignes calculé avant elle laissait une marge.
    ajuster(adresse, o)
  })
}

// Autant de colonnes et de lignes que la place en tient. La barre de défilement
// de xterm passe par-dessus le texte : on ne lui réserve pas de place (le module
// « fit » en réservait 14 px, d'où une marge droite plus grande que la gauche).
// Le reste (moins d'une case) est partagé entre la gauche et la droite (CSS).
function ajusterTaille(o: Ouvert): void {
  const cellule = (
    o.xterm as unknown as {
      _core: {
        _renderService: { dimensions: { css: { cell: { width: number; height: number } } } }
      }
    }
  )._core._renderService.dimensions.css.cell
  if (!cellule.width || !cellule.height) return
  const cols = Math.max(2, Math.floor(o.el.clientWidth / cellule.width))
  const rows = Math.max(1, Math.floor(o.el.clientHeight / cellule.height))
  if (cols !== o.xterm.cols || rows !== o.xterm.rows) o.xterm.resize(cols, rows)
}

function ajuster(adresse: string, o: Ouvert): void {
  if (!o.el.isConnected || o.el.clientWidth === 0 || o.el.clientHeight === 0) return
  if (!o.ouvert) ouvrir(adresse, o)
  ajusterTaille(o)
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

// Couleurs (thème de l'application) et police (réglages) : appliquées aux
// terminaux ouverts, qui sont remesurés, et prises par les suivants.
export function appliquerTerminal(couleurs: CouleursTerminal, police: Reglages['terminal']): void {
  const policeChange =
    JSON.stringify(optionsPolice(police)) !== JSON.stringify(optionsPolice(POLICE))
  THEME = couleurs
  POLICE = police
  for (const [adresse, o] of ouverts) {
    o.xterm.options.theme = couleurs
    if (!policeChange) continue
    Object.assign(o.xterm.options, optionsPolice(police))
    // Remesurer une fois la police chargée (sinon les cases sont mal mesurées).
    void document.fonts
      .load(`${police.graisse} ${police.taille}px ${police.police}`)
      .catch(() => [])
      .then(() => ajuster(adresse, o))
  }
}

// Le texte sélectionné à la souris part dans le presse-papiers quand le bouton
// est relâché (même hors du terminal). Seule la sélection de xterm compte : un
// programme qui prend la souris (Claude Code en plein écran) fait la sienne et
// la copie lui-même, xterm n'en voit rien, donc pas de seconde copie.
function brancherCopieSelection(el: HTMLElement, xterm: Terminal): void {
  el.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0) return
      window.addEventListener(
        'mouseup',
        () =>
          setTimeout(() => {
            if (!POLICE.copierSelection || !xterm.hasSelection()) return
            const texte = xterm.getSelection()
            if (texte) void navigator.clipboard.writeText(texte).catch(() => {})
          }),
        { once: true, capture: true }
      )
    },
    true
  )
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
  el.dataset['adresse'] = adresse
  el.style.width = '100%'
  el.style.height = '100%'
  const xterm = new Terminal({
    ...optionsPolice(POLICE),
    cursorBlink: true,
    allowProposedApi: true,
    // Lettres dessinées sur un fond transparent : macOS ne les épaissit pas
    // (sur un fond plein, il les grossit et les rend floues). Plus proche de Herdr.
    allowTransparency: true,
    theme: THEME,
    // Liens posés par le programme (OSC 8, comme ceux de Claude Code).
    // Liens posés par le programme (OSC 8, comme ceux de Claude Code) : web
    // ou `file://`.
    linkHandler: { activate: ouvrirLien, allowNonHttpProtocols: true }
  })
  // Adresses web écrites en clair dans le terminal.
  xterm.loadAddon(new WebLinksAddon(ouvrirLien))
  // Chemins de fichiers écrits en clair (ceux qui existent sur le disque).
  xterm.registerLinkProvider({
    provideLinks: (y, rendre) => void liensDeFichiers(adresse, xterm, y).then(rendre)
  })
  const o: Ouvert = { el, xterm, attache: false, cree: Date.now(), ouvert: false }
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
  // Les raccourcis de Berger ne partent pas au terminal ; quelques touches du
  // Mac partent avec la suite d'octets qu'attendent les programmes (⇧↵, ⌘←…).
  xterm.attachCustomKeyEventHandler((e) => {
    if (actionDe(e, 'terminal', tableActuelle(), dispositionActuelle()) !== null) return false
    const sequence = sequenceMac(e)
    if (sequence === null) return true
    if (e.type === 'keydown') {
      e.preventDefault()
      window.berger.envoyer('berger:touches', { adresse, octets: encodeur.encode(sequence) })
    }
    return false
  })
  brancherDepot(el, xterm)
  brancherCopieSelection(el, xterm)
  new ResizeObserver(() => {
    clearTimeout(o.attente)
    if (!o.attache) return ajuster(adresse, o)
    o.attente = setTimeout(() => ajuster(adresse, o), PAUSE_REDIMENSION)
  }).observe(el)
  return el
}

// ⌘-clic sur un lien : une adresse web s'ouvre dans le navigateur, un fichier
// dans l'éditeur. Un clic seul reste au terminal (sélection, programmes qui
// suivent la souris).
function ouvrirLien(ev: MouseEvent, url: string): void {
  if (!ev.metaKey) return
  ev.preventDefault()
  const fichier = cibleLienFichier(url)
  if (fichier) return ouvrirFichier(fichier)
  if (lienWeb(url)) window.berger.envoyer('berger:ouvrir-lien', { url })
}

function ouvrirFichier(cible: CibleFichier): void {
  liensFichiers?.ouvrir(cible)
}

// Les chemins de fichiers de la ligne `y` (comptée à partir de 1), avec les
// lignes qu'elle continue ou qui la continuent quand le texte a été coupé par
// la largeur du terminal. Seuls ceux qui existent deviennent des liens.
async function liensDeFichiers(adresse: string, xterm: Terminal, y: number): Promise<ILink[]> {
  const l = liensFichiers
  if (!l) return []
  const buf = xterm.buffer.active
  let haut = y - 1
  while (haut > 0 && buf.getLine(haut)?.isWrapped) haut--
  let bas = y - 1
  while (buf.getLine(bas + 1)?.isWrapped) bas++
  // Une ligne trop longue (sortie sans retour) : on ne la parcourt pas.
  if (bas - haut > 20) return []
  // Le texte, et pour chacun de ses caractères la case où il est dessiné (un
  // accent combiné ou un emoji n'occupe pas autant de cases que de caractères).
  let texte = ''
  const cases: { x: number; y: number }[] = []
  for (let i = haut; i <= bas; i++) {
    const ligne = buf.getLine(i)
    if (!ligne) break
    for (let x = 0; x < ligne.length; x++) {
      const c = ligne.getCell(x)
      if (!c || c.getWidth() === 0) continue
      const car = c.getChars() || ' '
      texte += car
      for (let k = 0; k < car.length; k++) cases.push({ x: x + 1, y: i + 1 })
    }
  }
  const candidats = candidatsFichiers(texte)
  if (!candidats.length) return []
  const dossier = l.dossier(adresse)
  const absolus = candidats.map((c) => resoudreChemin(c.chemin, dossier, l.maison))
  const existants = new Set(
    await window.berger
      .demander<string[]>('berger:fichiers-seuls', { chemins: [...new Set(absolus)] })
      .catch(() => [] as string[])
  )
  const liens: ILink[] = []
  candidats.forEach((c, i) => {
    const chemin = absolus[i]
    if (!existants.has(chemin)) return
    const debut = cases[c.debut]
    const fin = cases[c.fin - 1]
    // xterm ne demande que les liens qui touchent la ligne `y`.
    if (!debut || !fin || debut.y > y || fin.y < y) return
    liens.push({
      range: { start: debut, end: fin },
      text: texte.slice(c.debut, c.fin),
      decorations: { pointerCursor: true, underline: true },
      activate: (ev) => {
        if (!ev.metaKey) return
        ev.preventDefault()
        ouvrirFichier({ chemin, ligne: c.ligne, colonne: c.colonne })
      }
    })
  })
  return liens
}

// Des fichiers déposés (du Finder ou de l'explorateur) : leurs chemins
// s'écrivent dans le terminal, comme un collage.
function brancherDepot(el: HTMLElement, xterm: Terminal): void {
  const accepte = (ev: DragEvent): boolean => {
    const types = ev.dataTransfer?.types ?? []
    return (
      types.includes('Files') || types.includes(CHEMINS_GLISSES) || types.includes('text/uri-list')
    )
  }
  el.addEventListener('dragover', (ev) => {
    if (!accepte(ev)) return
    ev.preventDefault()
    ev.stopPropagation()
    ev.dataTransfer!.dropEffect = 'copy'
    el.classList.add('depot')
  })
  el.addEventListener('dragleave', (ev) => {
    if (!el.contains(ev.relatedTarget as Node | null)) el.classList.remove('depot')
  })
  el.addEventListener('drop', (ev) => {
    el.classList.remove('depot')
    if (!accepte(ev)) return
    ev.preventDefault()
    ev.stopPropagation()
    void cheminsDeposes(ev.dataTransfer!).then((chemins) => {
      const texte = texteDepot(chemins)
      if (!texte) return
      xterm.paste(texte)
      xterm.focus()
    })
  })
}

// Les chemins d'un dépôt : ceux de l'explorateur, ceux des fichiers du Finder,
// sinon les liens `file://` ; un fichier sans chemin sur le disque (vignette
// d'une capture d'écran) est d'abord enregistré à part.
async function cheminsDeposes(dt: DataTransfer): Promise<string[]> {
  const interne = dt.getData(CHEMINS_GLISSES)
  if (interne) return JSON.parse(interne) as string[]
  const fichiers = [...dt.files]
  const urls = cheminsDesUrl(dt.getData('text/uri-list'))
  const chemins = fichiers.map((f) => window.berger.cheminDe(f))
  if (fichiers.length && chemins.every(Boolean)) return chemins
  if (urls.length) return urls
  return Promise.all(
    fichiers.map(async (f, i) =>
      chemins[i]
        ? chemins[i]
        : window.berger.demander<string>('berger:enregistrer-depot', {
            nom: f.name,
            octets: new Uint8Array(await f.arrayBuffer())
          })
    )
  )
}

// Scénarios de vérification : la position dans la fenêtre du centre de la
// première case où le terminal affiche ce texte.
if (window.berger.scenario)
  Object.assign(window, {
    bergerPositionTexte(adresse: string, texte: string): { x: number; y: number } | null {
      const o = ouverts.get(adresse)
      const ecran = o?.el.querySelector('.xterm-screen')
      if (!o || !ecran) return null
      const tampon = o.xterm.buffer.active
      for (let i = 0; i < o.xterm.rows; i++) {
        const ligne = tampon.getLine(tampon.viewportY + i)?.translateToString() ?? ''
        const col = ligne.indexOf(texte)
        if (col < 0) continue
        const r = ecran.getBoundingClientRect()
        const l = r.width / o.xterm.cols
        const h = r.height / o.xterm.rows
        return { x: r.x + (col + 4.5) * l, y: r.y + (i + 0.5) * h }
      }
      return null
    }
  })

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
