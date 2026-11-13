---
name: maj-herdr-core
description: Vérifie ce qu'une nouvelle version de herdr-core peut casser dans Berger et propose les corrections. À utiliser quand Antoine dit qu'il a mis à jour herdr-core (ou va le faire), quand Berger annonce une mise à jour du core, ou quand quelque chose ne marche plus après une mise à jour de hc.
---

# Montée de version de herdr-core

Berger parle à herdr-core de trois façons ; une nouvelle version peut casser
chacune. Le but : trouver ce qui a changé, ce que Berger en utilise, le prouver
dans l'application lancée, et proposer les corrections à Antoine.

## Ce dont Berger dépend

- Le protocole JSON-RPC de `hc connect`, génération 1 (`src/main/hc.ts`,
  `src/main/coeur.ts`) : `hello`, `doc.get`, `doc.set` (documents `herdr-app`
  et `berger`), `events.subscribe` (notifications `event`), `terminal.run`,
  `terminal.kill`, `terminal.label`, `terminal.attach`, `file.read`,
  `file.write`. La liste à jour : `grep -rhoE "'(terminal|doc|events|server|machine|templates|file)\.[a-z_]+'" src | sort -u`.
- Les trames binaires de `terminal.attach` en mode `framed` (`src/main/terminal.ts`,
  `src/shared/trames.ts`), décrites dans `docs/notes/trames-herdr-core.md`.
  Elles ne sont pas dans `hc schema` : lis les notes de version et `hc --skill`.
- Les étiquettes `herdr.space` et `herdr.tab` des terminaux, et la forme du
  document `herdr-app` (spaces, onglets, disposition) partagée avec l'app Herdr.
- La ligne de commande : `hc connect`, `hc --version`, `hc schema`, `hc update`
  (`src/main/maj-core.ts`), `hc get` (`src/main/scenario.ts`).

## Étapes

1. **Versions.** `hc --version` (installée), `info.version` de
   `docs/notes/hc-schema.json` (la dernière vérifiée), et
   `curl -s https://releases.herdr.dev/core/latest.json` (publiée). Si la
   version installée est encore l'ancienne, dis à Antoine de mettre à jour
   (Réglages → Mises à jour) et ne fais que l'étape 2 en attendant.
2. **Notes de version.** Pour chaque version entre l'ancienne et la nouvelle :
   `curl -s https://releases.herdr.dev/core/<x.y.z>/manifest.json`, champ
   `notes`. Relève tout ce qui touche au protocole, aux trames, aux
   étiquettes, aux documents, à `attach`, aux événements, au redémarrage.
3. **Interface.** `node scripts/diff-schema-hc.mjs` compare la copie du dépôt
   avec `hc schema`. `★` = cité par le code de Berger ; `!` et `-` sont les
   lignes à risque. Pour chacune, ouvre le code de Berger qui l'utilise et
   dis si le changement le casse.
4. **Manuel.** `hc --skill` : cherche ce qui contredit
   `docs/notes/trames-herdr-core.md` ou la section « Ce dont Berger dépend ».
5. **Preuve.** `npm test`, `npm run typecheck`, puis l'application lancée
   (`npm run dev`) avec un space de test (voir `CLAUDE.md`, jamais les spaces
   d'Antoine) : `BERGER_SCENARIO=cadre`, `BERGER_OUVRIR`/`BERGER_TAPER` sur un
   terminal de test, et `BERGER_TRACE=1` pour voir la connexion, les
   attachements et les `RESIZE`. Ferme les terminaux de test à la fin.
6. **Rapport à Antoine**, court et sans jargon : la version, ce qui casse (ou
   « rien »), et pour chaque problème la correction proposée. Ne corrige rien
   avant son oui.
7. **Après son oui** : branche depuis `develop`, corrections avec un test qui
   échoue d'abord quand c'est une règle pure, vérification dans
   l'application lancée, puis mets à jour la copie
   (`hc schema > docs/notes/hc-schema.json`) et, si besoin,
   `docs/notes/trames-herdr-core.md`. Même sans correction, mets la copie à
   jour une fois la vérification finie, pour que la prochaine comparaison
   parte de la bonne version.

## Ce qui ne se fait pas

- Ne lance jamais `hc update`, `hc server restart` ou `hc server stop` toi-même :
  les terminaux d'Antoine tournent sur ce core.
- Ne télécharge ni ne lance un binaire de herdr-core à part.
