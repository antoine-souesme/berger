// Compare l'interface de herdr-core gardée dans le dépôt (docs/notes/hc-schema.json,
// la dernière version vérifiée) avec celle du `hc` installé (`hc schema`).
// Marque d'un « ★ » ce que le code de Berger (src/) cite.
// Usage : node scripts/diff-schema-hc.mjs [ancien.json] [nouveau.json]
import { execFileSync } from 'child_process'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const racine = new URL('..', import.meta.url).pathname
const ancien = JSON.parse(readFileSync(process.argv[2] ?? join(racine, 'docs/notes/hc-schema.json'), 'utf8'))
const nouveau = process.argv[3]
  ? JSON.parse(readFileSync(process.argv[3], 'utf8'))
  : JSON.parse(execFileSync('hc', ['schema'], { encoding: 'utf8' }))

// Tout le code de Berger, pour savoir ce qu'il cite.
const code = []
const lire = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (n === 'public' || n === 'node_modules') continue
    if (statSync(p).isDirectory()) lire(p)
    else if (/\.(ts|mjs|js)$/.test(n)) code.push(readFileSync(p, 'utf8'))
  }
}
lire(join(racine, 'src'))
const tout = code.join('\n')
const cite = (mot) => (tout.includes(`'${mot}'`) || tout.includes(`"${mot}"`) || new RegExp(`\\b${mot.replace('.', '\\.')}\\b`).test(tout) ? ' ★' : '')

const lignes = []
const dire = (s) => lignes.push(s)
const parNom = (l) => new Map((l ?? []).map((x) => [x.name, x]))
const type = (s) => JSON.stringify(s?.type ?? s?.$ref ?? s?.enum ?? s?.oneOf ?? s?.anyOf ?? '')
const genres = (m) => new Set((m.errors ?? []).map((e) => e.data?.kind ?? e.message))

dire(`herdr-core ${ancien.info.version} → ${nouveau.info.version}`)
const ma = parNom(ancien.methods)
const mn = parNom(nouveau.methods)
for (const [nom] of ma) if (!mn.has(nom)) dire(`- méthode retirée : ${nom}${cite(nom)}`)
for (const [nom] of mn) if (!ma.has(nom)) dire(`+ méthode ajoutée : ${nom}`)
for (const [nom, a] of ma) {
  const n = mn.get(nom)
  if (!n) continue
  const pa = parNom(a.params)
  const pn = parNom(n.params)
  const c = cite(nom)
  for (const [p, x] of pa) {
    const y = pn.get(p)
    if (!y) dire(`- ${nom}${c} : paramètre retiré « ${p} »`)
    else {
      if (!x.required && y.required) dire(`! ${nom}${c} : « ${p} » devient obligatoire`)
      if (type(x.schema) !== type(y.schema))
        dire(`! ${nom}${c} : « ${p} » change de type ${type(x.schema)} → ${type(y.schema)}`)
    }
  }
  for (const [p, y] of pn)
    if (!pa.has(p)) dire(`${y.required ? '!' : '+'} ${nom}${c} : paramètre ajouté « ${p} »${y.required ? ' (obligatoire)' : ''}`)
  if (type(a.result?.schema) !== type(n.result?.schema))
    dire(`! ${nom}${c} : résultat ${type(a.result?.schema)} → ${type(n.result?.schema)}`)
  const ea = genres(a)
  for (const g of genres(n)) if (!ea.has(g)) dire(`+ ${nom}${c} : nouvelle erreur « ${g} »`)
  if (a.description !== n.description) dire(`~ ${nom}${c} : description changée`)
}

// Les formes des données (résultats, événements, terminaux…).
const sa = ancien.components?.schemas ?? {}
const sn = nouveau.components?.schemas ?? {}
for (const nom of Object.keys(sa)) if (!sn[nom]) dire(`- forme retirée : ${nom}${cite(nom)}`)
for (const nom of Object.keys(sn)) if (!sa[nom]) dire(`+ forme ajoutée : ${nom}`)
for (const [nom, a] of Object.entries(sa)) {
  const n = sn[nom]
  if (!n) continue
  const xa = a.properties ?? {}
  const xn = n.properties ?? {}
  const ra = new Set(a.required ?? [])
  const rn = new Set(n.required ?? [])
  for (const p of Object.keys(xa)) {
    if (!xn[p]) dire(`- ${nom} : champ retiré « ${p} »${cite(p)}`)
    else if (type(xa[p]) !== type(xn[p])) dire(`! ${nom} : « ${p} »${cite(p)} change de type ${type(xa[p])} → ${type(xn[p])}`)
    else if (JSON.stringify(xa[p].enum) !== JSON.stringify(xn[p].enum))
      dire(`! ${nom} : valeurs de « ${p} »${cite(p)} ${JSON.stringify(xa[p].enum)} → ${JSON.stringify(xn[p].enum)}`)
    if (ra.has(p) && !rn.has(p)) dire(`! ${nom} : « ${p} »${cite(p)} peut maintenant manquer`)
  }
  for (const p of Object.keys(xn)) if (!xa[p]) dire(`+ ${nom} : champ ajouté « ${p} »`)
  if (JSON.stringify(a.enum) !== JSON.stringify(n.enum))
    dire(`! ${nom}${cite(nom)} : valeurs ${JSON.stringify(a.enum)} → ${JSON.stringify(n.enum)}`)
  if (JSON.stringify(a.oneOf ?? a.anyOf) !== JSON.stringify(n.oneOf ?? n.anyOf))
    dire(`! ${nom}${cite(nom)} : variantes changées`)
}

if (lignes.length === 1) dire('Aucun changement d’interface.')
console.log(lignes.join('\n'))
