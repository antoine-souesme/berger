import type { TerminalCore } from './spaces'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- `data` change de forme selon le type d'événement
export type EvenementCore = { type: string; terminal?: string; data: any; seq?: number }

// Tient à jour la table des terminaux à partir des événements de
// `events.subscribe` (created, removed, finished, status, title, ...).
export function appliquerEvenement(table: Map<string, TerminalCore>, e: EvenementCore): void {
  if (!e.terminal) return
  if (e.type === 'created') {
    table.set(e.terminal, e.data as TerminalCore)
    return
  }
  if (e.type === 'removed') {
    table.delete(e.terminal)
    return
  }
  const t = table.get(e.terminal)
  if (!t) return
  switch (e.type) {
    case 'foreground':
      t.foreground = e.data
      break
    case 'status':
      t.status = e.data && 'status' in e.data ? e.data.status : e.data
      break
    case 'finished':
      Object.assign(t, e.data, { state: 'finished', status: null })
      break
    case 'turn':
      // `data.state` est l'état du statut qui vient de quitter `working`, pas
      // celui du terminal : le recopier rendait le terminal « mort ».
      if (typeof e.data?.turn === 'number') t.turn = e.data.turn
      break
    case 'labels':
      t.labels = { ...t.labels, ...e.data.labels }
      break
    default:
      if (e.data && typeof e.data === 'object') Object.assign(t, e.data)
  }
}

// Faut-il appliquer cet événement ? Non s'il est déjà couvert par le dernier
// instantané (après `missed`, le core demande d'ignorer les seq inférieurs).
export function evenementNeuf(dernier: number | null, seq: number | undefined): boolean {
  if (dernier === null || seq === undefined) return true
  return seq > dernier
}
