// Règles pures des libellés : nom et icône d'un programme, dossier affiché,
// nom d'un onglet, état et couleur d'un agent.
import type { TerminalCore } from './spaces'

export type Icone = 'bot' | 'git-branch' | 'terminal' | 'square-terminal' | 'puzzle'
export type EtatAgent = 'travail' | 'attente' | 'fini' | null

type Programme = { nom: string; icone: Icone }

const CONNUS: Record<string, Programme> = {
  claude: { nom: 'Claude Code', icone: 'bot' },
  'claude-code': { nom: 'Claude Code', icone: 'bot' },
  codex: { nom: 'Codex', icone: 'bot' },
  lazygit: { nom: 'lazygit', icone: 'git-branch' }
}
const SHELLS = ['zsh', 'bash', 'fish', 'sh']

const nomDeBase = (chemin: string | undefined): string =>
  (chemin ?? '').split('/').pop()!.replace(/^-/, '')

// Jamais le `title` du terminal (`utilisateur@machine:chemin`).
export function programme(t: {
  argv?: string[]
  foreground?: { name?: string; argv?: string[] } | null
  status?: { app?: string } | null
}): Programme {
  const app = t.status?.app
  if (app && CONNUS[app]) return CONNUS[app]
  const nom =
    nomDeBase(t.foreground?.argv?.[0]) ||
    nomDeBase(t.foreground?.name) ||
    nomDeBase(t.argv?.[0]) ||
    'terminal'
  if (CONNUS[nom]) return CONNUS[nom]
  if (SHELLS.includes(nom)) return { nom, icone: 'terminal' }
  return { nom, icone: 'square-terminal' }
}

export function dossierAffiche(chemin: string, maison: string): string {
  if (!maison) return chemin
  if (chemin === maison) return '~'
  if (chemin.startsWith(maison + '/')) return '~' + chemin.slice(maison.length)
  return chemin
}

export function nomOnglet(nom: string | undefined, place: number): string {
  return nom?.trim() ? nom : String(place + 1)
}

// L'état montré d'un agent, comme dans Herdr : au repos (« idle ») rien, fini
// rien non plus une fois regardé (`vu`).
export function etatAgent(t: TerminalCore, vu = false): EtatAgent {
  if (t.state !== 'live') return null
  switch (t.status?.state) {
    case 'working':
      return 'travail'
    case 'blocked':
      return 'attente'
    case 'done':
      return vu ? null : 'fini'
    default:
      return null
  }
}

export const COULEUR_ETAT: Record<'travail' | 'attente' | 'fini', string> = {
  travail: '#e6db74',
  attente: '#f92672',
  fini: '#a6e22e'
}

// L'état le plus pressant d'une liste : t'attend, puis au travail, puis fini.
export function plusPressant(etats: EtatAgent[]): EtatAgent {
  for (const e of ['attente', 'travail', 'fini'] as const) if (etats.includes(e)) return e
  return null
}

// Le titre d'un agent : celui qu'il donne dans son état, sinon le titre du
// terminal sans ses signes de tête (`✳ Tests` → `Tests`). Jamais un chemin,
// `utilisateur@machine` ni le nom du programme.
export function titreAgent(t: TerminalCore): string {
  const duStatut = t.status?.title?.trim()
  if (duStatut) return duStatut
  const brut = t.title ?? ''
  const chemin = /^[~/]/.test(brut.replace(/^[^\p{L}\p{N}~/]+/u, ''))
  const titre = brut.replace(/^[^\p{L}\p{N}]+/u, '').trim()
  if (!titre || chemin || titre.includes('@')) return ''
  const prog = programme(t).nom
  return titre === prog || titre.toLowerCase() === prog.toLowerCase() ? '' : titre
}
