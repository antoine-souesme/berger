// Découpe un flux de texte en lignes complètes (un message JSON par ligne).
export function decoupeurDeLignes(): (morceau: string) => string[] {
  let reste = ''
  return (morceau) => {
    reste += morceau
    const morceaux = reste.split('\n')
    reste = morceaux.pop() ?? ''
    return morceaux.filter((ligne) => ligne.trim() !== '')
  }
}
