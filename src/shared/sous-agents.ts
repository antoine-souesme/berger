// Sous-agents que Claude Code lance en lui-même (sans terminal) : ses hooks
// les posent en étiquettes `antoine.sub.<id>` = {"type","at"} sur le terminal
// de l'agent. Repris de `subs.js` du mod `antoine-agents` (voir docs/COPIES.md).

// Au-delà, le hook n'a jamais vu la fin (agent tué en route) : on ne l'affiche plus.
export const AGE_MAX = 12 * 3600000

export type SousAgentHook = { id: string; type: string; depuis: number } // depuis : `at` (0 : inconnu)

// Les sous-agents d'un terminal d'après ses étiquettes, du plus ancien au plus récent.
export function sousAgentsHooks(
  etiquettes: Record<string, string> | undefined,
  maintenant: number | null
): SousAgentHook[] {
  const r: SousAgentHook[] = []
  for (const [cle, valeur] of Object.entries(etiquettes ?? {})) {
    const m = /^antoine\.sub\.(.+)$/.exec(cle)
    if (!m || !valeur) continue
    let d: unknown
    try {
      d = JSON.parse(valeur)
    } catch {
      continue
    }
    if (!d || typeof d !== 'object') continue
    const { type, at } = d as { type?: unknown; at?: unknown }
    const h = {
      id: m[1],
      type: typeof type === 'string' ? type : '',
      depuis: typeof at === 'number' && Number.isFinite(at) ? at : 0
    }
    if (maintenant !== null && h.depuis && maintenant - h.depuis >= AGE_MAX) continue
    r.push(h)
  }
  return r.sort((a, b) => a.depuis - b.depuis || a.id.localeCompare(b.id))
}
