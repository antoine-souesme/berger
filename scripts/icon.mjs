#!/usr/bin/env node
// L'icône de Berger, tirée du logo (build/icone.svg ; build/icone-petite.svg pour
// 16 et 32 px) : build/icon.icns, build/icon.png et resources/icon.png (512 px).
// Outils : rsvg-convert (Homebrew) et iconutil (macOS). Usage : npm run icon
import { execFileSync } from 'child_process'
import { copyFileSync, mkdirSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const GRANDE = join(RACINE, 'build/icone.svg')
const PETITE = join(RACINE, 'build/icone-petite.svg')
const jeu = join(mkdtempSync(join(tmpdir(), 'berger-icone-')), 'Berger.iconset')
mkdirSync(jeu)

const dessiner = (svg, taille, sortie) =>
  execFileSync('rsvg-convert', ['-w', String(taille), '-h', String(taille), svg, '-o', sortie])

for (const taille of [16, 32, 128, 256, 512]) {
  const source = (px) => (px <= 32 ? PETITE : GRANDE)
  dessiner(source(taille), taille, join(jeu, `icon_${taille}x${taille}.png`))
  dessiner(source(taille * 2), taille * 2, join(jeu, `icon_${taille}x${taille}@2x.png`))
}
execFileSync('iconutil', ['-c', 'icns', jeu, '-o', join(RACINE, 'build/icon.icns')])
dessiner(GRANDE, 512, join(RACINE, 'build/icon.png'))
copyFileSync(join(RACINE, 'build/icon.png'), join(RACINE, 'resources/icon.png'))
console.log('Icon written: build/icon.icns, build/icon.png, resources/icon.png')
