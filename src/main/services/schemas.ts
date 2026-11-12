// Les schémas JSON (SchemaStore et `$schema` déclarés), téléchargés par la
// partie Node et gardés en cache dans le dossier de données de Berger.
import { app, ipcMain, net } from 'electron'
import { createHash } from 'crypto'
import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import { join } from 'path'

// Un schéma en cache depuis moins d'une semaine n'est pas retéléchargé.
const FRAICHEUR = 7 * 24 * 3600_000
const DELAI = 10_000

const fichierCache = (url: string): string =>
  join(app.getPath('userData'), 'schemas', createHash('sha1').update(url).digest('hex') + '.json')

async function lireCache(url: string): Promise<{ texte: string; age: number } | null> {
  try {
    const f = fichierCache(url)
    const [texte, s] = await Promise.all([readFile(f, 'utf8'), stat(f)])
    return { texte, age: Date.now() - s.mtimeMs }
  } catch {
    return null
  }
}

export async function schema(url: string): Promise<string | null> {
  if (!/^https?:\/\//.test(url)) return null
  const cache = await lireCache(url)
  if (cache && cache.age < FRAICHEUR) return cache.texte
  try {
    const r = await net.fetch(url, { signal: AbortSignal.timeout(DELAI) })
    if (!r.ok) throw new Error(String(r.status))
    const texte = await r.text()
    JSON.parse(texte)
    await mkdir(join(app.getPath('userData'), 'schemas'), { recursive: true })
    await writeFile(fichierCache(url), texte)
    return texte
  } catch {
    // Sans réseau : l'ancien schéma s'il y en a un, sinon rien (la syntaxe reste vérifiée).
    return cache?.texte ?? null
  }
}

export function brancherSchemas(): void {
  ipcMain.handle('berger:schema', (_e, { url }: { url: string }) => schema(url))
}
