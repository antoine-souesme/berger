#!/usr/bin/env node
// Copie de VS Code (licence MIT) ce qu'il faut pour colorier comme lui :
// les grammaires TextMate de ses extensions livrées, le registre de ses
// langages (tiré de leurs package.json), le thème Monokai et la licence.
// Produit src/renderer/public/vscode/. Usage : node scripts/copier-grammaires.mjs
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const APP = '/Applications/Visual Studio Code.app/Contents/Resources/app'
const EXTENSIONS = join(APP, 'extensions')
const SORTIE = join(dirname(fileURLToPath(import.meta.url)), '..', 'src/renderer/public/vscode')
const GRAMMAIRES = join(SORTIE, 'grammaires')
const CONFIGURATIONS = join(SORTIE, 'configurations')

mkdirSync(GRAMMAIRES, { recursive: true })
mkdirSync(CONFIGURATIONS, { recursive: true })

// JSON avec commentaires et virgules finales (language-configuration.json).
function lireJsonc(texte) {
  let r = ''
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (c === '"') {
      let j = i + 1
      while (j < texte.length && texte[j] !== '"') j += texte[j] === '\\' ? 2 : 1
      r += texte.slice(i, j + 1)
      i = j
    } else if (c === '/' && texte[i + 1] === '/') {
      while (i < texte.length && texte[i] !== '\n') i++
      r += '\n'
    } else if (c === '/' && texte[i + 1] === '*') {
      i = texte.indexOf('*/', i + 2) + 1
    } else r += c
  }
  return JSON.parse(r.replace(/,(\s*[}\]])/g, '$1'))
}
const version = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8')).version

const langages = new Map()
const grammaires = []
const pris = new Set()
const parPortee = new Map()

for (const dossier of readdirSync(EXTENSIONS).sort()) {
  const pj = join(EXTENSIONS, dossier, 'package.json')
  if (!existsSync(pj)) continue
  const c = JSON.parse(readFileSync(pj, 'utf8')).contributes ?? {}
  for (const l of c.languages ?? []) {
    // Plusieurs extensions complètent un même langage : on fusionne.
    const d = langages.get(l.id) ?? {
      id: l.id,
      extensions: [],
      filenames: [],
      filenamePatterns: [],
      aliases: []
    }
    for (const k of ['extensions', 'filenames', 'filenamePatterns', 'aliases'])
      for (const v of l[k] ?? []) if (!d[k].includes(v)) d[k].push(v)
    if (l.configuration && !d.configuration) {
      const source = join(EXTENSIONS, dossier, l.configuration)
      if (existsSync(source)) {
        writeFileSync(
          join(CONFIGURATIONS, `${l.id}.json`),
          JSON.stringify(lireJsonc(readFileSync(source, 'utf8')))
        )
        d.configuration = `${l.id}.json`
      }
    }
    langages.set(l.id, d)
  }
  for (const g of c.grammars ?? []) {
    const source = join(EXTENSIONS, dossier, g.path)
    if (!existsSync(source)) continue
    // Une même portée déclarée par plusieurs langages : un seul fichier.
    let nom = parPortee.get(g.scopeName)
    if (!nom) {
      nom = basename(source)
      if (pris.has(nom)) nom = `${dossier}-${nom}`
      pris.add(nom)
      parPortee.set(g.scopeName, nom)
      copyFileSync(source, join(GRAMMAIRES, nom))
    }
    grammaires.push({
      ...(g.language ? { language: g.language } : {}),
      scopeName: g.scopeName,
      fichier: nom,
      ...(g.embeddedLanguages ? { embeddedLanguages: g.embeddedLanguages } : {}),
      ...(g.tokenTypes ? { tokenTypes: g.tokenTypes } : {}),
      ...(g.injectTo ? { injectTo: g.injectTo } : {})
    })
  }
}

const propre = (l) =>
  Object.fromEntries(Object.entries(l).filter(([, v]) => !Array.isArray(v) || v.length))
writeFileSync(
  join(SORTIE, 'langages.json'),
  JSON.stringify({ version, langages: [...langages.values()].map(propre), grammaires }, null, 1)
)
copyFileSync(
  join(EXTENSIONS, 'theme-monokai/themes/monokai-color-theme.json'),
  join(SORTIE, 'monokai-color-theme.json')
)
// L'application VS Code est livrée sous la licence produit de Microsoft
// (LICENSE.rtf) ; les extensions copiées ici viennent du dépôt libre
// microsoft/vscode, sous licence MIT : c'est elle qu'on reproduit. Les
// grammaires d'origine tierce sont décrites dans ThirdPartyNotices.txt.
writeFileSync(
  join(SORTIE, 'LICENSE.txt'),
  `MIT License

Copyright (c) 2015 - present Microsoft Corporation

All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
)
copyFileSync(join(APP, 'ThirdPartyNotices.txt'), join(SORTIE, 'ThirdPartyNotices.txt'))
console.log(`VS Code ${version} : ${langages.size} langages, ${grammaires.length} grammaires.`)
