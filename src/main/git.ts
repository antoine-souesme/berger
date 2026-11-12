import { execFile } from 'child_process'

// La branche git d'un dossier ; `undefined` si ce n'est pas un dépôt, si git
// ne répond pas en 2 s ou si le dossier est vide.
export function brancheDe(dossier: string): Promise<string | undefined> {
  if (!dossier) return Promise.resolve(undefined)
  return new Promise((ok) => {
    execFile(
      'git',
      ['-C', dossier, 'branch', '--show-current'],
      { timeout: 2000 },
      (erreur, sortie) => {
        const branche = String(sortie ?? '').trim()
        ok(erreur || !branche ? undefined : branche)
      }
    )
  })
}
