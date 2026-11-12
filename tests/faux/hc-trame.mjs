#!/usr/bin/env node
// Faux `hc connect` tramé : répond au hello, accepte terminal.attach (canal 1)
// puis envoie une trame DATA « x » toutes les 20 ms.
const trame = (canal, type, donnees) => {
  const b = Buffer.alloc(9 + donnees.length)
  b.writeUInt32LE(canal, 0)
  b.writeUInt8(type, 4)
  b.writeUInt32LE(donnees.length, 5)
  donnees.copy(b, 9)
  return b
}
let premier = true
process.stdin.on('data', (d) => {
  if (premier) {
    premier = false
    process.stdout.write('{"jsonrpc":"2.0","id":0,"result":{"framed":true}}\n')
    return
  }
  if (d.includes(Buffer.from('terminal.attach'))) {
    process.stdout.write(
      trame(0, 0, Buffer.from('{"jsonrpc":"2.0","id":1,"result":{"channel":1}}'))
    )
    setInterval(() => process.stdout.write(trame(1, 0, Buffer.from('x'))), 20)
  }
})
process.stdin.on('end', () => process.exit(0))
