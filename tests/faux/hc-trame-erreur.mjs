#!/usr/bin/env node
// Faux `hc connect` tramé : répond une erreur au hello, puis attend.
process.stdin.once('data', () => {
  process.stdout.write(
    '{"jsonrpc":"2.0","id":0,"error":{"code":-32000,"message":"version refusée","data":{"kind":"generation"}}}\n'
  )
})
process.stdin.on('end', () => process.exit(0))
