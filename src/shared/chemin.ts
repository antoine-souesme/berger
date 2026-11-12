// Le PATH du shell de connexion : une application lancée du Dock n'a que le
// PATH minimal de macOS. On demande le sien au shell, entouré d'une marque
// (le shell peut écrire autre chose au démarrage).
export const MARQUE = '__BERGER_PATH__'

export function extrairePath(sortie: string): string | null {
  const debut = sortie.indexOf(MARQUE)
  if (debut < 0) return null
  const fin = sortie.indexOf(MARQUE, debut + MARQUE.length)
  if (fin < 0) return null
  return sortie.slice(debut + MARQUE.length, fin)
}

// Les dossiers du shell d'abord, sans doublon, puis ceux d'avant.
export function fusionnerPath(actuel: string, duShell: string): string {
  const vus = new Set<string>()
  const r: string[] = []
  for (const d of [...duShell.split(':'), ...actuel.split(':')])
    if (d && !vus.has(d)) {
      vus.add(d)
      r.push(d)
    }
  return r.join(':')
}
