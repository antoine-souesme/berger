# Berger

Berger est le multiplexeur d'agents d'Antoine : une application Electron
branchée sur herdr-core, avec l'éditeur de VS Code (Monaco). Il remplace l'app
Herdr, dont Antoine garde la façon de ranger les choses mais dont l'éditeur de
fichiers ne lui suffit pas. Lis d'abord `docs/suivi/ROADMAP.md` (les phases et
leur état), puis la spec de la phase sur laquelle tu travailles
(`docs/superpowers/specs/`) et les maquettes qu'elle cite (`docs/maquettes/`,
avec leur `README.md`).

## Où trouver quoi

- herdr-core : `hc --help`, `hc --skill` (le manuel), `hc schema` (l'interface
  en JSON Schema), `hc connect` (l'interface sur l'entrée et la sortie standard).
  Ne casse jamais les terminaux d'Antoine : il les utilise en même temps dans
  l'app Herdr. Pour tester, lance tes propres terminaux et ferme-les ensuite.
- Le manuel de l'app Herdr : `~/.config/herdr-app/AGENTS.md` (spaces, onglets,
  disposition, comportement à imiter).
- Le mod `antoine` à reprendre : `~/.config/herdr-app/mods/antoine/`, décrit
  dans `~/dev/playground/herdr-app-mod/CLAUDE.md` et
  `~/dev/playground/herdr-app-mod/.claude/skills/sync/COPIES.md`. Ses règles
  pures et leurs tests (`~/dev/playground/herdr-app-mod/tests/`) peuvent être
  repris. Ne modifie rien dans ces deux dossiers depuis Berger.

## Règles

- Avance phase par phase, dans l'ordre de `docs/suivi/ROADMAP.md` : rien d'une
  phase tant que la précédente ne marche pas, vue dans l'application lancée.
  Ne construis que ce que dit la spec de la phase ; ce qu'elle met hors
  périmètre attend sa propre phase.
- Les maquettes font foi pour l'apparence ; la spec fait foi pour le
  comportement. Si les deux se contredisent, demande à Antoine.
- Pas de panneau « Outils » ni de partie Git façon lazygit : lazygit tourne
  dans un terminal ordinaire.
- Garde les règles dans des modules purs, testés à part de l'interface.
- Textes de l'interface en français, avec les accents.
- Code repris d'ailleurs (Herdr, mod `antoine`, projets libres) : note sa
  source et sa licence dans `docs/COPIES.md`.
- Avant de dire qu'une chose marche, lance l'application et regarde-la.

## Lancer

- `npm install`, puis `npm run dev` (fenêtre Berger), `npm test` (règles pures), `npm run typecheck`.
- Vérifier sans cliquer (développement) : `BERGER_CAPTURE=<fichier.png>` enregistre une image de
  la fenêtre ; `BERGER_OUVRIR=<terminal>` et `BERGER_TAPER=<texte>` ouvrent un terminal et y
  tapent ; `BERGER_SCENARIO=editeur|conflit|supprime` avec `BERGER_SCENARIO_DOSSIER` joue
  l'éditeur ; `BERGER_SCENARIO=cadre` avec `BERGER_SCENARIO_SPACE=<spbergertest…>` joue les
  onglets et découpages dans ce space de test (`BERGER_SCENARIO_LARGEUR=<px>` tire aussi un
  séparateur), `BERGER_SCENARIO=ranger` le ferme (`BERGER_SCENARIO_REPONSE=0` accepte la
  question) ; `BERGER_SCENARIO=workspaces` crée, renomme, déplace puis supprime un workspace de
  test (et le space qu'il y crée), `BERGER_SCENARIO=raccourcis` journalise ⌃1, ⌥⌘], ⌘] et le tri
  des agents ; `BERGER_SCENARIO=fichiers` avec `BERGER_SCENARIO_DOSSIER=<dossier berger-essai…>`
  joue l'explorateur, ⌘P, les onglets de fichiers et la visionneuse (`explorateur` et `onglets` en
  plus court) ; voir `src/main/scenario.ts`. L'état des fichiers par workspace est dans
  `fichiers.json`, à côté de `workspaces.json`. Les workspaces de Berger sont dans
  `~/Library/Application Support/berger/workspaces.json` : en garder une copie avant un essai. `BERGER_TRACE=1` journalise les changements d'état,
  les écritures du document, les terminaux lancés et fermés, les `RESIZE` et le premier plan.
- Space de test : `hc run --bg --keep --no-parent --label herdr.space=spbergertest<hex>
--label herdr.tab=tbbergertest<hex> -- zsh` (Herdr l'adopte). Jamais les spaces d'Antoine.
- Le format des échanges avec un terminal du core : `docs/notes/trames-herdr-core.md`.
