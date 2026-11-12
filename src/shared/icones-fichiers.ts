// L'icône Material Icon Theme (MIT, voir src/renderer/public/material/LICENSE)
// d'un fichier ou d'un dossier. Reprise de `icons.js` du mod `antoine`
//, la table `material.ts` intégrée.
import material from './material'

export function iconeFichier(nom: string, dossier: boolean, ouvert = false): string {
  if (dossier) {
    const noms = ouvert ? material.folderNamesExpanded : material.folderNames
    return (
      noms[nom] ?? noms[nom.toLowerCase()] ?? (ouvert ? material.folderExpanded : material.folder)
    )
  }
  const nomme = material.fileNames[nom] ?? material.fileNames[nom.toLowerCase()]
  if (nomme) return nomme
  // « index.d.ts » : « d.ts » avant « ts ».
  const morceaux = nom.toLowerCase().split('.')
  for (let i = 1; i < morceaux.length; i++) {
    const ext = material.fileExtensions[morceaux.slice(i).join('.')]
    if (ext) return ext
  }
  return material.file
}
