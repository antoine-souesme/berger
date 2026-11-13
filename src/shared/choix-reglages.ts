// Les choix proposés dans les réglages : les polices installées sur le Mac
// pour l'interface, les sons de macOS ou un fichier pour les alertes.
// Une option est [libellé, valeur écrite dans reglages.json].

export const POLICE_SYSTEME = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"

// La valeur CSS d'une famille : elle d'abord, la police du système ensuite.
export const valeurPolice = (famille: string): string =>
  `'${famille.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', -apple-system, sans-serif`

// La première famille d'une valeur CSS (`'IBM Plex Sans', …` → `IBM Plex Sans`).
export function premiereFamille(valeur: string): string {
  const t = valeur.split(',')[0].trim()
  return t.replace(/^(['"])(.*)\1$/, '$2').replace(/\\(.)/g, '$1')
}

// Les polices fournies avec Berger (licence libre, dans public/licences) :
// [libellé, famille CSS]. Geist est celle de l'interface de Herdr.
export const POLICES_FOURNIES: [string, string][] = [['Geist', 'Geist Variable']]

// « Système », les polices fournies, puis les familles installées, triées et sans doublon (celles
// cachées par macOS, qui commencent par un point, sont écartées). L'option de
// la police actuelle garde sa valeur exacte ; une valeur écrite à la main
// qu'aucune famille ne reconnaît reste en bas de la liste.
export function optionsPolices(familles: string[], actuelle: string): [string, string][] {
  const noms = [...new Set(familles.map((f) => f.trim()))]
    .filter((f) => f && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  const choisie = premiereFamille(actuelle)
  const options: [string, string][] = [['San Francisco (système)', POLICE_SYSTEME]]
  for (const [libelle, f] of POLICES_FOURNIES)
    options.push([libelle, f === choisie ? actuelle : valeurPolice(f)])
  const fournies = new Set(POLICES_FOURNIES.map(([, f]) => f))
  for (const f of noms.filter((n) => !fournies.has(n)))
    options.push([f, f === choisie ? actuelle : valeurPolice(f)])
  if (!options.some(([, v]) => v === actuelle)) options.push([actuelle, actuelle])
  return options
}

export const nomDuSon = (chemin: string): string =>
  chemin.slice(chemin.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')

// Le son de macOS par défaut (valeur ''), les autres sons de macOS, puis le
// fichier choisi s'il n'en fait pas partie.
export function optionsSons(
  sonsMacos: string[],
  parDefaut: string,
  actuel: string | null
): [string, string][] {
  const options: [string, string][] = [[`${nomDuSon(parDefaut)} (par défaut)`, '']]
  for (const s of [...sonsMacos].sort((a, b) => nomDuSon(a).localeCompare(nomDuSon(b))))
    if (s !== parDefaut) options.push([nomDuSon(s), s])
  if (actuel && !options.some(([, v]) => v === actuel))
    options.push([`Fichier : ${nomDuSon(actuel)}`, actuel])
  return options
}
