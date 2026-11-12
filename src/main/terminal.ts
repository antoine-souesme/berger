import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { cheminHc } from './hc'
import { decodeurDeTrames, encoderTrame, taille, TYPE, u32, type Trame } from '../shared/trames'

// Le message d'erreur de la réponse au hello, s'il y en a une.
function erreurDuHello(ligne: string): string | null {
  try {
    const m = JSON.parse(ligne)
    if (m.error) return m.error.message ?? m.error.data?.kind ?? 'hello refusé'
    return null
  } catch {
    return 'réponse illisible au hello'
  }
}

type Rappels = { sortie: (octets: Uint8Array) => void; fin: (raison: string) => void }

// Un terminal du core ouvert dans Berger : une connexion `hc connect` tramée
// à lui seul, comme le fait `hc attach`. Détacher ne tue jamais le programme.
export class TerminalOuvert {
  private processus: ChildProcessWithoutNullStreams
  private canal: number | null = null
  private fini = false

  constructor(
    adresse: string,
    cols: number,
    rows: number,
    private rappels: Rappels
  ) {
    this.processus = spawn(cheminHc(), ['connect'], { stdio: 'pipe' })
    this.processus.on('error', () => this.terminer('connexion impossible'))
    this.processus.stdin.on('error', () => this.terminer('connexion fermée'))
    this.processus.on('exit', () => this.terminer('connexion fermée'))
    this.processus.stderr.on('data', (d) => console.error('[hc attach]', String(d).trim()))

    const decode = decodeurDeTrames()
    let entree: Buffer | null = Buffer.alloc(0) // avant la réponse au hello (ligne simple)
    this.processus.stdout.on('data', (morceau: Buffer) => {
      if (entree) {
        entree = Buffer.concat([entree, morceau])
        const fin = entree.indexOf(0x0a)
        if (fin < 0) return
        const reste = entree.subarray(fin + 1)
        const reponse = entree.subarray(0, fin).toString('utf8')
        entree = null
        const erreur = erreurDuHello(reponse)
        if (erreur) {
          this.terminer(erreur)
          return
        }
        this.envoyerRequete(1, 'terminal.attach', { terminal: adresse, cols, rows })
        morceau = reste
      }
      for (const trame of decode(new Uint8Array(morceau))) this.recevoir(trame)
    })
    this.processus.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'hello',
        params: { generation: 1, framed: true }
      }) + '\n'
    )
  }

  ecrire(octets: Uint8Array): void {
    this.envoyer(TYPE.DATA, octets)
  }

  redimensionner(cols: number, rows: number): void {
    this.envoyer(TYPE.RESIZE, taille(cols, rows))
  }

  focus(actif: boolean): void {
    this.envoyer(TYPE.FOCUS, Uint8Array.of(actif ? 1 : 0))
  }

  detacher(): void {
    this.envoyer(TYPE.CLOSE, new Uint8Array())
    this.fini = true
    setTimeout(() => this.processus.kill(), 200)
  }

  private envoyer(type: number, donnees: Uint8Array): void {
    if (this.canal === null || this.fini) return
    this.processus.stdin.write(encoderTrame({ canal: this.canal, type, donnees }))
  }

  private envoyerRequete(id: number, method: string, params: object): void {
    const json = new TextEncoder().encode(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
    this.processus.stdin.write(encoderTrame({ canal: 0, type: TYPE.DATA, donnees: json }))
  }

  private recevoir(trame: Trame): void {
    if (trame.canal === 0) {
      const message = JSON.parse(new TextDecoder().decode(trame.donnees))
      if (message.id === 1) {
        if (message.error) this.terminer(message.error.data?.kind ?? message.error.message)
        else this.canal = message.result.channel
      }
      return
    }
    if (trame.canal !== this.canal || this.fini) return
    if (trame.type === TYPE.DATA) {
      this.rappels.sortie(trame.donnees)
      this.processus.stdin.write(
        encoderTrame({ canal: trame.canal, type: TYPE.CREDIT, donnees: u32(trame.donnees.length) })
      )
    } else if (trame.type === TYPE.CLOSE) {
      this.terminer('fin du flux')
    }
  }

  private terminer(raison: string): void {
    if (this.fini) return
    this.fini = true
    this.rappels.fin(raison)
    this.processus.kill()
  }
}
