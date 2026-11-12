// Les agents finis qu'Antoine a regardés : comme dans Herdr, un agent fini
// (« done ») perd son point vert une fois son terminal vu, jusqu'à ce qu'il
// finisse de nouveau.
import type { TerminalCore } from './spaces'

// La clé d'un agent fini : son adresse et le moment où il a fini ; null sinon.
export function cleVu(t: TerminalCore): string | null {
  return t.state === 'live' && t.status?.state === 'done'
    ? `${t.address}@${t.status_ms ?? 0}`
    : null
}

// Les clés retenues encore valables, plus celles des terminaux regardés.
export function vusAJour(vus: string[], terminaux: TerminalCore[], regardes: string[]): string[] {
  const actuelles = new Map(terminaux.map((t) => [t.address, cleVu(t)]))
  const valables = new Set([...actuelles.values()].filter((c): c is string => c !== null))
  const r = vus.filter((c) => valables.has(c))
  for (const a of regardes) {
    const c = actuelles.get(a)
    if (c && !r.includes(c)) r.push(c)
  }
  return r
}
