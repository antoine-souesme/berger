// Règle pure : les replis d'un fichier Markdown par titres, comme VS Code.
// Un titre `#`…`######` se replie jusqu'au titre suivant de même niveau ou
// plus haut, lignes vides de la fin exclues. Les `#` des blocs de code ne
// comptent pas. Lignes numérotées à partir de 1, comme dans Monaco.

export type Repli = { debut: number; fin: number }

const TITRE = /^ {0,3}(#{1,6})(?:[ \t]|$)/
const CLOTURE = /^ {0,3}(`{3,}|~{3,})/

export function replisMarkdown(lignes: string[]): Repli[] {
  const titres: { ligne: number; niveau: number }[] = []
  let cloture: string | null = null
  lignes.forEach((texte, i) => {
    const c = CLOTURE.exec(texte)
    if (c) {
      if (cloture === null) cloture = c[1]
      else if (c[1][0] === cloture[0] && c[1].length >= cloture.length) cloture = null
      return
    }
    if (cloture !== null) return
    const t = TITRE.exec(texte)
    if (t) titres.push({ ligne: i + 1, niveau: t[1].length })
  })
  const replis: Repli[] = []
  titres.forEach((t, k) => {
    const suivant = titres.slice(k + 1).find((s) => s.niveau <= t.niveau)
    let fin = suivant ? suivant.ligne - 1 : lignes.length
    while (fin > t.ligne && lignes[fin - 1].trim() === '') fin--
    if (fin > t.ligne) replis.push({ debut: t.ligne, fin })
  })
  return replis
}
