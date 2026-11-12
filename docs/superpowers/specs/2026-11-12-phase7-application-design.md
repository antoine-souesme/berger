# Berger — phase 7, l'application installée et ses réglages

Date : 2026-11-12. Contexte : `docs/suivi/ROADMAP.md`,
`CLAUDE.md`. La phase 6 (autres machines) est remise à plus tard : cette
phase ne l'attend pas.

## Décisions d'Antoine (12 novembre 2026, à la rédaction du plan)

- Le bouton « Réglages » en bas de la colonne des spaces (maquette) est
  construit ; « Ajouter une machine » attend la phase 6.
- L'aperçu de code de la section « Apparence » (maquette) est construit : il
  montre le thème de l'éditeur choisi.
- La couleur de sélection réglée ne change que l'éditeur ; les terminaux
  gardent la sélection du thème de l'application (la maquette disait « et les
  terminaux »).
- Le thème de l'éditeur « antoine-monokai » garde la coloration actuelle, le
  Monokai de VS Code (phase 5), et non l'ancienne liste simplifiée de la
  phase 0 : son champ `editeur` renvoie au thème Monokai de VS Code copié dans
  Berger, avec le texte ordinaire en `#d0d0c8`. « Monokai » est ce même thème
  de VS Code tel quel (texte `#f8f8f2`).

## Intention

Antoine veut pouvoir se passer de l'app Herdr. Il faut pour ça que Berger soit
une vraie application qu'on lance comme les autres et qu'on règle à son goût
sans toucher au code. Ce qui manquera à l'usage, Antoine le notera et lancera
lui-même les corrections au fur et à mesure : ce n'est pas une étape de cette
phase.

## Maquettes

- `docs/maquettes/reglages.html` : la fenêtre des réglages, section
  « Apparence » (thème de l'application et thème de l'éditeur séparés) et
  section « Raccourcis ».
- `docs/logo-berger.svg` : le logo retenu (variante C de
  `docs/maquettes/logos.html`), base de l'icône de l'application.
- `docs/maquettes/README.md` : règles visuelles.

## Ce qu'Antoine doit pouvoir faire (objectifs)

1. **Lancer Berger comme une application** depuis le Dock, le Launchpad ou
   Spotlight, avec son icône, sans terminal ni `npm run dev`.
2. **Régler Berger** dans une fenêtre de réglages (`⌘,`) : thèmes, polices,
   couleur de sélection, raccourcis ; ou à la main dans le fichier de
   réglages.
3. **Retrouver Berger comme il l'a laissé** en le relançant.

## Le comportement attendu

**Application installée.** Une commande du dépôt (par exemple
`npm run installer`) construit `Berger.app` et l'installe dans
`/Applications`, en remplaçant la version précédente. L'icône vient du logo
(mouton, variante C, version « petite taille » sans pattes et laine pleine
pour les petites tailles). Pas de signature Apple, pas de mise à jour
automatique : Antoine relance la commande pour mettre à jour. Berger
installé trouve `hc` sans dépendre du `PATH` d'un terminal (une application
lancée du Dock n'a pas le `PATH` du shell). Les outils de développement
(`BERGER_CAPTURE`, `BERGER_SCENARIO`…) restent possibles mais ne gênent pas
l'usage normal.

**Thèmes : deux réglages séparés.**
- « Thème de l'application » : les couleurs de la fenêtre (colonnes, listes,
  onglets, menus, dialogues, barre d'état) et des terminaux.
- « Thème de l'éditeur » : les couleurs du code dans Monaco (et la vue des
  différences).
- On peut donc avoir, par exemple, la fenêtre en Atom One Dark et le code en
  antoine-monokai.
- Thèmes fournis, inspirés de ceux de Herdr, pour les deux réglages :
  **antoine-monokai** (par défaut, couleurs de
  `~/.config/herdr-app/themes/antoine-monokai.json` : fond `#272822`, texte
  `#d0d0c8`, sélection `#49483e`), **Monokai** (texte `#f8f8f2`), **Atom One
  Dark** (fond `#21252b`, texte `#abb2bf`), **Graphite**, **Ink**, **Moss**
  (sombres) et **Paper** (clair), comme les thèmes intégrés de Herdr. Le thème
  de l'éditeur propose en plus les thèmes de VS Code (Dark Modern, Light
  Modern).
- Un thème est un fichier JSON au format de Herdr
  (`{ background, foreground, selection, cursor, ansi: [16], colors }`, voir
  `~/.config/herdr-app/AGENTS.md`, § thèmes) : Berger dérive de ces couleurs
  celles de la fenêtre. Pour le code, le fichier peut ajouter un champ
  facultatif `editeur` (couleurs par type de mot : commentaire, chaîne,
  mot-clé, fonction, type, nombre…) ; sans lui, Berger les déduit des 16
  couleurs (comme le fait la coloration d'un terminal). Les thèmes fournis
  ont tous leur champ `editeur`, antoine-monokai reprenant celui déjà écrit
  dans `src/renderer/src/editeur.ts`. Dark Modern et Light Modern sont les
  thèmes intégrés de Monaco, proposés seulement pour l'éditeur. Antoine peut ajouter ses propres
  thèmes en déposant un fichier dans le dossier des thèmes de Berger.
- Changer de thème s'applique tout de suite, sans relancer.

**Fenêtre des réglages** (`⌘,`, ou menu « Berger › Réglages… »), maquette
`reglages.html`, sections :
- « Apparence » : thème de l'application, thème de l'éditeur (chacun en liste
  avec un aperçu de ses couleurs), couleur de sélection de l'éditeur (par
  défaut celle du thème), police de l'interface.
- « Éditeur » : police et taille, retour à la ligne par défaut, minicarte,
  taille des tabulations.
- « Terminal » : police et taille.
- « Raccourcis » : la liste des commandes avec leur raccourci, filtrable ;
  cliquer sur un raccourci attend les nouvelles touches ; un conflit avec un
  autre raccourci est signalé ; « Rétablir » rend celui d'origine. Seuls les
  raccourcis de Berger se modifient ici ; ceux propres à l'éditeur Monaco
  gardent leurs touches.
- En bas, « Ouvrir le fichier des réglages » ouvre le JSON dans un onglet de
  fichier de Berger.

**Fichier des réglages.** Un fichier JSON lisible dans le dossier de données de
Berger (`~/Library/Application Support/Berger/`), que la fenêtre écrit et
qu'Antoine peut modifier à la main : Berger suit ses changements à chaud. Un
fichier mal formé ne casse rien : Berger garde les derniers réglages valides et
le signale. Les raccourcis modifiés sont dans ce fichier (ou un fichier voisin
`raccourcis.json`), à la manière de `keys.json` de Herdr.

**Version de développement.** `npm run dev` utilise son propre dossier de
données (`Berger-dev`), pour ne jamais abîmer l'état de la version installée ;
les deux peuvent tourner en même temps.

**Reprise au relancement.** Taille et place de la fenêtre (y compris plein
écran), workspace, space et onglet affichés, largeurs des colonnes,
explorateur affiché ou masqué, dossiers dépliés, onglets de fichiers. Une
partie est déjà retenue par les phases 2 à 4 : ici, on vérifie que tout
revient.

## Hors périmètre

Autres machines (phase 6), semaine d'usage et corrections qui en sortent
(lancées par Antoine au fil de l'eau), signature et notarisation Apple, mise à jour
automatique, version Windows ou Linux, synchronisation des réglages entre
ordinateurs, éditeur de thèmes dans l'interface.

## À ne surtout pas faire (anti-objectifs)

- Perdre les réglages ou l'état d'Antoine à une mise à jour de Berger.
- Un thème qui rend du texte illisible (texte trop proche du fond) : chaque
  thème fourni est vérifié dans la fenêtre lancée, fenêtre et éditeur.
- Modifier `~/.config/herdr-app/` : les thèmes de Herdr sont une source
  d'inspiration, recopiés dans Berger (noter leur source et leur licence dans
  `docs/COPIES.md`).

## Laissé au développeur

L'outil d'empaquetage (`electron-builder` est déjà prévu par le squelette
electron-vite), la façon de dériver les couleurs de la fenêtre d'un thème de
terminal (Herdr le fait : s'en inspirer), les teintes exactes de Graphite,
Ink, Moss et Paper, le format exact du fichier des réglages.

## Fini quand

Berger installé se lance depuis Spotlight avec son icône et se branche sur
herdr-core ; Antoine change le thème de l'application et celui de l'éditeur
séparément et les voit changer tout de suite ; il modifie un raccourci dans la
fenêtre et dans le fichier ; il relance et retrouve tout ; `npm test` passe.
