# Bilan de la phase 7 : l'application installée et ses réglages

Date : 2026-11-12. Spec : `docs/superpowers/specs/2026-11-12-phase7-application-design.md`.
Plan : `docs/superpowers/plans/2026-11-12-phase7-application.md`.

## Ce qui marche (vu dans l'application lancée)

Les essais de la version de développement ont tourné dans son propre dossier de
données (`Berger-dev`), avec un dossier `berger-essai-reglages` du dossier
temporaire et un space de test `spbergertest…`, fermé à la fin. Le dossier
`berger/` d'Antoine a été copié avant le premier lancement de la version
installée. Les scénarios `BERGER_SCENARIO=reglages` et `BERGER_SCENARIO=reprise`
jouent ce qui suit, avec une capture et une ligne de journal par étape.

- **Deux dossiers de données.** `npm run dev` écrit dans `Berger-dev/`, la
  version installée dans `Berger/` (le même dossier que l'ancien `berger/` : le
  disque n'est pas sensible à la casse, la version installée a repris l'état
  d'Antoine). Les deux ont tourné en même temps sans écrire chez l'autre.
- **`reglages.json` à la main, suivi à chaud.** `themeApplication: paper` et
  `themeEditeur: vscode-dark-modern` écrits pendant que Berger tourne : la
  fenêtre passe en Paper, le code en Dark Modern, sans relancer. `{ mal` :
  message rouge dans la barre d'état (« reglages.json est mal formé : derniers
  réglages valides gardés. »), rien ne change ; corrigé, le message part.
- **La fenêtre des réglages** (`⌘,`, menu « Berger › Réglages… », bouton
  « Réglages » en bas de la colonne des spaces) : Apparence, Éditeur, Terminal,
  Raccourcis, pied « Ouvrir le fichier des réglages » avec le chemin. Comparée à
  `docs/maquettes/reglages.html` (capture de la maquette dans Chromium) :
  disposition, libellés, pastilles, aperçu du code, ligne en attente de touches.
- **Les thèmes séparés.** Les 7 thèmes de l'application et les 9 de l'éditeur
  choisis un par un dans la fenêtre : chaque capture se lit (listes, onglets,
  explorateur, terminal, barre d'état ; Paper avec le menu du clic droit de
  Berger, les suggestions et le menu de Monaco en Light Modern). Les fichiers
  déjà ouverts se recolorent tout de suite. Un test vérifie le contraste de
  chaque thème fourni (texte, gris, mots du code).
- **Raccourcis.** « Diviser en bas » changé en `⌥⌘D` : « Appuie sur les
  touches… », puis `⌘D` refusé (« Déjà pris par « Diviser à droite ». », `↵` ne
  garde pas), `⌥⌘D` gardé dans `reglages.json`
  (`"panneau.diviserBas": ["cmd-alt-d"]`) ; dans le space de test `⇧⌘D` ne
  divise plus et `⌥⌘D` divise. « Rétablir » retire la clé. `⌥⌘R` écrit à la main
  pour « Diviser à droite » apparaît dans la fenêtre et divise.
- **Fichier mal formé, fenêtre ouverte** : le message est en haut de la fenêtre
  et un clic sur un thème n'écrase pas le texte du fichier.
- **Reprise au relancement** (quitter comme `⌘Q`, relancer) : place et taille de
  la fenêtre, plein écran, space, onglets et onglet affiché, largeur de la
  colonne des spaces, dossiers dépliés. Les phases 2 à 4 retenaient déjà le
  reste (explorateur masqué, onglets de fichiers).
- **L'application installée.** `npm run installer` construit `Berger.app`, la
  signe localement et l'installe dans `/Applications` ; Spotlight la trouve
  (`fr.antoine.berger`). Lancée comme depuis le Dock (`open -a`) : branchée sur
  herdr-core, avec les workspaces et spaces d'Antoine et leurs terminaux. Les
  serveurs de langage se lancent depuis le paquet. Réinstallée pendant qu'elle
  tournait avec un réglage changé : elle s'est fermée, a été remplacée et s'est
  relancée avec le même réglage et le même état. `BERGER_CAPTURE` marche encore
  sur le binaire installé ; les outils de développement n'y sont pas actifs.
- `npm test` (269 tests), `npm run typecheck` et `npm run lint` passent.

## Décisions prises pendant l'exécution

- Teintes de Graphite, Ink, Moss et Paper tirées des pastilles de la maquette ;
  le commentaire d'Atom One Dark éclairci (`#7f848e`) pour la lisibilité.
- Les pastilles d'un thème : fond, panneau, puis mot-clé, chaîne et fonction du
  code.
- Sélection de l'éditeur par défaut d'antoine-monokai : `#49483e` (celle du
  thème, comme la spec et la maquette), au lieu de `#878b9180` en phase 5.
- `⌘F`, `⇧⌘F` et `⇧⌘P` restent des touches fixes de Berger : elles ne se
  modifient pas et comptent comme conflit.
- Une colonne « Rétablir » à droite des raccourcis modifiés (la maquette ne la
  montre pas).
- La fenêtre est remise à sa place après sa première apparition : macOS la
  recentrait.

## Ce qui ne revient pas au relancement

Rien de ce qui a été essayé.

## Ce qu'Antoine doit vérifier

- Lancer Berger depuis Spotlight (« Berger »), voir l'icône du mouton dans le
  Dock.
- Changer le thème de l'application puis celui de l'éditeur dans `⌘,`.
- Modifier un raccourci dans la fenêtre, puis un autre dans `reglages.json`
  (« Ouvrir le fichier des réglages »).
- Quitter et relancer : tout revient.
