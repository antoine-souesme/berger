import { expect, test } from 'vitest'
import { decodeurDeTrames, encoderTrame, TYPE } from '../src/shared/trames'

test('une trame encodée puis décodée revient identique', () => {
  const trame = { canal: 1, type: TYPE.DATA, donnees: new TextEncoder().encode('été') }
  const decode = decodeurDeTrames()
  expect(decode(encoderTrame(trame))).toEqual([trame])
})

test('deux trames collées et une trame coupée en deux se décodent', () => {
  const a = encoderTrame({ canal: 1, type: TYPE.DATA, donnees: Uint8Array.of(104, 105) })
  const b = encoderTrame({ canal: 1, type: TYPE.CLOSE, donnees: new Uint8Array() })
  const tout = new Uint8Array([...a, ...b])
  const decode = decodeurDeTrames()
  expect(decode(tout.slice(0, 5))).toEqual([])
  const trames = decode(tout.slice(5))
  expect(trames.map((t) => t.type)).toEqual([TYPE.DATA, TYPE.CLOSE])
  expect([...trames[0].donnees]).toEqual([104, 105])
})

test('un CREDIT de 764 octets est encodé comme hc attach', () => {
  const octets = encoderTrame({
    canal: 1,
    type: TYPE.CREDIT,
    donnees: Uint8Array.of(0xfc, 0x02, 0, 0)
  })
  expect([...octets]).toEqual([1, 0, 0, 0, 1, 4, 0, 0, 0, 0xfc, 0x02, 0, 0])
})

test('RESIZE 120×40 est encodé comme hc attach', () => {
  expect([
    ...encoderTrame({ canal: 1, type: TYPE.RESIZE, donnees: Uint8Array.of(120, 0, 40, 0) })
  ]).toEqual([1, 0, 0, 0, 3, 4, 0, 0, 0, 120, 0, 40, 0])
})
