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

// La branche d'un dossier et le nombre de commits à pousser vers son amont
// (0 sans amont ou si git échoue).
export function etatGit(dossier: string): Promise<{ branche?: string; aPousser: number }> {
  if (!dossier) return Promise.resolve({ aPousser: 0 })
  const aPousser = new Promise<number>((ok) => {
    execFile(
      'git',
      ['-C', dossier, 'rev-list', '--count', '@{u}..HEAD'],
      { timeout: 2000 },
      (erreur, sortie) => {
        const n = Number(String(sortie ?? '').trim())
        ok(erreur || !Number.isFinite(n) ? 0 : n)
      }
    )
  })
  return Promise.all([brancheDe(dossier), aPousser]).then(([branche, n]) => ({
    branche,
    aPousser: n
  }))
}
