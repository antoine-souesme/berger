# Berger

Berger est mon propre multiplexeur d'agents : une application où je lance,
surveille et guide plusieurs agents de code (Claude Code, Codex…) en même temps,
sur plusieurs projets et plusieurs machines, avec un vrai éditeur de code à côté.

## Pourquoi

Herdr fait très bien la partie agents et terminaux, et j'ai déjà construit
beaucoup de choses par-dessus avec mon mod `antoine`
(`~/dev/playground/herdr-app-mod`). Mais je bute sur ses limites, surtout
l'éditeur de fichiers : pas de recherche (`cmd-f`), pas de couleurs pour le
Markdown, pas de réglage de la couleur de sélection, pas de vraie navigation
dans le code. Je veux un éditeur qui marche aussi bien que celui de VS Code,
sans perdre ce que Herdr m'apporte.

## Le principe

Berger ne refait pas ce que Herdr fait déjà bien. Il s'appuie sur
**herdr-core** (`hc`, licence Apache 2.0), qui propose une interface prévue pour
que d'autres applications s'en servent (`hc connect`, `hc schema`) :

- les terminaux qui restent vivants quand la fenêtre se ferme ;
- les agents : leur état (au travail, en attente, fini), leurs sous-agents ;
- les spaces, les onglets et les découpages, gardés par le core de chaque machine ;
- les autres machines (ssh, VPS).

Berger est une autre fenêtre branchée sur ce même core, comme l'app Herdr.
Les deux peuvent tourner en même temps sur les mêmes terminaux.

## L'éditeur de code

C'est la raison d'être de Berger. Il doit offrir au minimum :

- la coloration de tous les langages, Markdown compris ;
- la recherche et le remplacement dans un fichier (`cmd-f`), et dans tout le
  projet ;
- l'aide du langage : complétion, aller à la définition, erreurs soulignées
  (serveurs de langage, comme VS Code) ;
- plusieurs curseurs, repli du code, minicarte ;
- les différences git dans la marge et une vue des différences côte à côte ;
- le thème Monokai adouci que j'utilise déjà (`antoine-monokai`).

Plutôt que d'écrire un éditeur, partir du moteur de VS Code (Monaco).

## La technologie

Berger est une application **Electron**, comme VS Code : l'éditeur Monaco et
les terminaux (xterm.js) y tournent sans effort, et la partie Node d'Electron
parle directement à herdr-core (`hc connect`).

## Ce que je reprends de mon mod `antoine`

Tout ce que j'ai fait dans Herdr doit exister dans Berger, réécrit pour lui.
Les règles pures du mod (`workspaces.js`, `files.js`, `quickopen.js`,
`outils.js`, `gitpanel.js`, `gitlog.js`, `lanes.js`) et leurs tests peuvent
servir de point de départ.

**Workspaces.** Une barre d'emojis à gauche pour regrouper mes spaces par
workspace, avec un menu au clic droit et ses dialogues. Les listes de spaces et
d'agents ne montrent que le workspace ouvert.

**Liste des spaces.** Filtrée sur le workspace ouvert ; un workspace vide
propose « Nouveau space ».

**Liste des agents.** Filtrée sur le workspace, le nom du space sur chaque
ligne, un tri « Ordre des spaces », les sous-agents internes de Claude Code
(suivis par des hooks), et un clic sur un agent qui ramène à son terminal.

**Barre d'onglets.** Les onglets de terminaux à gauche, puis les fichiers et
les images à droite après un séparateur ; clic molette pour fermer ; onglets
de fichiers épinglables par clic droit ; le dossier affiché quand deux
fichiers ont le même nom ; défilement vers l'onglet actif ; dépôt de fichiers
depuis le Finder.

**Explorateur de fichiers.** Les fichiers masqués comme dans VS Code, ce que git
ignore en grisé, les couleurs git, la corbeille avec confirmation, les icônes
du thème Material Icon de VS Code.

**Recherche de fichiers (`cmd-p`).** Recherche rapide et fichiers récents.

**Ouverture de fichiers.** Depuis l'explorateur, `cmd-p`, le Finder ou le menu
« Ouvrir un fichier… » ; les images dans leur propre visionneuse.

**Panneau Outils.** Un panneau à droite, à côté de Files et Changes, avec sa
propre largeur :
- un terminal par space ;
- une partie Git façon lazygit : changements, branches, graphe des commits,
  fetch (`f`), mise à jour d'une branche sans la changer (fast-forward),
  suppression de branche locale, distante ou les deux.

**Raccourcis.** `cmd-s` enregistrer, `cmd-w` fermer, `cmd-p` rechercher un
fichier.

## Phase 0 : la preuve de concept

Avant tout le reste, vérifier que l'idée tient, avec le strict minimum :

- une fenêtre Berger qui se branche sur herdr-core (`hc connect`) ;
- la liste des terminaux et des agents en cours, avec leur état ;
- un terminal du core affiché et utilisable dans la fenêtre (taper, voir la
  sortie en direct), en même temps que dans l'app Herdr ;
- un fichier ouvert dans l'éditeur Monaco, avec la recherche (`cmd-f`) et
  l'enregistrement (`cmd-s`).

Rien d'autre : pas de workspaces, pas d'explorateur, pas de Git. Le but est de
savoir si herdr-core, Monaco et Electron s'assemblent bien. Si la phase 0 marche, les fonctions du mod `antoine` arrivent
ensuite, une par une.

## Ce qui reste à décider

- Ce que Berger garde de la disposition de Herdr (blocs, panneaux) et ce qu'il
  fait à sa façon.
