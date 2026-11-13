// Les vidéos de la visionneuse passent par l'adresse `berger-media:` : le
// fichier est lu par morceaux (le lecteur demande ceux dont il a besoin pour
// avancer ou reculer), jamais chargé en entier en mémoire.
import { ipcMain, protocol } from 'electron'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'
import {
  SCHEMA_MEDIA,
  TYPES_VIDEO,
  cheminDeUrlMedia,
  estVideo,
  plageDemandee,
  urlMedia
} from '../shared/media'

// Avant que l'application soit prête.
export function declarerSchemaMedia(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEMA_MEDIA, privileges: { stream: true, supportFetchAPI: true, secure: true } }
  ])
}

export function brancherMedia(): void {
  protocol.handle(SCHEMA_MEDIA, async (requete) => {
    const chemin = cheminDeUrlMedia(requete.url)
    if (!chemin || !estVideo(chemin)) return new Response(null, { status: 404 })
    let taille: number
    try {
      const s = await stat(chemin)
      if (!s.isFile()) return new Response(null, { status: 404 })
      taille = s.size
    } catch {
      return new Response(null, { status: 404 })
    }
    const type = TYPES_VIDEO[chemin.slice(chemin.lastIndexOf('.') + 1).toLowerCase()]
    const plage = plageDemandee(requete.headers.get('range'), taille)
    if (!plage)
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${taille}` } })
    const flux = createReadStream(chemin, { start: plage.debut, end: plage.fin })
    const entetes: Record<string, string> = {
      'Content-Type': type,
      'Content-Length': String(plage.fin - plage.debut + 1),
      'Accept-Ranges': 'bytes'
    }
    if (plage.partiel) entetes['Content-Range'] = `bytes ${plage.debut}-${plage.fin}/${taille}`
    return new Response(Readable.toWeb(flux) as ReadableStream, {
      status: plage.partiel ? 206 : 200,
      headers: entetes
    })
  })
  ipcMain.handle('berger:video', async (_e, { chemin }: { chemin: string }) => {
    try {
      const s = await stat(chemin)
      if (!s.isFile()) return { erreur: "Ce n'est pas un fichier." }
      return { url: urlMedia(chemin), poids: s.size }
    } catch (e) {
      return { erreur: e instanceof Error ? e.message : String(e) }
    }
  })
}
