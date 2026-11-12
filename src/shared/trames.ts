// Mode tramé de herdr-core : voir docs/notes/trames-herdr-core.md.

export const TYPE = {
  DATA: 0,
  CREDIT: 1,
  CLOSE: 2,
  RESIZE: 3,
  FOCUS: 4,
  AUTOMATIC_INPUT: 6
} as const

export type Trame = { canal: number; type: number; donnees: Uint8Array }

const ENTETE = 9

export function encoderTrame({ canal, type, donnees }: Trame): Uint8Array {
  const octets = new Uint8Array(ENTETE + donnees.length)
  const vue = new DataView(octets.buffer)
  vue.setUint32(0, canal, true)
  vue.setUint8(4, type)
  vue.setUint32(5, donnees.length, true)
  octets.set(donnees, ENTETE)
  return octets
}

export function decodeurDeTrames(): (morceau: Uint8Array) => Trame[] {
  let reste = new Uint8Array()
  return (morceau) => {
    const tout = new Uint8Array(reste.length + morceau.length)
    tout.set(reste)
    tout.set(morceau, reste.length)
    const vue = new DataView(tout.buffer)
    const trames: Trame[] = []
    let i = 0
    while (i + ENTETE <= tout.length) {
      const longueur = vue.getUint32(i + 5, true)
      if (i + ENTETE + longueur > tout.length) break
      trames.push({
        canal: vue.getUint32(i, true),
        type: vue.getUint8(i + 4),
        donnees: tout.slice(i + ENTETE, i + ENTETE + longueur)
      })
      i += ENTETE + longueur
    }
    reste = tout.slice(i)
    return trames
  }
}

export function u32(n: number): Uint8Array {
  const o = new Uint8Array(4)
  new DataView(o.buffer).setUint32(0, n, true)
  return o
}

export function taille(cols: number, rows: number): Uint8Array {
  const o = new Uint8Array(4)
  const v = new DataView(o.buffer)
  v.setUint16(0, cols, true)
  v.setUint16(2, rows, true)
  return o
}
