// La fenêtre des réglages (⌘,, menu « Berger › Réglages… », bouton en bas de
// la colonne des spaces), d'après docs/maquettes/reglages.html. Chaque
// changement est écrit dans reglages.json par la partie Node ; l'affichage
// suit les poussées `berger:reglages` (une modification à la main s'y voit).
import * as monaco from 'monaco-editor'
import type { EtatReglages } from '../../shared/reglages'
import type { EtatMajCore } from '../../shared/maj-core'
import {
  COMMANDES,
  conflitDe,
  libelleTouches,
  touchesDe,
  touchesEffectives,
  refusTouches
} from '../../shared/raccourcis'
import { couleursFenetre, themeEditeur, type ThemeHerdr } from '../../shared/themes'
import { THEMES_EDITEUR_VSCODE } from '../../shared/themes-fournis'
import { modifierReglage, reglagesActuels, surReglages } from './apparence'
import { apresThemeEditeur, lireThemeVsCode } from './coloration'
import { changer, ouvrirChemins } from './etat'
import { icone } from './icones'
import { dispositionActuelle } from './table-raccourcis'

export type Section =
  | 'apparence'
  | 'editeur'
  | 'terminal'
  | 'alertes'
  | 'raccourcis'
  | 'mises-a-jour'

const SECTIONS: [Section, string, string][] = [
  ['apparence', 'Apparence', 'palette'],
  ['editeur', 'Éditeur', 'code'],
  ['terminal', 'Terminal', 'square-terminal'],
  ['alertes', 'Alertes', 'bell'],
  ['raccourcis', 'Raccourcis', 'keyboard'],
  ['mises-a-jour', 'Mises à jour', 'refresh-cw']
]

const APERCU = `// Enregistre le fichier ouvert.
async function enregistrer(): Promise<void> {
  const texte = editeur.getValue()
  await window.berger.enregistrer(chemin, texte, 0, 'utf8')
}`

const POLICES_INTERFACE: [string, string][] = [
  ['Système', "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"],
  ['IBM Plex Sans', "'IBM Plex Sans', -apple-system, sans-serif"],
  ['Helvetica Neue', "'Helvetica Neue', sans-serif"],
  ['Avenir Next', "'Avenir Next', sans-serif"],
  ['Menlo', 'Menlo, monospace']
]

let ouvert: { section: Section; fermer: () => void; dessiner: () => void } | null = null
// La ligne de raccourci en attente de touches, et les touches appuyées.
let attente: { id: string; touches: string | null } | null = null
let message = ''
let filtre = ''

export function reglagesOuverts(): boolean {
  return ouvert !== null
}

const creer = <K extends keyof HTMLElementTagNameMap>(
  balise: K,
  classe = '',
  texte = ''
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(balise)
  if (classe) el.className = classe
  if (texte) el.textContent = texte
  return el
}

async function changerReglage(chemin: string[], valeur: unknown): Promise<boolean> {
  const r = await modifierReglage(chemin, valeur)
  message = r.ok ? '' : r.message
  ouvert?.dessiner()
  return r.ok
}

// --- Apparence ---

type Choix = { id: string; nom: string; pastilles: string[] }

// Les pastilles d'un thème : fond, panneau, puis trois couleurs du code.
function pastillesDe(t: ThemeHerdr): string[] {
  const f = couleursFenetre(t)
  const e = themeEditeur(t, null)
  const couleur = (portee: string): string =>
    (e.tokenColors.find((r) => [r.scope].flat().includes(portee))?.settings.foreground as string) ??
    t.foreground
  return [f.fond, f.panneau, couleur('keyword'), couleur('string'), couleur('entity.name.function')]
}

const pastillesVsCode = new Map<string, string[]>()
function pastillesDeVsCode(id: string, fichier: string): string[] {
  const deja = pastillesVsCode.get(id)
  if (deja) return deja
  void lireThemeVsCode(fichier).then((t) => {
    const c = t.colors
    const regle = (portee: string): string =>
      (t.tokenColors.find((r) => [r.scope].flat().includes(portee))?.settings
        .foreground as string) ?? c['editor.foreground']
    pastillesVsCode.set(id, [
      c['editor.background'],
      c['sideBar.background'] ?? c['editor.background'],
      regle('keyword'),
      regle('string'),
      regle('entity.name.type')
    ])
    ouvert?.dessiner()
  })
  return []
}

function listeThemes(titre: string, choix: Choix[], actuel: string, cle: string[]): HTMLElement {
  const bloc = creer('div', 'bloc-themes')
  bloc.append(creer('div', 'titre-reglage', titre))
  const grille = creer('div', 'grille-themes')
  grille.setAttribute('role', 'listbox')
  grille.setAttribute('aria-label', titre)
  for (const c of choix) {
    const b = creer('button', 'choix-theme' + (c.id === actuel ? ' choisi' : ''))
    b.setAttribute('role', 'option')
    b.setAttribute('aria-selected', String(c.id === actuel))
    b.dataset['theme'] = c.id
    const texte = creer('span', 'texte-theme')
    texte.append(creer('span', 'nom-theme', c.nom))
    const p = creer('span', 'pastilles')
    for (const couleur of c.pastilles) {
      const s = creer('span', 'pastille-theme')
      s.style.background = couleur
      p.append(s)
    }
    texte.append(p)
    b.append(texte)
    if (c.id === actuel) b.append(icone('check', 'var(--clavier)', 14))
    b.onclick = () => void changerReglage(cle, c.id)
    grille.append(b)
  }
  bloc.append(grille)
  return bloc
}

function ligne(titre: string, aide: string, ...controles: HTMLElement[]): HTMLElement {
  const l = creer('div', 'ligne-reglage')
  const t = creer('div', 'textes-reglage')
  t.append(creer('span', 'nom-reglage', titre))
  if (aide) t.append(creer('span', 'aide-reglage', aide))
  l.append(t, ...controles)
  return l
}

function liste(
  options: [string, string][],
  valeur: string,
  surChoix: (v: string) => void,
  classe = ''
): HTMLSelectElement {
  const s = creer('select', 'liste-reglage ' + classe)
  const toutes = options.some(([, v]) => v === valeur) ? options : [...options, [valeur, valeur]]
  for (const [libelle, v] of toutes) {
    const o = creer('option', '', libelle)
    o.value = v
    o.selected = v === valeur
    s.append(o)
  }
  s.onchange = () => surChoix(s.value)
  return s
}

const tailles = (min: number, max: number): [string, string][] =>
  Array.from({ length: max - min + 1 }, (_, i) => [String(min + i), String(min + i)])

function champTexte(valeur: string, surChoix: (v: string) => void): HTMLInputElement {
  const c = creer('input', 'champ-reglage')
  c.value = valeur
  c.spellcheck = false
  const valider = (): void => {
    if (c.value.trim() && c.value !== valeur) surChoix(c.value.trim())
  }
  c.onchange = valider
  c.onkeydown = (ev) => {
    if (ev.key === 'Enter') valider()
  }
  return c
}

function bascule(valeur: boolean, surChoix: (v: boolean) => void): HTMLElement {
  const b = creer('button', 'bascule' + (valeur ? ' active' : ''))
  b.setAttribute('role', 'switch')
  b.setAttribute('aria-checked', String(valeur))
  b.append(creer('span', 'curseur-bascule'))
  b.onclick = () => surChoix(!valeur)
  return b
}

function apercu(e: EtatReglages): HTMLElement {
  const bloc = creer('div', 'bloc-apercu')
  bloc.append(creer('div', 'titre-reglage', "Aperçu (thème de l'éditeur)"))
  const code = creer('div', 'apercu-code')
  const style = getComputedStyle(document.querySelector('.monaco-editor') ?? document.body)
  code.style.background = style.getPropertyValue('--vscode-editor-background')
  code.style.color = style.getPropertyValue('--vscode-editor-foreground')
  code.style.fontFamily = e.reglages.editeur.police
  const selection =
    e.reglages.editeur.couleurSelection ??
    style.getPropertyValue('--vscode-editor-selectionBackground')
  void monaco.editor.colorize(APERCU, 'typescript', {}).then((html) => {
    code.innerHTML = html
    // La troisième ligne sélectionnée, comme dans la maquette.
    const lignes = code.querySelectorAll(':scope > span')
    const l = lignes[2] as HTMLElement | undefined
    if (l) l.style.background = selection
  })
  bloc.append(code)
  return bloc
}

function pageApparence(e: EtatReglages): HTMLElement[] {
  const r = e.reglages
  const connus: Choix[] = e.themes.map((t) => ({
    id: t.id,
    nom: t.nom,
    pastilles: pastillesDe(t.theme)
  }))
  const vscode: Choix[] = THEMES_EDITEUR_VSCODE.map((t) => ({
    id: t.id,
    nom: t.nom,
    pastilles: pastillesDeVsCode(t.id, t.fichier)
  }))
  const themes = creer('div', 'deux-themes')
  themes.append(
    listeThemes("Thème de l'application", connus, r.apparence.themeApplication, [
      'apparence',
      'themeApplication'
    ]),
    listeThemes("Thème de l'éditeur", [...connus, ...vscode], r.apparence.themeEditeur, [
      'apparence',
      'themeEditeur'
    ])
  )

  const sel = r.editeur.couleurSelection
  const style = getComputedStyle(document.querySelector('.monaco-editor') ?? document.body)
  const duTheme = style.getPropertyValue('--vscode-editor-selectionBackground').trim()
  const couleur = creer('label', 'couleur-reglage')
  const choix = creer('input')
  choix.type = 'color'
  choix.value = (sel ?? duTheme).slice(0, 7)
  choix.setAttribute('aria-label', 'Couleur de sélection')
  choix.onchange = () => void changerReglage(['editeur', 'couleurSelection'], choix.value)
  couleur.append(choix, creer('span', '', sel ?? duTheme.slice(0, 7)))
  const controles: HTMLElement[] = [couleur]
  if (sel) {
    const theme = creer('button', 'bouton-reglage', 'Celle du thème')
    theme.onclick = () => void changerReglage(['editeur', 'couleurSelection'], undefined)
    controles.unshift(theme)
  }

  return [
    themes,
    ligne(
      "Police de l'interface",
      "Textes des menus, de l'explorateur et des listes",
      liste(
        POLICES_INTERFACE,
        r.apparence.policeInterface,
        (v) => void changerReglage(['apparence', 'policeInterface'], v)
      ),
      liste(
        tailles(10, 18),
        String(r.apparence.taillePoliceInterface),
        (v) => void changerReglage(['apparence', 'taillePoliceInterface'], Number(v)),
        'etroite'
      )
    ),
    ligne(
      'Couleur de sélection',
      "Fond du texte sélectionné dans l'éditeur" + (sel ? '' : ' (celle du thème)'),
      ...controles
    ),
    apercu(e)
  ]
}

function pageEditeur(e: EtatReglages): HTMLElement[] {
  const r = e.reglages.editeur
  return [
    ligne(
      'Police',
      'Le texte des fichiers',
      champTexte(r.police, (v) => void changerReglage(['editeur', 'police'], v))
    ),
    ligne(
      'Taille',
      'En pixels',
      liste(
        tailles(8, 32),
        String(r.taille),
        (v) => void changerReglage(['editeur', 'taille'], Number(v)),
        'etroite'
      )
    ),
    ligne(
      'Retour à la ligne par défaut',
      '⌥Z le bascule ensuite pour tous les fichiers',
      bascule(r.retourLigne, (v) => {
        // Le réglage reprend la main sur ⌥Z.
        changer((etat) => (etat.retourLigne = null))
        void changerReglage(['editeur', 'retourLigne'], v)
      })
    ),
    ligne(
      'Minicarte',
      'La vue réduite du fichier, à droite',
      bascule(r.minicarte, (v) => void changerReglage(['editeur', 'minicarte'], v))
    ),
    ligne(
      'Taille des tabulations',
      'Largeur d’une tabulation, en espaces',
      liste(
        tailles(1, 8),
        String(r.tabulations),
        (v) => void changerReglage(['editeur', 'tabulations'], Number(v)),
        'etroite'
      )
    )
  ]
}

function pageTerminal(e: EtatReglages): HTMLElement[] {
  const r = e.reglages.terminal
  return [
    ligne(
      'Police',
      'Le texte des terminaux',
      champTexte(r.police, (v) => void changerReglage(['terminal', 'police'], v))
    ),
    ligne(
      'Taille',
      'En pixels',
      liste(
        tailles(8, 32),
        String(r.taille),
        (v) => void changerReglage(['terminal', 'taille'], Number(v)),
        'etroite'
      )
    ),
    ligne(
      'Graisse',
      'L’épaisseur du texte (400 : normal)',
      liste(
        graisses(),
        String(r.graisse),
        (v) => void changerReglage(['terminal', 'graisse'], Number(v)),
        'etroite'
      )
    ),
    ligne(
      'Graisse du gras',
      'L’épaisseur du texte en gras',
      liste(
        graisses(),
        String(r.graisseGras),
        (v) => void changerReglage(['terminal', 'graisseGras'], Number(v)),
        'etroite'
      )
    ),
    ligne(
      'Interligne',
      'Hauteur d’une ligne, en multiple de la taille',
      liste(
        Array.from({ length: 21 }, (_, i) => {
          const v = String(Math.round((1 + i * 0.05) * 100) / 100)
          return [v.replace('.', ','), v] as [string, string]
        }),
        String(r.interligne),
        (v) => void changerReglage(['terminal', 'interligne'], Number(v)),
        'etroite'
      )
    ),
    ligne(
      'Espacement des lettres',
      'En pixels, ajouté entre deux caractères',
      liste(
        tailles(-2, 10),
        String(r.espacement),
        (v) => void changerReglage(['terminal', 'espacement'], Number(v)),
        'etroite'
      )
    )
  ]
}

const graisses = (): [string, string][] =>
  Array.from({ length: 9 }, (_, i) => String((i + 1) * 100)).map((v) => [v, v])

function pageAlertes(e: EtatReglages): HTMLElement[] {
  const r = e.reglages.sons
  const ecouter = (son: 'fini' | 'attente'): HTMLElement => {
    const b = creer('button', 'bouton-reglage', 'Écouter')
    b.onclick = () => window.berger.envoyer('berger:son', { son, essai: true })
    return b
  }
  const aide = (perso: string | null): string =>
    perso ? `Fichier : ${perso}` : 'Son de macOS (un autre fichier : reglages.json)'
  return [
    ligne(
      'Sons des agents',
      'Quand un agent attend une réponse, ou finit sans être sous les yeux',
      bascule(r.actifs, (v) => void changerReglage(['sons', 'actifs'], v))
    ),
    ligne('Agent qui attend', aide(r.attente), ecouter('attente')),
    ligne('Agent qui a fini', aide(r.fini), ecouter('fini'))
  ]
}

// --- Mises à jour ---

let majCore: EtatMajCore | null = null

const heure = (ms: number): string =>
  new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function pageMisesAJour(): HTMLElement[] {
  const m = majCore
  const etat = !m
    ? 'Vérification…'
    : m.enCours
      ? 'Mise à jour en cours…'
      : m.erreur
        ? m.erreur
        : m.disponible
          ? `${m.disponible} est prête. Tes terminaux restent ouverts pendant la mise à jour.`
          : m.verifieA
            ? `À jour. Vérifié à ${heure(m.verifieA)}.`
            : 'Vérification…'
  const verifier = creer('button', 'bouton-reglage', 'Vérifier maintenant')
  verifier.disabled = Boolean(m?.enCours)
  verifier.onclick = async () => {
    verifier.disabled = true
    verifier.textContent = 'Vérification…'
    majCore = await window.berger.demander<EtatMajCore>('berger:verifier-core')
    surMajCore()
  }
  const boutons: HTMLElement[] = [verifier]
  if (m?.disponible) {
    const maj = creer('button', 'bouton-reglage principal', 'Mettre à jour herdr-core')
    maj.disabled = m.enCours
    maj.onclick = async () => {
      majCore = await window.berger.demander<EtatMajCore>('berger:mettre-a-jour-core')
      surMajCore()
    }
    boutons.push(maj)
  }
  const note = creer(
    'p',
    'note-reglages',
    'Berger vérifie toutes les heures. herdr-core fait tourner tes terminaux : ils continuent pendant ses mises à jour.'
  )
  return [ligne(`herdr-core ${m?.actuelle ?? ''}`.trim(), etat, ...boutons), note]
}

// Le rond bleu sur « Réglages » et sur la rubrique, et la page si elle est ouverte.
function surMajCore(): void {
  document
    .getElementById('ouvrir-reglages')
    ?.classList.toggle('avec-rond', Boolean(majCore?.disponible))
  ouvert?.dessiner()
}

// --- Raccourcis ---

function kbds(touches: string): HTMLElement {
  const s = creer('span', 'touches')
  const libelle = libelleTouches(touches)
  // Un <kbd> par modificateur, puis la touche.
  const m = /^([⌃⌥⇧⌘]*)(.*)$/.exec(libelle)!
  for (const c of m[1]) s.append(creer('kbd', '', c))
  if (m[2]) s.append(creer('kbd', '', m[2]))
  return s
}

// Pourquoi ces touches ne peuvent pas être gardées (null : elles peuvent).
function refus(perso: Record<string, string[]>, id: string, touches: string): string | null {
  const raison = refusTouches(touches)
  if (raison) return raison
  const c = conflitDe(perso, id, touches)
  return c ? `Déjà pris par « ${c.libelle} ».` : null
}

function pageRaccourcis(e: EtatReglages): HTMLElement[] {
  const perso = e.reglages.raccourcis
  const effectives = touchesEffectives(perso)
  const recherche = creer('label', 'filtre-raccourcis')
  const champ = creer('input')
  champ.placeholder = 'Filtrer les raccourcis'
  champ.value = filtre
  champ.spellcheck = false
  champ.setAttribute('aria-label', 'Filtrer les raccourcis')
  recherche.append(icone('search', 'currentColor', 14), champ)
  const tableau = creer('div', 'table-raccourcis')
  const tete = creer('div', 'tete-raccourcis')
  tete.append(creer('span', 'commande', 'Commande'), creer('span', 'raccourci', 'Raccourci'))

  const dessinerLignes = (): void => {
    const f = filtre.trim().toLowerCase()
    const lignes = COMMANDES.filter(
      (c) =>
        !f ||
        c.libelle.toLowerCase().includes(f) ||
        effectives[c.id].some((t) => libelleTouches(t).toLowerCase().includes(f))
    ).map((c) => {
      const l = creer('div', 'ligne-raccourci')
      l.dataset['commande'] = c.id
      l.append(creer('span', 'commande', c.libelle))
      const cellule = creer('button', 'raccourci')
      cellule.setAttribute('aria-label', `Changer le raccourci de « ${c.libelle} »`)
      if (attente?.id === c.id) {
        l.classList.add('en-attente')
        cellule.classList.add('attente')
        const t = attente.touches
        const pourquoi = t ? refus(perso, c.id, t) : null
        cellule.append(
          t ? kbds(t) : creer('span', 'invite', 'Appuie sur les touches…'),
          creer('span', 'espace')
        )
        if (pourquoi) cellule.append(creer('span', 'conflit', pourquoi))
        else if (effectives[c.id].length) {
          const avant = creer('span', 'avant')
          avant.append(creer('span', 'mot-avant', 'avant'))
          for (const t2 of effectives[c.id]) avant.append(kbds(t2))
          cellule.append(avant)
        }
      } else if (effectives[c.id].length) {
        for (const t of effectives[c.id]) cellule.append(kbds(t))
      } else cellule.append(creer('span', 'aucun', 'Aucun'))
      cellule.onclick = () => {
        attente = { id: c.id, touches: null }
        ouvert?.dessiner()
      }
      l.append(cellule)
      const retablir = creer('button', 'retablir')
      retablir.setAttribute('aria-label', `Rétablir « ${c.libelle} »`)
      retablir.title = 'Rétablir'
      if (perso[c.id]) {
        retablir.append(icone('rotate-ccw', 'currentColor', 13), 'Rétablir')
        retablir.onclick = () => {
          attente = null
          void changerReglage(['raccourcis', c.id], undefined)
        }
      } else retablir.disabled = true
      l.append(retablir)
      return l
    })
    tableau.replaceChildren(...lignes)
  }
  champ.oninput = () => {
    filtre = champ.value
    dessinerLignes()
  }
  dessinerLignes()
  const aide = creer('div', 'aide-raccourcis')
  aide.append(
    creer('kbd', '', 'Esc'),
    ' annule la modification, ',
    creer('kbd', '', '↵'),
    ' la garde.'
  )
  return [recherche, tete, tableau, aide]
}

// Les touches tapées pendant l'attente d'un raccourci.
function toucheAttente(ev: KeyboardEvent): void {
  if (!attente) return
  ev.preventDefault()
  if (ev.key === 'Escape') {
    attente = null
    ouvert?.dessiner()
    return
  }
  if (ev.key === 'Enter' && !ev.metaKey && !ev.ctrlKey && !ev.altKey && !ev.shiftKey) {
    const { id, touches } = attente
    const e = reglagesActuels()
    if (!touches || !e || refus(e.reglages.raccourcis, id, touches)) return
    attente = null
    const origine = COMMANDES.find((c) => c.id === id)?.touches ?? []
    const valeur = origine.length === 1 && origine[0] === touches ? undefined : [touches]
    void changerReglage(['raccourcis', id], valeur)
    return
  }
  const t = touchesDe(ev, dispositionActuelle())
  if (!t) return // une touche de modification seule
  attente.touches = t
  ouvert?.dessiner()
}

// --- la fenêtre ---

export function ouvrirReglages(section: Section = 'apparence'): void {
  if (ouvert) {
    ouvert.section = section
    ouvert.dessiner()
    return
  }
  message = ''
  attente = null
  const voile = creer('div', 'voile voile-reglages')
  const boite = creer('div', 'fenetre-reglages')
  boite.setAttribute('role', 'dialog')
  boite.setAttribute('aria-label', 'Réglages')
  boite.tabIndex = -1
  const tete = creer('header', 'tete-reglages')
  const fermer = creer('button', 'fermer-reglages')
  fermer.setAttribute('aria-label', 'Fermer')
  fermer.append(icone('x', 'currentColor', 16))
  tete.append(creer('span', 'titre', 'Réglages'), creer('span', 'raccourci-titre', '⌘,'), fermer)
  const alerte = creer('div', 'alerte-reglages')
  const corps = creer('div', 'corps-reglages')
  const nav = creer('nav', 'sections-reglages')
  const page = creer('div', 'page-reglages')
  corps.append(nav, page)
  const pied = creer('footer', 'pied-reglages')
  const lien = creer('button', 'lien-reglages', 'Ouvrir le fichier des réglages')
  const chemin = creer('span', 'chemin-reglages')
  pied.append(icone('file-cog', 'var(--clavier)', 14), lien, chemin)
  boite.append(tete, alerte, corps, pied)
  voile.append(boite)

  const etat = { section, fermer: () => {}, dessiner: () => {} }
  const dessiner = (): void => {
    const e = reglagesActuels()
    if (!e) return
    const maison = e.chemin.replace(/^\/Users\/[^/]+/, '~')
    chemin.textContent = `${maison}, modifiable à la main`
    const texte = message || e.erreur || ''
    alerte.textContent = texte
    alerte.hidden = !texte
    nav.replaceChildren(
      ...SECTIONS.map(([id, nom, ic]) => {
        const b = creer('button', 'section-reglages' + (id === etat.section ? ' choisie' : ''))
        b.dataset['section'] = id
        b.append(icone(ic, 'currentColor', 15, 1.75), nom)
        if (id === 'mises-a-jour' && majCore?.disponible) b.append(creer('span', 'rond-maj'))
        b.onclick = () => {
          etat.section = id
          attente = null
          dessiner()
        }
        return b
      })
    )
    const titre = SECTIONS.find(([id]) => id === etat.section)![1]
    const contenu =
      etat.section === 'apparence'
        ? pageApparence(e)
        : etat.section === 'editeur'
          ? pageEditeur(e)
          : etat.section === 'terminal'
            ? pageTerminal(e)
            : etat.section === 'alertes'
              ? pageAlertes(e)
              : etat.section === 'mises-a-jour'
                ? pageMisesAJour()
                : pageRaccourcis(e)
    const defilement = page.querySelector('.contenu-reglages')?.scrollTop ?? 0
    const zone = creer(
      'div',
      'contenu-reglages' + (etat.section === 'raccourcis' ? ' raccourcis' : '')
    )
    zone.append(...contenu)
    page.replaceChildren(creer('div', 'titre-page', titre), zone)
    zone.scrollTop = defilement
  }
  etat.dessiner = dessiner

  // En capture, avant le terminal et les raccourcis de Berger.
  const touches = (ev: KeyboardEvent): void => {
    ev.stopPropagation()
    if (attente) return toucheAttente(ev)
    if (ev.key === 'Escape') {
      ev.preventDefault()
      etat.fermer()
      return
    }
    if (touchesDe(ev, dispositionActuelle()) === 'cmd-,') {
      ev.preventDefault()
      etat.fermer()
      return
    }
    if (!boite.contains(ev.target as Node)) ev.preventDefault()
    else if (ev.metaKey && !['a', 'c', 'v', 'x', 'z'].includes(ev.key.toLowerCase()))
      ev.preventDefault()
  }
  const arreter = (ev: Event): void => {
    if (!boite.contains(ev.target as Node)) ev.preventDefault()
    ev.stopPropagation()
  }
  etat.fermer = () => {
    window.removeEventListener('keydown', touches, true)
    window.removeEventListener('keypress', arreter, true)
    voile.remove()
    ouvert = null
    attente = null
  }
  window.addEventListener('keydown', touches, true)
  window.addEventListener('keypress', arreter, true)
  fermer.onclick = () => etat.fermer()
  voile.addEventListener('mousedown', (ev) => {
    if (ev.target === voile) {
      ev.preventDefault()
      etat.fermer()
    }
  })
  lien.onclick = async () => {
    const f = await window.berger.demander<string>('berger:creer-reglages')
    etat.fermer()
    ouvrirChemins([f])
  }
  ouvert = etat
  document.body.append(voile)
  dessiner()
  boite.focus()
}

export function initReglages(): void {
  window.berger.ecouter('berger:ouvrir-reglages', (d?: { section?: Section }) =>
    ouvrirReglages(d?.section)
  )
  const bouton = document.getElementById('ouvrir-reglages')
  if (bouton) {
    bouton.prepend(icone('settings', 'currentColor', 14, 1.75))
    bouton.onclick = () => ouvrirReglages()
  }
  surReglages(() => ouvert?.dessiner())
  window.berger.ecouter('berger:maj-core', (e: EtatMajCore) => {
    majCore = e
    surMajCore()
  })
  void window.berger.demander<EtatMajCore>('berger:maj-core').then((e) => {
    majCore ??= e
    surMajCore()
  })
  apresThemeEditeur(() => {
    if (ouvert?.section === 'apparence') ouvert.dessiner()
  })
}
