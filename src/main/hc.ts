import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { decoupeurDeLignes } from '../shared/lignes'

// Chemin de `hc` : une app lancée depuis le Finder n'a pas le PATH du shell.
const HC_LOCAL = join(homedir(), '.local/bin/hc')
export const cheminHc = (): string =>
  process.env['BERGER_HC'] ?? (existsSync(HC_LOCAL) ? HC_LOCAL : 'hc')

export class ErreurHc extends Error {
  constructor(
    message: string,
    public kind: string
  ) {
    super(message)
  }
}

type EnAttente = { ok: (v: unknown) => void; ko: (e: Error) => void }

// Une connexion `hc connect` en mode simple : JSON-RPC, un message par ligne.
export class Hc {
  private prochainId = 1
  private enAttente = new Map<number, EnAttente>()
  private auxNotifications: ((methode: string, params: any) => void)[] = []
  private aLaFin: (() => void)[] = []
  private fini = false
  infos: { core: { name: string } } | null = null

  private constructor(private processus: ChildProcessWithoutNullStreams) {
    const decoupe = decoupeurDeLignes()
    processus.stdout.setEncoding('utf8')
    processus.stdout.on('data', (morceau: string) => {
      for (const ligne of decoupe(morceau)) this.recevoir(ligne)
    })
    processus.stderr.on('data', (d) => console.error('[hc]', String(d).trim()))
    processus.on('error', () => this.terminer())
    processus.stdin.on('error', () => this.terminer())
    processus.on('exit', () => this.terminer())
  }

  static async ouvrir(): Promise<Hc> {
    const hc = new Hc(spawn(cheminHc(), ['connect'], { stdio: 'pipe' }))
    hc.infos = await hc.requete('hello', { generation: 1 })
    return hc
  }

  requete<T>(methode: string, params: object = {}): Promise<T> {
    if (this.fini) return Promise.reject(new ErreurHc('connexion fermée', 'closed'))
    const id = this.prochainId++
    return new Promise<T>((ok, ko) => {
      this.enAttente.set(id, { ok: ok as (v: unknown) => void, ko })
      this.processus.stdin.write(
        JSON.stringify({ jsonrpc: '2.0', id, method: methode, params }) + '\n'
      )
    })
  }

  surNotification(f: (methode: string, params: any) => void): void {
    this.auxNotifications.push(f)
  }

  surFin(f: () => void): void {
    this.aLaFin.push(f)
  }

  fermer(): void {
    this.processus.kill()
  }

  private recevoir(ligne: string): void {
    let message: any
    try {
      message = JSON.parse(ligne)
    } catch {
      console.error('[hc] ligne illisible', ligne.slice(0, 200))
      return
    }
    if (message.id != null && this.enAttente.has(message.id)) {
      const { ok, ko } = this.enAttente.get(message.id)!
      this.enAttente.delete(message.id)
      if (message.error)
        ko(new ErreurHc(message.error.message, message.error.data?.kind ?? 'inconnu'))
      else ok(message.result)
    } else if (message.method) {
      for (const f of this.auxNotifications) f(message.method, message.params)
    }
  }

  private terminer(): void {
    if (this.fini) return
    this.fini = true
    for (const { ko } of this.enAttente.values()) ko(new ErreurHc('connexion fermée', 'closed'))
    this.enAttente.clear()
    for (const f of this.aLaFin) f()
  }
}
