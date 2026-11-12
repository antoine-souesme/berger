#!/usr/bin/env node
// Faux serveur de langage : lit son entrée et ne répond jamais.
process.stdin.on('data', () => {})
setInterval(() => {}, 1 << 30)
