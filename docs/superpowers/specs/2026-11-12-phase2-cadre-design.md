# Berger — phase 2, le cadre de la fenêtre

Date : 2026-11-12. Contexte : `docs/suivi/ROADMAP.md`,
`CLAUDE.md`. Phase précédente : `docs/notes/bilan-phase0-poc.md`.

## Intention

La phase 0 a prouvé que herdr-core, Electron et Monaco s'assemblent. La phase 2
monte la vraie fenêtre de Berger, celle des maquettes, avec la façon de ranger
les choses de Herdr qu'Antoine aime : des onglets de terminaux découpés, et des
onglets de fichiers à part. Les fonctions riches (workspaces, explorateur,
`⌘P`, aide du langage) arrivent aux phases suivantes : ici, on pose le cadre
dans lequel elles viendront se loger, et on le rend solide.

## Maquettes

- `docs/maquettes/vue-principale.html` : la fenêtre entière, un onglet de
  terminal découpé en trois (Claude Code à gauche, lazygit en haut à droite,
  zsh en bas à droite), la barre d'état, le menu du clic droit sur un panneau.
- `docs/maquettes/vue-fichier.html` : un onglet de fichier (l'éditeur sur
  toute la largeur), le menu du clic droit sur un onglet de terminal.
- `docs/maquettes/README.md` : les règles visuelles (couleurs, tailles,
  icônes) à respecter.

La colonne de gauche des maquettes (workspaces, explorateur, spaces et agents)
est posée ici comme cadre ; son contenu complet vient en phases 3 et 4. Dans
cette phase, elle montre ce que la phase 0 sait déjà montrer (les spaces et
leurs agents), à sa place définitive.

## Ce qu'Antoine doit pouvoir faire (objectifs)

1. **Voir la fenêtre des maquettes** : colonne de gauche (barre des
   workspaces, explorateur, spaces et agents), colonne de droite (barre
   d'onglets, contenu de l'onglet, barre d'état). Il règle la largeur des
   colonnes et des découpages en tirant les séparateurs ; Berger les retrouve
   au lancement suivant.
2. **Retrouver ses onglets de terminaux de Herdr** : en choisissant un space,
   il voit ses onglets, chacun avec ses terminaux découpés comme dans Herdr,
   tous vivants et utilisables en même temps (taper dans l'un, voir les autres
   défiler).
3. **Organiser ses terminaux depuis Berger** : nouvel onglet, renommer un
   onglet, fermer un onglet ; diviser un panneau à droite ou en bas, fermer un
   panneau, en échanger deux. Ce qu'il fait dans Berger se voit dans Herdr, et
   l'inverse, sans relancer. Agrandir un panneau reste propre à Berger (comme
   dans Herdr, l'agrandissement et le panneau qui a le clavier restent sur
   chaque écran).
4. **Ouvrir des fichiers en onglets** : les fichiers ouverts (par la liste de
   la phase 0, en attendant l'explorateur et `⌘P`) deviennent des onglets à
   droite du séparateur ; cliquer dessus affiche l'éditeur sur toute la
   largeur ; recliquer sur un onglet de terminal ramène ses terminaux.
5. **Travailler au clavier** avec les raccourcis de Herdr (liste plus bas).

## Le comportement attendu

**Barre d'onglets.** Les onglets de terminaux du space à gauche, puis un
séparateur, puis les onglets de fichiers. Rien d'autre dans la barre (pas de
« + », pas de boutons « Files », « Changes » ou « Outils »). Un onglet de
terminal porte l'icône de l'agent qu'il contient (couleur de son état) et son
nom : le nom donné par Antoine, sinon sa place (1, 2, 3…), comme dans Herdr.
Clic molette sur un onglet : le fermer. L'onglet actif reste visible quand la
barre déborde (défilement vers lui).

**Menu du clic droit sur un onglet de terminal** : « Renommer » (F2),
« Nouvel onglet » (`⌘T`), séparateur, « Fermer » (`⌘W`). Renommer se fait sur
place dans l'onglet ; un nom vide rend son nom de place.

**Onglet de terminal.** Un ou plusieurs terminaux découpés à droite et en bas,
6 px entre eux. Chaque terminal a son bandeau de 28 px : icône du programme,
nom du programme en clair (« Claude Code », « Codex », « lazygit », « zsh »…),
puis son dossier actuel en gris (`~/dev/playground/berger`). Jamais
`utilisateur@machine:chemin`. Le panneau qui a le clavier a un bord bleu
(`#66d9ef`). Un panneau de mod de Herdr (lecteur Markdown, panneau git…)
garde sa place dans l'arbre : Berger le montre comme une case vide avec son
bandeau (« Panneau de Herdr » et le nom du mod), qu'on peut fermer ou
déplacer comme les autres.

**Taille des terminaux partagés avec Herdr.** Un terminal n'a qu'une taille.
Berger impose la sienne quand sa fenêtre est au premier plan (au moment où
elle reprend le focus, et quand on redimensionne un panneau), comme en phase 0 ;
quand Antoine revient dans Herdr, Herdr reprend la sienne. Berger ne renvoie
jamais sa taille en boucle quand il est en arrière-plan.

**Menu du clic droit sur un panneau** : « Diviser à droite » (`⌘D`),
« Diviser en bas » (`⇧⌘D`), « Agrandir le panneau » (`⇧⌘↵`), « Envoyer les
clics droits au terminal », séparateur, « Fermer le panneau » (`⇧⌘W`).
« Envoyer les clics droits au terminal » laisse les clics droits suivants à
ce terminal (pour les programmes qui s'en servent), comme dans Herdr.

**Onglet de fichier.** L'éditeur Monaco seul, sur toute la largeur de la
colonne de droite, avec son bandeau (chemin du fichier) et sa ligne d'état
(ligne, colonne, langage). Un fichier et un terminal ne sont jamais côte à
côte. Changer d'onglet n'enregistre rien : un fichier modifié garde ses
modifications en attente et son onglet montre un point à la place de la croix,
jusqu'à `⌘S`. Fermer un onglet non enregistré (clic molette, `⌘W`) ouvre une
question comme dans VS Code : « Enregistrer », « Ne pas enregistrer »,
« Annuler ». Quitter Berger avec des fichiers non enregistrés pose la même
question pour l'ensemble. Dans cette phase, les onglets de fichiers forment
une seule liste, la même quel que soit le space (ils seront rangés par
workspace en phase 4), et n'ont pas encore de menu du clic droit ni
d'épinglage (phase 4).

**Barre d'état** (en bas de la colonne de droite) : la machine (« Cet
ordinateur »), la branche git du space, le nombre d'agents qui tournent, et à
droite « ⇧⌘P Commandes ». La palette de commandes elle-même n'est pas dans
cette phase : le libellé est là, le raccourci peut ne rien faire encore.

**Ce que Berger retient d'une session à l'autre** : largeurs des colonnes, le
space et l'onglet affichés, les onglets de fichiers ouverts. Les tailles des
découpages des onglets de terminaux sont gardées par herdr-core avec l'onglet
(comme Herdr).

## Raccourcis

Ceux de Herdr (`~/.config/herdr-app/keys.json`), pour ce qui existe dans cette
phase :

| Raccourci | Action |
|---|---|
| `⌘T` | Nouvel onglet de terminal |
| `⌘W` | Fermer l'onglet affiché (fichier ou terminal) |
| `⌃Tab` / `⌃⇧Tab`, `⇧⌘]` / `⇧⌘[` | Onglet suivant / précédent |
| `⌘1` … `⌘9` | Onglet n |
| `⌃1` … `⌃9` | Space n |
| `⌥⌘]` / `⌥⌘[` | Space suivant / précédent |
| `⌘]` / `⌘[` | Agent suivant / précédent |
| `⌘D` / `⇧⌘D` | Diviser à droite / en bas |
| `⇧⌘W` | Fermer le panneau |
| `⇧⌘↵` | Agrandir le panneau |
| `⌥⌘←→↑↓` | Aller au panneau voisin |
| `⌥⇧⌘←→↑↓` | Échanger avec le panneau voisin |
| F2 / `⇧F2` | Renommer l'onglet / le space |
| `⌘B` | Masquer ou montrer la colonne de gauche |
| `⌘=` `⌘-` `⌘0` | Zoom |
| `⌘S` | Enregistrer le fichier affiché |
| `⌘F` | Chercher dans le fichier affiché |

Partage des touches :
- Quand un terminal a le clavier, les touches qui ne sont pas des raccourcis
  de Berger partent au terminal.
- Quand l'éditeur a le clavier, il garde ses propres raccourcis (`⌘D`
  occurrence suivante, F2 renommer un symbole, `⌥⌘↑↓` curseurs, `⌥⌘←→`…),
  sauf ceux qui changent d'onglet, de space ou d'agent, ou ouvrent un outil de
  Berger : `⌘T`, `⌘W`, `⌘1`…`⌘9`, `⌃1`…`⌃9`, `⌃Tab`, `⇧⌘[`/`⇧⌘]`,
  `⌥⌘[`/`⌥⌘]`, `⌘[`/`⌘]` (agents, au lieu du retrait de Monaco), `⌘B`,
  `⌘P`, `⇧⌘P`, `⇧⌘F`, `⇧⌘E`, `⌘,`. La liste vit dans un module pur testé.

## Hors périmètre

Workspaces et leurs dialogues (phase 3), explorateur, `⌘P`, épinglage et menu
des onglets de fichiers, visionneuse d'images (phase 4), aide du langage,
recherche dans le projet, différences git (phase 5), autres machines (phase 6,
remise à plus tard), réglages et application installée (phase 7), palette de
commandes, panneau « Outils » (lazygit tourne dans un terminal ordinaire).

## À ne surtout pas faire (anti-objectifs)

- **Abîmer les spaces, onglets ou terminaux d'Antoine.** Berger écrit
  maintenant dans le document `herdr-app` du core (pour créer, renommer,
  découper, fermer). Herdr écrit dans le même document au même moment :
  chaque écriture repart de la dernière version lue et passe la version à
  `doc.set` ; en cas de conflit, Berger relit et réapplique son changement,
  il n'écrase jamais une version qu'il n'a pas lue. Berger ne change dans ce
  document que ce qu'Antoine vient de demander ; il garde tel quel ce qu'il ne
  comprend pas (panneaux de mods de Herdr, champs inconnus).
- Fermer un terminal sans qu'Antoine l'ait demandé. Seuls « Fermer le
  panneau » et « Fermer » (onglet) ferment des terminaux.
- Tester sur les vrais terminaux d'Antoine : le développeur crée ses propres
  spaces et terminaux de test et les supprime ensuite.
- Ne rien modifier dans `~/.config/herdr-app/` ni dans
  `~/dev/playground/herdr-app-mod/`.

## Ce qui est déjà établi

- La disposition de Herdr est décrite dans `~/.config/herdr-app/AGENTS.md`,
  § « The model : spaces, tabs, terminals » : un onglet est un arbre de
  découpages dont les feuilles sont des terminaux ; un onglet sans nom
  s'appelle par sa place ; fermer le dernier onglet d'un space ferme le space.
- Un terminal lancé avec les étiquettes `herdr.space=<id>` et `herdr.tab=<id>`
  apparaît dans Herdr (`hc run --keep --label …`). C'est ainsi que Berger
  crée les terminaux d'un nouvel onglet ou d'un découpage, dans le dossier du
  panneau qui a le clavier.
- `doc.get` rend le document et sa version, `doc.set` n'écrit que si la
  version correspond (erreur `conflict` sinon) et émet un événement `doc`.
- Le format des trames d'un terminal : `docs/notes/trames-herdr-core.md`.
  Plusieurs terminaux attachés en même temps veulent une connexion tramée par
  terminal ou un multiplexage : au choix du développeur.
- Les commandes de Herdr (`tab.new`, `pane.split`…) sont celles de l'app
  Herdr, pas du core : Berger doit faire le même travail lui-même, en écrivant
  le document. Leur comportement exact est à imiter (AGENTS.md).

## Les petits défauts de la phase 0 à corriger ici

Repris de `docs/notes/bilan-phase0-poc.md` :

- enregistrer sans question si la relecture du fichier échoue (fichier
  supprimé par un agent) : demander d'abord ;
- suivre le numéro des événements après un instantané `missed` ;
- délai d'attente sur le `hello` de `hc connect` ;
- liste de fichiers plafonnée à 5 000 sans le dire : le dire ;
- space sans dossier : ne pas montrer de chemins `/relatif` ;
- erreur au `hello` tramé avalée avant `terminal.attach` : la remonter ;
- les lignes longues passent sous la minicarte (le retour à la ligne viendra
  en phase 5, mais rien ne doit être caché sous la minicarte).

## Le découpage du code (contrainte)

Les règles restent dans des modules purs testés à part (`src/shared/`,
`tests/`), en particulier : l'arbre des découpages (diviser, fermer, agrandir,
échanger, aller au voisin), le nom affiché d'un onglet et d'un terminal, la
modification du document `herdr-app` (partir d'un document et d'une action,
rendre le nouveau document), l'état retenu de la fenêtre. Les règles du mod
`antoine` qui servent (`files.js` pour les onglets de fichiers) peuvent être
reprises, en le notant dans `docs/COPIES.md`.

## Laissé au développeur

La bibliothèque de découpage et de séparateurs (ou du code maison), la façon de
faire passer plusieurs terminaux par herdr-core, l'endroit où Berger garde son
état local (dossier de données d'Electron), l'icône de chaque programme
(celles de Herdr dans `programs.json` sont une bonne source), l'ordre des
travaux.

## Fini quand

Antoine lance Berger avec Herdr ouvert à côté et vérifie dans l'application :
ses onglets et découpages sont les mêmes que dans Herdr ; il crée, renomme,
découpe, échange et ferme des onglets et panneaux de test dans Berger et les voit
changer dans Herdr, et l'inverse ; plusieurs terminaux tournent ensemble ;
ouvrir un fichier crée un onglet qui prend toute la largeur ; les largeurs et
l'onglet affiché reviennent au relancement ; `npm test` et
`npm run typecheck` passent.
