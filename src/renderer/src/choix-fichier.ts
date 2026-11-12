import { filtrerFichiers } from '../../shared/fichiers'

const AFFICHES = 200
let dossier = ''
let fichiers: string[] = []
let surChoix: (chemin: string) => void = () => {}

export function initChoixFichier(choisir: (chemin: string) => void): void {
  surChoix = choisir
  const champ = document.getElementById('filtre') as HTMLInputElement
  champ.addEventListener('input', dessiner)
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const premier = filtrerFichiers(fichiers, champ.value)[0]
      if (premier) choisirFichier(premier)
    } else if (e.key === 'Escape') {
      fermer()
    }
  })
}

function choisirFichier(relatif: string): void {
  fermer()
  surChoix(`${dossier}/${relatif}`)
}

function fermer(): void {
  document.getElementById('choix')!.hidden = true
}

export async function montrerFichiersDe(nouveauDossier: string): Promise<void> {
  dossier = nouveauDossier
  fichiers = (await window.berger.demander<{ fichiers: string[] }>('berger:lister', { dossier }))
    .fichiers
  const champ = document.getElementById('filtre') as HTMLInputElement
  champ.value = ''
  document.getElementById('choix')!.hidden = false
  dessiner()
  champ.focus()
}

function dessiner(): void {
  const champ = document.getElementById('filtre') as HTMLInputElement
  const liste = document.getElementById('liste-fichiers')!
  liste.replaceChildren(
    ...filtrerFichiers(fichiers, champ.value)
      .slice(0, AFFICHES)
      .map((relatif) => {
        const ligne = document.createElement('div')
        ligne.className = 'fichier'
        ligne.textContent = relatif
        ligne.onclick = () => choisirFichier(relatif)
        return ligne
      })
  )
}
