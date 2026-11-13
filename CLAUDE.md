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
- Avant de dire qu'une chose marche, lance l'application et regarde-la.

## Lancer

- `npm install`, puis `npm run dev` (fenêtre Berger), `npm test` (règles pures), `npm run typecheck`.
- `npm run install-app` construit `Berger.app` et l'installe dans `/Applications` (il fait quitter
  la version installée qui tourne, la remplace et la relance) ; `npm run icon` refait l'icône à
  partir de `build/icone.svg` et `build/icone-petite.svg`.
- Dossier de données : `~/Library/Application Support/Berger/` pour la version installée,
  `~/Library/Application Support/Berger-dev/` pour `npm run dev` (jamais l'un dans l'autre).
  Réglages : fenêtre des réglages (`⌘,`) ou `reglages.json` de ce dossier (que Berger écrit et
  suit à chaud) ; thèmes personnels au format de Herdr dans `themes/` ; cadre de la fenêtre dans
  `fenetre.json`.
- Coloration de l'éditeur : `node scripts/copy-grammars.mjs` recopie de VS Code
  (`/Applications/Visual Studio Code.app`) les grammaires, le registre des langages, le thème
  Monokai et les thèmes Dark Modern et Light Modern dans `src/renderer/public/vscode/`. Les thèmes
  fournis par Berger sont dans `src/shared/themes/`.
- Vérifier sans cliquer (développement) : `BERGER_CAPTURE=<fichier.png>` enregistre une image de
  la fenêtre ; `BERGER_OUVRIR=<terminal>` et `BERGER_TAPER=<texte>` ouvrent un terminal et y
  tapent ; `BERGER_SCENARIO=editeur|conflit|supprime` avec `BERGER_SCENARIO_DOSSIER` joue
  l'éditeur ; `BERGER_SCENARIO=cadre` avec `BERGER_SCENARIO_SPACE=<spbergertest…>` joue les
  onglets et découpages dans ce space de test (`BERGER_SCENARIO_LARGEUR=<px>` tire aussi un
  séparateur), `BERGER_SCENARIO=ranger` le ferme (`BERGER_SCENARIO_REPONSE=0` accepte la
  question) ; `BERGER_SCENARIO=workspaces` crée, renomme, déplace puis supprime un workspace de
  test (et le space qu'il y crée), `BERGER_SCENARIO=raccourcis` journalise ⌃1, ⌥⌘], ⌘] et le tri
  des agents ; `BERGER_SCENARIO=depot` avec `BERGER_SCENARIO_TERMINAL=<terminal>` (étiqueté
  `spbergertest…`, affiché) y dépose deux chemins ; `BERGER_SCENARIO=fichiers` avec
  `BERGER_SCENARIO_DOSSIER=<dossier berger-essai…>`
  joue l'explorateur, ⌘P, les onglets de fichiers et la visionneuse (`explorateur` et `onglets` en
  plus court) ; `BERGER_SCENARIO=langage` avec `BERGER_SCENARIO_DOSSIER=<dossier berger-essai…>`
  joue l'aide du langage (F12, erreurs, survol, complétion, schémas JSON et YAML, fichier
  réécrit par un agent, renommage, ⌥Z ; contenu du dossier décrit en tête du scénario) ; `BERGER_SCENARIO=reglages` avec
  `BERGER_SCENARIO_DOSSIER=<dossier berger-essai…>` (contenant `src/a.ts`) et
  `BERGER_SCENARIO_SPACE=<spbergertest…>` joue les réglages (fichier écrit à la main, mal formé,
  chaque thème de l'application et de l'éditeur, raccourci modifié dans la fenêtre puis à la main ;
  refuse un dossier de données autre que `Berger-dev`, remet `reglages.json` à la fin) ; `BERGER_SCENARIO=reprise` (étapes 1 puis 2, avec un space de
  test et un dossier `berger-essai…`) vérifie ce qui revient au relancement ; voir
  `src/main/scenario.ts`. L'état des fichiers par workspace est dans
  `fichiers.json`, à côté de `workspaces.json`. Les workspaces de Berger sont dans
  `workspaces.json` du dossier de données : en garder une copie avant un essai. `BERGER_TRACE=1` journalise les changements d'état, les lancements, arrêts et relances des serveurs de langage,
  les écritures du document, les terminaux lancés et fermés, les `RESIZE` et le premier plan.
- Space de test : `hc run --bg --keep --no-parent --label herdr.space=spbergertest<hex>
--label herdr.tab=tbbergertest<hex> -- zsh` (Herdr l'adopte). Jamais les spaces d'Antoine.
- Le format des échanges avec un terminal du core : `docs/notes/trames-herdr-core.md`.
- Mises à jour de herdr-core : Berger les annonce (Réglages → Mises à jour) ; `BERGER_VERSION_CORE=<x.y.z>`
  lui fait croire qu'il a cette version (« Mettre à jour » est alors simulé), `BERGER_REGLAGES=<rubrique>`
  ouvre les réglages sur une rubrique. Après une montée de version : skill `maj-herdr-core`
  (compare `hc schema` avec `docs/notes/hc-schema.json` par `node scripts/diff-schema-hc.mjs`).
