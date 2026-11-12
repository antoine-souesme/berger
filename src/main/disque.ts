// Tout ce qui touche au disque de la machine locale, par Node : lister un
// dossier, l'état git, la liste des fichiers d'une racine pour ⌘P, la
// surveillance, les déplacements et copies. Rassemblé ici pour que la phase 6
// (fichiers d'autres machines) puisse le remplacer. Pas d'Electron ici : la
// corbeille est passée en paramètre (voir fichiers.ts).
import { spawn } from 'child_process'
import { existsSync, watch, type FSWatcher } from 'fs'
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import {
  MASQUES,
  lireStatutGit,
  nomDeCopie,
  peutDeposer,
  trierEntrees,
  type Entree,
  type GenreGit
} from '../shared/explorateur'
import { DOSSIERS_IGNORES, LIMITE_FICHIERS } from '../shared/fichiers'

export const LIMITE_DOSSIER = 2000
const POIDS_IMAGE_MAX = 50 * 1024 * 1024
const NOM_PRIS = 'Un élément porte déjà ce nom.'
const DANS_LUI_MEME = 'Impossible de déplacer un dossier dans lui-même.'

type Sortie = { code: number | null; stdout: string }

// Lance une commande ; ne rejette jamais (code null si elle n'a pas pu partir
// ou a dépassé `delai`).
function lancer(
  commande: string,
  args: string[],
  o: { cwd: string; entree?: string; delai?: number }
): Promise<Sortie> {
  return new Promise((rendre) => {
    let fini = false
    const finir = (s: Sortie): void => {
      if (fini) return
      fini = true
      rendre(s)
    }
    let p
    try {
      p = spawn(commande, args, { cwd: o.cwd, stdio: ['pipe', 'pipe', 'ignore'] })
    } catch {
      return finir({ code: null, stdout: '' })
    }
    const morceaux: Buffer[] = []
    p.stdout.on('data', (d: Buffer) => morceaux.push(d))
    p.on('error', () => finir({ code: null, stdout: '' }))
    p.on('close', (code) => finir({ code, stdout: Buffer.concat(morceaux).toString('utf8') }))
    p.stdin.on('error', () => {})
    p.stdin.end(o.entree ?? '')
    if (o.delai)
      setTimeout(() => {
        p.kill()
        finir({ code: null, stdout: '' })
      }, o.delai)
  })
}

const message = (e: unknown): string => (e as Error).message ?? String(e)

// Les noms de ce dossier que git ignore (vide hors dépôt).
async function ignores(dossier: string, noms: string[]): Promise<Set<string>> {
  if (!noms.length) return new Set()
  const r = await lancer('git', ['check-ignore', '-z', '--stdin'], {
    cwd: dossier,
    entree: noms.join('\0') + '\0',
    delai: 2000
  })
  if (r.code !== 0) return new Set()
  return new Set(
    r.stdout
      .split('\0')
      .filter(Boolean)
      .map((n) => n.replace(/\/$/, ''))
  )
}

// Un niveau d'un dossier : masqués retirés, dossiers d'abord, 2 000 au plus.
export async function listerDossier(
  dossier: string
): Promise<{ entrees: Entree[]; tronque: boolean } | { erreur: string }> {
  let liste
  try {
    liste = await readdir(dossier, { withFileTypes: true })
  } catch (e) {
    return { erreur: message(e) }
  }
  const entrees: Entree[] = []
  for (const d of liste) {
    if (MASQUES.has(d.name)) continue
    let estDossier = d.isDirectory()
    if (d.isSymbolicLink())
      estDossier = await stat(join(dossier, d.name)).then(
        (s) => s.isDirectory(),
        () => false
      )
    entrees.push({ nom: d.name, dossier: estDossier, ignore: false })
  }
  const triees = trierEntrees(entrees)
  const tronque = triees.length > LIMITE_DOSSIER
  const gardees = triees.slice(0, LIMITE_DOSSIER)
  const ign = await ignores(
    dossier,
    gardees.map((e) => e.nom)
  )
  for (const e of gardees) e.ignore = ign.has(e.nom)
  return { entrees: gardees, tronque }
}

// L'état git d'une racine : le dossier du dépôt et les changements relatifs à
// lui ; null hors dépôt (ou après 2 s).
export async function statutGit(
  racine: string
): Promise<{ depot: string; statut: [string, GenreGit][] } | null> {
  const pref = await lancer('git', ['rev-parse', '--show-prefix'], { cwd: racine, delai: 2000 })
  if (pref.code !== 0) return null
  // Le dépôt vu depuis le chemin de la racine (pas son chemin réel : /var ≠ /private/var).
  const prefixe = pref.stdout.trim().replace(/\/$/, '')
  const depot = prefixe ? racine.slice(0, racine.length - prefixe.length - 1) : racine
  const r = await lancer('git', ['--no-optional-locks', 'status', '--porcelain', '-z'], {
    cwd: depot,
    delai: 2000
  })
  if (r.code !== 0) return null
  return { depot, statut: lireStatutGit(r.stdout) }
}

// Tous les fichiers d'une racine (chemins relatifs) : ceux que git connaît et
// n'ignore pas dans un dépôt, sinon un parcours sans les dossiers lourds.
export async function tousLesFichiers(racine: string): Promise<string[]> {
  const r = await lancer('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: racine,
    delai: 10_000
  })
  if (r.code === 0) {
    const masque = (p: string): boolean => p.split('/').some((m) => MASQUES.has(m))
    return [...new Set(r.stdout.split('\0').filter((p) => p && !masque(p)))].slice(
      0,
      LIMITE_FICHIERS
    )
  }
  const trouves: string[] = []
  const parcourir = async (ici: string, relatif: string): Promise<void> => {
    if (trouves.length >= LIMITE_FICHIERS) return
    let liste
    try {
      liste = await readdir(ici, { withFileTypes: true })
    } catch {
      return
    }
    for (const d of liste) {
      if (trouves.length >= LIMITE_FICHIERS) return
      if (MASQUES.has(d.name)) continue
      const rel = relatif ? `${relatif}/${d.name}` : d.name
      if (d.isDirectory()) {
        if (!DOSSIERS_IGNORES.includes(d.name)) await parcourir(join(ici, d.name), rel)
      } else if (d.isFile()) trouves.push(rel)
    }
  }
  await parcourir(racine, '')
  return trouves.sort()
}

// Surveille une racine (récursif) ; les changements arrivent groupés toutes les 150 ms.
export function surveiller(racine: string, changement: (chemins: string[]) => void): () => void {
  let w: FSWatcher
  const lot = new Set<string>()
  let minuteur: NodeJS.Timeout | null = null
  try {
    w = watch(racine, { recursive: true }, (_type, nom) => {
      if (!nom) return
      lot.add(join(racine, nom.toString()))
      minuteur ??= setTimeout(() => {
        minuteur = null
        const chemins = [...lot]
        lot.clear()
        changement(chemins)
      }, 150)
    })
    w.on('error', () => {})
  } catch {
    return () => {}
  }
  return () => {
    if (minuteur) clearTimeout(minuteur)
    w.close()
  }
}

// Les noms des sources déjà pris dans la cible (une source déjà dans la cible ne compte pas).
export async function nomsPris(sources: string[], cible: string): Promise<string[]> {
  return sources
    .filter((s) => dirname(s) !== cible && existsSync(join(cible, basename(s))))
    .map((s) => basename(s))
}

const estDossier = (chemin: string): Promise<boolean> =>
  stat(chemin).then(
    (s) => s.isDirectory(),
    () => false
  )

async function deplacer(source: string, dest: string): Promise<void> {
  try {
    await rename(source, dest)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EXDEV') throw e
    await cp(source, dest, { recursive: true, errorOnExist: true, force: false })
    await rm(source, { recursive: true })
  }
}

// Déplace (ou copie) des fichiers et dossiers dans `cible`. Un nom pris sans
// choix (`conflit` null) est refusé sans rien toucher ; « remplacer » met
// d'abord l'ancien à la corbeille ; « garder » prend un nom libre.
export async function transferer(o: {
  sources: string[]
  cible: string
  copier: boolean
  conflit: 'remplacer' | 'garder' | null
  corbeille: (chemin: string) => Promise<void>
}): Promise<{ faits: [string, string][]; erreurs: string[] }> {
  const faits: [string, string][] = []
  const erreurs: string[] = []
  for (const source of o.sources) {
    if (!peutDeposer(source, o.cible)) {
      erreurs.push(DANS_LUI_MEME)
      continue
    }
    if (dirname(source) === o.cible) continue
    const nom = basename(source)
    let dest = join(o.cible, nom)
    try {
      if (existsSync(dest)) {
        if (o.conflit === null) {
          erreurs.push(`« ${nom} » existe déjà dans « ${basename(o.cible)} ».`)
          continue
        }
        if (o.conflit === 'remplacer') await o.corbeille(dest)
        else
          dest = join(
            o.cible,
            nomDeCopie(nom, await estDossier(source), new Set(await readdir(o.cible)))
          )
      }
      if (o.copier) await cp(source, dest, { recursive: true, errorOnExist: true, force: false })
      else await deplacer(source, dest)
      faits.push([source, dest])
    } catch (e) {
      erreurs.push(`${nom} : ${message(e)}`)
    }
  }
  return { faits, erreurs }
}

export async function creer(
  chemin: string,
  dossier: boolean
): Promise<{ ok: true } | { erreur: string }> {
  if (existsSync(chemin)) return { erreur: NOM_PRIS }
  try {
    if (dossier) await mkdir(chemin)
    else await writeFile(chemin, '', { flag: 'wx' })
    return { ok: true }
  } catch (e) {
    return { erreur: `Création impossible : ${message(e)}` }
  }
}

export async function renommer(
  ancien: string,
  nouveau: string
): Promise<{ ok: true } | { erreur: string }> {
  if (ancien === nouveau) return { ok: true }
  // Changer seulement la casse : le disque de macOS voit le même nom.
  const casse = ancien.toLowerCase() === nouveau.toLowerCase()
  if (!casse && existsSync(nouveau)) return { erreur: NOM_PRIS }
  try {
    await rename(ancien, nouveau)
    return { ok: true }
  } catch (e) {
    return { erreur: `Renommage impossible : ${message(e)}` }
  }
}

// Coller (copie) : un nom libre comme le Finder, jamais d'écrasement.
export async function coller(
  sources: string[],
  cible: string
): Promise<{ faits: [string, string][]; erreurs: string[] }> {
  const faits: [string, string][] = []
  const erreurs: string[] = []
  for (const source of sources) {
    if (!peutDeposer(source, cible)) {
      erreurs.push('Impossible de coller un dossier dans lui-même.')
      continue
    }
    try {
      const nom = nomDeCopie(
        basename(source),
        await estDossier(source),
        new Set(await readdir(cible))
      )
      const dest = join(cible, nom)
      await cp(source, dest, { recursive: true, errorOnExist: true, force: false })
      faits.push([source, dest])
    } catch (e) {
      erreurs.push(`${basename(source)} : ${message(e)}`)
    }
  }
  return { faits, erreurs }
}

export async function fichiersSeuls(chemins: string[]): Promise<string[]> {
  const r: string[] = []
  for (const c of chemins)
    if (
      await stat(c).then(
        (s) => s.isFile(),
        () => false
      )
    )
      r.push(c)
  return r
}

const TYPES_IMAGE: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.svg': 'image/svg+xml'
}

export async function lireImage(
  chemin: string
): Promise<{ url: string; poids: number } | { erreur: string }> {
  try {
    const s = await stat(chemin)
    if (!s.isFile()) return { erreur: "Ce n'est pas un fichier." }
    if (s.size > POIDS_IMAGE_MAX) return { erreur: 'Image trop lourde (plus de 50 Mo).' }
    const type = TYPES_IMAGE[extname(chemin).toLowerCase()] ?? 'application/octet-stream'
    const octets = await readFile(chemin)
    return { url: `data:${type};base64,${octets.toString('base64')}`, poids: s.size }
  } catch (e) {
    return { erreur: message(e) }
  }
}
