// Les serveurs de langage (TypeScript et YAML), lancés par la partie Node
// d'Electron dans des processus à part : la frappe n'attend jamais un serveur.
// Point d'entrée unique de l'aide du langage, pour que la phase 6 puisse le
// faire passer par herdr-core.
import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import { ipcMain, type BrowserWindow } from 'electron'
import {
  CancellationTokenSource,
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  type MessageConnection
} from 'vscode-jsonrpc/node'
import type { InitializeResult, ServerCapabilities } from 'vscode-languageserver-protocol'
import { racineProjet, serveurDe, tsserverDe, type Serveur } from '../../shared/langage'
import { envoyerA } from '../envoi'

export type Lancement = { commande: string; args: string[]; env?: NodeJS.ProcessEnv }

type Options = {
  notifier: (cle: string, methode: string, params: unknown) => void
  redemarre: (cle: string) => void
  arrete: (serveur: Serveur) => void
  lancer?: (serveur: Serveur, racine: string) => Lancement
}

type Processus = {
  cle: string
  serveur: Serveur
  enfant: ChildProcess
  connexion: MessageConnection
  pret: Promise<ServerCapabilities>
  fini: boolean
}

const NOMS: Record<Serveur, string> = { typescript: 'TypeScript', yaml: 'YAML' }
export const messageArret = (s: Serveur): string => `Le service ${NOMS[s]} s'est arrêté.`

// Au plus 3 arrêts en 5 minutes pour un même serveur, puis on abandonne.
const ARRETS_MAX = 3
const FENETRE_ARRETS = 5 * 60_000

const REGLAGES_YAML = {
  yaml: {
    validate: true,
    completion: true,
    hover: true,
    schemaStore: { enable: true, url: 'https://www.schemastore.org/api/json/catalog.json' }
  }
}

const trace = (texte: string): void => {
  if (process.env['BERGER_TRACE']) console.log(`[berger] ${texte}`)
}

const requireIci = createRequire(import.meta.url)

function lancementParDefaut(serveur: Serveur): Lancement {
  const cli =
    serveur === 'typescript'
      ? requireIci.resolve('typescript-language-server/lib/cli.mjs')
      : requireIci.resolve('yaml-language-server/bin/yaml-language-server')
  return {
    commande: process.execPath,
    args: [cli, '--stdio'],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  }
}

const CAPACITES_CLIENT = {
  workspace: { configuration: true, applyEdit: false, workspaceFolders: true },
  textDocument: {
    synchronization: { didSave: false, dynamicRegistration: false },
    completion: {
      completionItem: {
        snippetSupport: true,
        documentationFormat: ['markdown', 'plaintext'],
        insertReplaceSupport: false,
        resolveSupport: { properties: ['documentation', 'detail', 'additionalTextEdits'] }
      },
      contextSupport: true
    },
    hover: { contentFormat: ['markdown', 'plaintext'] },
    definition: { linkSupport: true },
    references: {},
    rename: { prepareSupport: false },
    codeAction: {
      codeActionLiteralSupport: {
        codeActionKind: {
          valueSet: ['', 'quickfix', 'refactor', 'source', 'source.organizeImports']
        }
      }
    },
    semanticTokens: {
      requests: { full: true },
      tokenTypes: [],
      tokenModifiers: [],
      formats: ['relative'],
      multilineTokenSupport: false,
      overlappingTokenSupport: false
    },
    publishDiagnostics: { relatedInformation: true }
  }
}

// La valeur d'un réglage demandé par `workspace/configuration` (section « a.b »).
function section(reglages: unknown, nom: string | undefined): unknown {
  if (!nom) return reglages
  let v: unknown = reglages
  for (const k of nom.split('.')) {
    if (!v || typeof v !== 'object') return null
    v = (v as Record<string, unknown>)[k]
  }
  return v ?? null
}

export class ServeursLangage {
  private procs = new Map<string, Processus>()
  private arrets = new Map<Serveur, number[]>()
  private abandonnes = new Set<Serveur>()
  private deja = new Set<string>() // clés déjà lancées une fois (relance = redémarrage)
  private arretGeneral = false

  constructor(private o: Options) {}

  cleDe(fichier: string): string | null {
    const serveur = serveurDe(fichier)
    if (!serveur) return null
    return `${serveur}:${racineProjet(fichier, existsSync)}`
  }

  private lancer(serveur: Serveur, racine: string, cle: string): Processus {
    const l = (this.o.lancer ?? lancementParDefaut)(serveur, racine)
    const enfant = spawn(l.commande, l.args, {
      cwd: existsSync(racine) ? racine : undefined,
      env: l.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    trace(`langage : lancement de ${cle}`)
    enfant.stdin!.on('error', () => {})
    enfant.stderr!.on('data', (d: Buffer) => trace(`langage ${cle} : ${d.toString().trim()}`))
    const connexion = createMessageConnection(
      new StreamMessageReader(enfant.stdout!),
      new StreamMessageWriter(enfant.stdin!)
    )
    const p: Processus = {
      cle,
      serveur,
      enfant,
      connexion,
      pret: Promise.resolve({}),
      fini: false
    }
    connexion.onNotification((methode, params) => this.o.notifier(cle, methode, params))
    connexion.onRequest((methode, params) => {
      switch (methode) {
        case 'workspace/configuration': {
          const items = (params as { items?: { section?: string }[] }).items ?? []
          return items.map((i) => (serveur === 'yaml' ? section(REGLAGES_YAML, i.section) : null))
        }
        case 'workspace/applyEdit':
          return { applied: false }
        case 'workspace/workspaceFolders':
          return [{ uri: pathToFileURL(racine).href, name: racine }]
        default:
          // client/registerCapability, window/workDoneProgress/create…
          return null
      }
    })
    connexion.onError(() => {})
    connexion.listen()
    const mort = new Promise<never>((_, rejeter) => {
      const fin = (): void => {
        rejeter(new Error(messageArret(serveur)))
        this.mort(p)
      }
      enfant.on('exit', fin)
      enfant.on('error', fin)
    })
    mort.catch(() => {})
    const init = (async () => {
      const r = (await connexion.sendRequest('initialize', {
        processId: process.pid,
        clientInfo: { name: 'Berger' },
        locale: 'fr',
        rootUri: pathToFileURL(racine).href,
        workspaceFolders: [{ uri: pathToFileURL(racine).href, name: racine }],
        capabilities: CAPACITES_CLIENT,
        initializationOptions:
          serveur === 'typescript'
            ? {
                // Sans le serveur « syntaxe seule » : ses réponses de début de
                // chargement (F12 vers l'import) ne sont pas celles de VS Code.
                tsserver: {
                  useSyntaxServer: 'never',
                  path: tsserverDe(
                    racine,
                    existsSync,
                    requireIci.resolve('typescript/lib/tsserver.js')
                  )
                },
                preferences: { includeCompletionsForModuleExports: true }
              }
            : undefined
      })) as InitializeResult
      await connexion.sendNotification('initialized', {})
      if (serveur === 'yaml')
        await connexion.sendNotification('workspace/didChangeConfiguration', {
          settings: REGLAGES_YAML
        })
      return r.capabilities
    })()
    p.pret = Promise.race([init, mort])
    p.pret.catch(() => {})
    return p
  }

  private mort(p: Processus): void {
    if (p.fini) return
    p.fini = true
    p.connexion.dispose()
    if (this.procs.get(p.cle) === p) this.procs.delete(p.cle)
    if (this.arretGeneral) return
    const maintenant = Date.now()
    const liste = (this.arrets.get(p.serveur) ?? []).filter((t) => maintenant - t < FENETRE_ARRETS)
    liste.push(maintenant)
    this.arrets.set(p.serveur, liste)
    trace(`langage : arrêt de ${p.cle} (${liste.length} en 5 min)`)
    if (liste.length >= ARRETS_MAX && !this.abandonnes.has(p.serveur)) {
      this.abandonnes.add(p.serveur)
      trace(`langage : ${p.serveur} abandonné`)
      this.o.arrete(p.serveur)
    }
  }

  // Le processus d'un fichier, lancé à la première demande (null : pas de serveur).
  private processus(fichier: string): Processus | Serveur | null {
    const serveur = serveurDe(fichier)
    if (!serveur) return null
    if (this.abandonnes.has(serveur) || this.arretGeneral) return serveur
    const racine = racineProjet(fichier, existsSync)
    const cle = `${serveur}:${racine}`
    const existant = this.procs.get(cle)
    if (existant) return existant
    const p = this.lancer(serveur, racine, cle)
    this.procs.set(cle, p)
    if (this.deja.has(cle)) {
      trace(`langage : relance de ${cle}`)
      p.pret.then(() => this.o.redemarre(cle)).catch(() => {})
    }
    this.deja.add(cle)
    return p
  }

  async requete(
    fichier: string,
    methode: string,
    params: unknown,
    delai = methode === 'textDocument/completion' ? 5000 : 10_000
  ): Promise<{ resultat?: unknown; erreur?: string }> {
    const p = this.processus(fichier)
    if (!p) return { erreur: 'Aucun service pour ce fichier.' }
    if (typeof p === 'string') return { erreur: messageArret(p) }
    const annulation = new CancellationTokenSource()
    let minuteur: NodeJS.Timeout | undefined
    const delaiDepasse = new Promise<{ erreur: string }>((fin) => {
      minuteur = setTimeout(() => {
        annulation.cancel()
        fin({ erreur: 'Délai dépassé.' })
      }, delai)
    })
    const travail = (async () => {
      try {
        await p.pret
        const resultat = await p.connexion.sendRequest(methode, params, annulation.token)
        return { resultat }
      } catch (e) {
        return { erreur: (e as Error).message || 'Erreur du service.' }
      }
    })()
    try {
      return await Promise.race([travail, delaiDepasse])
    } finally {
      clearTimeout(minuteur)
    }
  }

  // Seule l'ouverture d'un fichier lance un serveur ; le reste va au serveur déjà lancé.
  notifier(fichier: string, methode: string, params: unknown): void {
    const cle = this.cleDe(fichier)
    if (!cle) return
    const p = methode === 'textDocument/didOpen' ? this.processus(fichier) : this.procs.get(cle)
    if (!p || typeof p === 'string') return
    p.pret.then(() => p.connexion.sendNotification(methode, params)).catch(() => {})
  }

  async capacites(fichier: string): Promise<ServerCapabilities | null> {
    const p = this.processus(fichier)
    if (!p || typeof p === 'string') return null
    try {
      return await p.pret
    } catch {
      return null
    }
  }

  arreter(): void {
    this.arretGeneral = true
    for (const p of this.procs.values()) {
      p.fini = true
      p.connexion.dispose()
      p.enfant.kill()
    }
    this.procs.clear()
  }
}

export function brancherLangage(fenetre: () => BrowserWindow | null): ServeursLangage {
  const s = new ServeursLangage({
    notifier: (cle, methode, params) =>
      envoyerA(fenetre(), 'berger:lsp-notif', { cle, methode, params }),
    redemarre: (cle) => envoyerA(fenetre(), 'berger:lsp-redemarre', { cle }),
    arrete: (serveur) => envoyerA(fenetre(), 'berger:lsp-arrete', { serveur })
  })
  ipcMain.handle('berger:lsp-requete', (_e, { fichier, methode, params }) =>
    s.requete(fichier, methode, params)
  )
  ipcMain.on('berger:lsp-notifier', (_e, { fichier, methode, params }) =>
    s.notifier(fichier, methode, params)
  )
  ipcMain.handle('berger:lsp-capacites', (_e, { fichier }) => s.capacites(fichier))
  ipcMain.handle('berger:lsp-cle', (_e, { fichier }) => s.cleDe(fichier))
  return s
}
