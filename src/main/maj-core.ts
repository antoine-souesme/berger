import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { cheminHc } from './hc'
import { versionDeHc, versionDisponible, type EtatMajCore } from '../shared/maj-core'

// Berger regarde au lancement puis toutes les heures si une version plus
// récente de herdr-core est publiée, et l'installe sur demande (`hc update` :
// le core redémarre, les terminaux continuent, Berger se rebranche seul).
// Essai : BERGER_VERSION_CORE=<x.y.z> fait croire à Berger qu'il a cette
// version ; « Mettre à jour » est alors joué sans rien installer.
const PUBLIE = 'https://releases.herdr.dev/core/latest.json'
const INTERVALLE = 60 * 60 * 1000
const trace = (m: string): void => {
  if (process.env['BERGER_TRACE']) console.log(`[berger] herdr-core update: ${m}`)
}

function lancerHc(args: string[], delai: number): Promise<{ code: number; sortie: string }> {
  return new Promise((ok) => {
    execFile(cheminHc(), args, { timeout: delai, encoding: 'utf8' }, (err, stdout, stderr) =>
      ok({
        code: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
        sortie: `${stdout}\n${stderr}`.trim()
      })
    )
  })
}

export function brancherMajCore(envoyer: (e: EtatMajCore) => void): void {
  const simulee = process.env['BERGER_VERSION_CORE'] || null
  let etat: EtatMajCore = {
    actuelle: null,
    disponible: null,
    verifieA: null,
    erreur: null,
    enCours: false
  }
  const changer = (e: Partial<EtatMajCore>): EtatMajCore => {
    etat = { ...etat, ...e }
    envoyer(etat)
    return etat
  }

  const verifier = async (): Promise<EtatMajCore> => {
    const actuelle = simulee ?? versionDeHc((await lancerHc(['--version'], 10_000)).sortie)
    try {
      const r = await fetch(PUBLIE, { signal: AbortSignal.timeout(10_000), cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const publie: unknown = await r.json()
      const disponible = actuelle ? versionDisponible(actuelle, publie) : null
      trace(`installed ${actuelle}, available ${disponible ?? 'none'}`)
      return changer({ actuelle, disponible, verifieA: Date.now(), erreur: null })
    } catch (e) {
      trace(`check failed: ${(e as Error).message}`)
      return changer({ actuelle, verifieA: null, erreur: 'La vérification a échoué.' })
    }
  }

  const mettreAJour = async (): Promise<EtatMajCore> => {
    if (etat.enCours || !etat.disponible) return etat
    changer({ enCours: true, erreur: null })
    if (simulee) {
      await new Promise((ok) => setTimeout(ok, 1500))
      return changer({ enCours: false, actuelle: etat.disponible, disponible: null })
    }
    const r = await lancerHc(['update'], 5 * 60_000)
    trace(`hc update → ${r.code}`)
    const fin = r.sortie.split('\n').filter(Boolean).pop() ?? ''
    changer({ enCours: false })
    const apres = await verifier()
    if (r.code !== 0)
      return changer({ erreur: `La mise à jour a échoué${fin ? ` : ${fin}` : '.'}` })
    return apres
  }

  ipcMain.handle('berger:maj-core', () => etat)
  ipcMain.handle('berger:verifier-core', () => verifier())
  ipcMain.handle('berger:mettre-a-jour-core', () => mettreAJour())
  void verifier()
  setInterval(() => void verifier(), INTERVALLE)
}
