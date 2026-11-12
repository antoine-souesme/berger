import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from 'fs'
import { join } from 'path'
import { lireReglages, modifierReglage, type EtatReglages, type Reglages } from '../shared/reglages'
import { affichageDe, lireTheme, type ThemeConnu, type ThemeHerdr } from '../shared/themes'
import { THEME_PAR_DEFAUT, THEMES_FOURNIS } from '../shared/themes-fournis'

// Les réglages (`reglages.json`) et les thèmes personnels (`themes/*.json`) du
// dossier de données : lus au démarrage, suivis à chaud, poussés à la fenêtre.
export type { EtatReglages }

export const MESSAGE_MAL_FORME = 'reglages.json est mal formé : derniers réglages valides gardés.'

const dossier = (): string => app.getPath('userData')
const fichier = (): string => join(dossier(), 'reglages.json')
const dossierThemes = (): string => join(dossier(), 'themes')

let etat: EtatReglages | null = null

function lireTexte(): string {
  try {
    return readFileSync(fichier(), 'utf8')
  } catch {
    return ''
  }
}

// Thèmes fournis, puis ceux du dossier ; un thème personnel remplace le fourni de même id.
function lireThemes(): ThemeConnu[] {
  const themes = [...THEMES_FOURNIS]
  let noms: string[]
  try {
    noms = readdirSync(dossierThemes()).filter((n) => n.endsWith('.json'))
  } catch {
    return themes
  }
  for (const nom of noms.sort()) {
    const id = nom.slice(0, -'.json'.length)
    let theme: ThemeHerdr | null
    try {
      theme = lireTheme(JSON.parse(readFileSync(join(dossierThemes(), nom), 'utf8')))
    } catch {
      theme = null
    }
    if (!theme) {
      console.log(`[berger] thème illisible ignoré : ${nom}`)
      continue
    }
    const t: ThemeConnu = { id, nom: id, theme, source: 'perso' }
    const i = themes.findIndex((x) => x.id === id)
    if (i >= 0) themes[i] = t
    else themes.push(t)
  }
  return themes
}

function relire(): EtatReglages {
  const texte = lireTexte()
  let reglages: Reglages
  let erreur: string | null = null
  try {
    reglages = lireReglages(texte.trim() ? JSON.parse(texte) : null)
  } catch {
    reglages = etat?.reglages ?? lireReglages(null)
    erreur = MESSAGE_MAL_FORME
  }
  etat = {
    reglages,
    themes: lireThemes(),
    erreur,
    chemin: fichier(),
    dossierThemes: dossierThemes()
  }
  return etat
}

export function etatReglages(): EtatReglages {
  return etat ?? relire()
}

// Le thème de l'application (inconnu : antoine-monokai).
export function themeApplication(): ThemeConnu {
  const e = etatReglages()
  return (
    e.themes.find((t) => t.id === e.reglages.apparence.themeApplication) ??
    e.themes.find((t) => t.id === THEME_PAR_DEFAUT)!
  )
}

// Les couleurs données au core pour les terminaux.
// Avant le branchement (ou sans Electron, dans les tests) : antoine-monokai.
export function affichage(): { bg: string; fg: string; cursor: string } {
  if (!etat) return affichageDe(THEMES_FOURNIS.find((t) => t.id === THEME_PAR_DEFAUT)!.theme)
  return affichageDe(themeApplication().theme)
}

export function brancherReglages(envoyer: (e: EtatReglages) => void): {
  actuel(): EtatReglages
  affichage(): { bg: string; fg: string; cursor: string }
} {
  try {
    mkdirSync(dossierThemes(), { recursive: true })
  } catch (e) {
    console.error('[berger] dossier des thèmes non créé :', (e as Error).message)
  }
  relire()

  // Un éditeur peut remplacer le fichier au lieu de l'écrire : on surveille le
  // dossier, et on regroupe les événements.
  let minuteur: NodeJS.Timeout | null = null
  const plusTard = (): void => {
    if (minuteur) clearTimeout(minuteur)
    minuteur = setTimeout(() => {
      minuteur = null
      const avant = JSON.stringify(etat)
      const apres = relire()
      if (JSON.stringify(apres) !== avant) envoyer(apres)
    }, 150)
  }
  try {
    watch(dossier(), (_type, nom) => {
      if (nom === 'reglages.json') plusTard()
    })
    watch(dossierThemes(), () => plusTard())
  } catch (e) {
    console.error('[berger] réglages non surveillés :', (e as Error).message)
  }

  ipcMain.handle('berger:reglages', () => etatReglages())
  // « Ouvrir le fichier des réglages » : un fichier vide s'il n'existe pas encore.
  ipcMain.handle('berger:creer-reglages', () => {
    if (!existsSync(fichier())) writeFileSync(fichier(), '{}\n')
    return fichier()
  })
  ipcMain.handle(
    'berger:modifier-reglage',
    (_e, { chemin, valeur }: { chemin: string[]; valeur: unknown }) => {
      const texte = modifierReglage(lireTexte(), chemin, valeur)
      if (texte === null) return { ok: false, message: MESSAGE_MAL_FORME }
      try {
        writeFileSync(fichier(), texte)
      } catch (e) {
        return { ok: false, message: `Réglages non enregistrés : ${(e as Error).message}` }
      }
      const avant = JSON.stringify(etat)
      const apres = relire()
      if (JSON.stringify(apres) !== avant) envoyer(apres)
      return { ok: true }
    }
  )
  return { actuel: etatReglages, affichage }
}
