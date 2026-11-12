import { Hc } from './hc'

export type EtatConnexion = 'connecte' | 'deconnecte'

// Garde deux connexions à herdr-core (requêtes, événements) et se rebranche
// toute seule quand l'une d'elles tombe.
export class Coeur {
  requetes: Hc | null = null
  evenements: Hc | null = null
  private auChangement: ((etat: EtatConnexion) => void)[] = []
  private aLaConnexion: ((coeur: Coeur) => Promise<void>)[] = []
  private relance: NodeJS.Timeout | null = null

  surEtat(f: (etat: EtatConnexion) => void): void {
    this.auChangement.push(f)
  }

  // Appelé à chaque (re)connexion, une fois les deux connexions ouvertes.
  surConnexion(f: (coeur: Coeur) => Promise<void>): void {
    this.aLaConnexion.push(f)
  }

  async demarrer(): Promise<void> {
    try {
      this.requetes = await Hc.ouvrir()
      this.evenements = await Hc.ouvrir()
      for (const hc of [this.requetes, this.evenements]) hc.surFin(() => this.tomber())
      for (const f of this.aLaConnexion) await f(this)
      this.annoncer('connecte')
    } catch (e) {
      console.error('[berger] cannot connect to herdr-core:', (e as Error).message)
      this.tomber()
    }
  }

  private tomber(): void {
    if (this.relance) return
    this.requetes?.fermer()
    this.evenements?.fermer()
    this.requetes = this.evenements = null
    this.annoncer('deconnecte')
    this.relance = setTimeout(() => {
      this.relance = null
      void this.demarrer()
    }, 2000)
  }

  private annoncer(etat: EtatConnexion): void {
    for (const f of this.auChangement) f(etat)
  }
}
