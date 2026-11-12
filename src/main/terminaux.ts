import { TerminalOuvert } from './terminal'

type Rappels = {
  sortie: (adresse: string, octets: Uint8Array) => void
  fin: (adresse: string, raison: string) => void
}

// Les terminaux attachés en même temps : une connexion tramée par terminal.
// Détacher ne tue jamais le programme.
export class Terminaux {
  private ouverts = new Map<string, TerminalOuvert>()

  constructor(private rappels: Rappels) {}

  attacher(adresse: string, cols: number, rows: number): void {
    if (this.ouverts.has(adresse)) return
    const t: TerminalOuvert = new TerminalOuvert(adresse, cols, rows, {
      sortie: (octets) => this.rappels.sortie(adresse, octets),
      fin: (raison) => {
        if (this.ouverts.get(adresse) === t) this.ouverts.delete(adresse)
        this.rappels.fin(adresse, raison)
      }
    })
    this.ouverts.set(adresse, t)
  }

  detacher(adresse: string): void {
    const t = this.ouverts.get(adresse)
    if (!t) return
    this.ouverts.delete(adresse)
    t.detacher()
  }

  detacherTout(): void {
    for (const adresse of [...this.ouverts.keys()]) this.detacher(adresse)
  }

  ecrire(adresse: string, octets: Uint8Array): void {
    this.ouverts.get(adresse)?.ecrire(octets)
  }

  redimensionner(adresse: string, cols: number, rows: number): void {
    this.ouverts.get(adresse)?.redimensionner(cols, rows)
  }

  focus(actif: boolean): void {
    for (const t of this.ouverts.values()) t.focus(actif)
  }

  adresses(): string[] {
    return [...this.ouverts.keys()]
  }
}
