import type { TerminalCore } from './spaces'

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
    case 'labels':
      t.labels = { ...t.labels, ...e.data.labels }
      break
    default:
      if (e.data && typeof e.data === 'object') Object.assign(t, e.data)
  }
}
