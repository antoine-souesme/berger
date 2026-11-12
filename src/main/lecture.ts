export type Lecture = { texte: string } | { erreur: string }
type Requete = (methode: string, params: object) => Promise<unknown>

// Lit un fichier par le core. Un fichier lu en partie (plus de 8 Mo) est
// refusé : l'enregistrer écraserait la fin.
export async function lireFichier(requete: Requete, chemin: string): Promise<Lecture> {
  try {
    const r = (await requete('file.read', { path: chemin })) as {
      text: string
      last: number
      lines: number
    }
    if (r.last < r.lines)
      return { erreur: 'Ce fichier est trop gros pour être ouvert (plus de 8 Mo).' }
    return { texte: r.text }
  } catch (e) {
    const kind = (e as { kind?: string }).kind
    if (kind === 'not_text') return { erreur: "Ce fichier n'est pas du texte." }
    if (kind === 'not_found') return { erreur: "Ce fichier n'existe plus." }
    return { erreur: `Lecture impossible : ${(e as Error).message}` }
  }
}
