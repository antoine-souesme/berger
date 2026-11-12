# Berger

Berger est le multiplexeur d'agents d'Antoine : une application Electron
branchée sur herdr-core, avec l'éditeur de VS Code (Monaco). Lis d'abord
`VISION.md` : le but, ce qu'il faut reprendre, et la phase 0 en cours.

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

- Avance phase par phase : rien de la phase suivante tant que la phase 0
  (preuve de concept) ne marche pas.
- Garde les règles dans des modules purs, testés à part de l'interface.
- Textes de l'interface en français, avec les accents.
- Code repris d'ailleurs (Herdr, mod `antoine`, projets libres) : note sa
  source et sa licence dans `COPIES.md`.
- Avant de dire qu'une chose marche, lance l'application et regarde-la.
