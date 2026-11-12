# Berger — phase 3, workspaces, spaces et agents

Date : 2026-11-12. Contexte : `docs/VISION.md`, `docs/suivi/ROADMAP.md`,
`CLAUDE.md`. Phase précédente : `2026-11-12-phase2-cadre-design.md`.

## Intention

Antoine range ses spaces par workspace (pro, GKFA, Oovrage, perso…) avec son
mod `antoine` dans Herdr. Berger doit lui rendre exactement cette organisation,
sinon il ne peut pas quitter Herdr : choisir un workspace d'un clic, ne voir que
ses spaces et ses agents, sauter d'un agent qui l'attend à son terminal.

## Maquettes

- `docs/maquettes/vue-principale.html` : la barre des workspaces (emojis à
  gauche), la liste des spaces (pastille avec l'initiale, état git à droite)
  et la liste des agents (space, titre, durée, état).
- `docs/maquettes/workspaces.html` : le menu du clic droit sur un workspace,
  le dialogue « Nouveau workspace », le dialogue de suppression, un workspace
  vide.
- `docs/maquettes/README.md` : règles visuelles.

## Point de départ

La phase 2 est finie avant de commencer celle-ci : onglets, découpages,
écriture dans le document `herdr-app`, partage des touches et raccourcis de
base existent déjà. Cette phase s'appuie sur ses modules.

## Ce qu'Antoine doit pouvoir faire (objectifs)

1. **Retrouver ses workspaces** au premier lancement de Berger, tels qu'il les
   a dans Herdr (noms, emojis, ordre, spaces de chacun, workspace ouvert).
2. **Passer d'un workspace à l'autre** d'un clic sur son emoji : la liste des
   spaces, la liste des agents et l'explorateur ne montrent plus que ce
   workspace, et Berger rouvre le dernier space qu'il y avait choisi.
3. **Gérer ses workspaces** : en créer, renommer, changer l'emoji, supprimer,
   et les réordonner en les glissant dans la barre.
4. **Voir et choisir ses spaces** dans la liste du workspace ouvert, avec
   leur état git ; créer un space (« + » ou « Nouveau space » quand le
   workspace est vide), renommer (`⇧F2`), réordonner en glissant.
5. **Suivre ses agents** : la liste montre les agents du workspace ouvert avec
   leur état en direct, leurs sous-agents, et un clic ramène à leur terminal.

## Le comportement attendu

**Reprise depuis Herdr, une seule fois.** Au premier lancement (Berger n'a pas
encore d'état de workspaces), Berger lit la clé `antoine.workspaces` du
fichier `~/.config/herdr-app/shared.json`, en lecture seule. Forme :
`{ list: [{ id, name, emoji, spaces: [spaceId], lastSpace }], active }`. Les
identifiants de spaces sont ceux du document `herdr-app` du core, donc les
mêmes dans Berger. Ensuite Berger garde ses workspaces lui-même et ne relit
plus jamais ce fichier ; les changements faits dans Herdr après ne le
suivent pas, et l'inverse. Si le fichier ou la clé manque, Berger part d'un
seul workspace qui contient tous les spaces (comme `initialState` du mod).

**Barre des workspaces.** En haut, les boutons de la colonne (explorateur,
recherche : phases 4 et 5), un trait, puis un bouton par workspace (son
emoji), l'ouvert mis en avant ; en bas, « + » pour en créer un. Survol :
le nom du workspace. Un workspace dont un agent attend Antoine le montre
(pastille de l'état le plus urgent : rose t'attend > vert fini > jaune au
travail).

**Menu du clic droit sur un workspace** : « Renommer », « Changer l'emoji »,
séparateur, « Supprimer ». Chacun ouvre son dialogue (maquette) : champs
« Emoji » et « Nom », « Annuler » / « Valider », `Échap` ferme, `↵` valide.
Supprimer : « Supprimer « Nom » ? », avec « Ses n spaces et leurs agents
seront fermés. » ou « Ce workspace ne contient aucun space. ». Supprimer ferme
réellement ces spaces (leurs terminaux), comme dans le mod. Le dernier
workspace ne peut pas être supprimé.

**Spaces nouveaux ou orphelins.** Un space créé ailleurs (dans Herdr, par un
agent) rejoint le workspace ouvert. Un space qui n'est dans aucun workspace
reste visible partout, pour ne jamais perdre un terminal : il apparaît dans la
liste des spaces de chaque workspace, ses agents dans chaque liste d'agents
(et dans le parcours `⌘]` / `⌘[`), et son état compte pour la pastille de
chaque workspace. Un space fermé disparaît de son workspace.

**Liste des spaces.** Filtrée sur le workspace ouvert, dans l'ordre du
workspace. Chaque ligne : pastille colorée avec l'initiale, nom du space
(règle de nommage de Herdr, déjà en place depuis la phase 0), à droite l'état
git du dépôt du space : la branche, ou « ↑n » quand des commits restent à
pousser (en vert). Le space affiché est mis en avant. « + » en tête de liste
crée un space dans le workspace ouvert (un terminal shell dans le dossier
personnel, comme Herdr). Workspace vide : un bouton « Nouveau space ».
Glisser une ligne la déplace dans l'ordre du workspace.

**Liste des agents.** Les agents des spaces du workspace ouvert. Chaque ligne :
icône du programme, nom du space, titre de l'agent en gris, depuis combien de
temps il est dans son état, l'état (jaune au travail, rose t'attend, vert
fini). Le bouton en tête change le tri : « Ordre des spaces » (groupés par
space dans l'ordre de la liste) ou par urgence. Les sous-agents se rangent sous
leur parent, en arbre : ceux lancés par `hc run` (le core donne leur
`parent`) et ceux que Claude Code lance en lui-même, que ses hooks posent en
étiquettes `antoine.sub.<id>` sur son terminal (règles dans
`~/.config/herdr-app/mods/antoine-agents/subs.js`). Clic sur un agent : Berger
ouvre son space, son onglet et donne le clavier à son terminal ; un clic sur un
sous-agent de hook (sans terminal à lui) mène au terminal de son parent.
`⌘]` / `⌘[` suivent l'ordre de cette liste et sautent les sous-agents de hook.

**Raccourcis.** `⌃1` … `⌃9` choisissent le n-ième space du workspace ouvert ;
`⌥⌘]` / `⌥⌘[` passent au space suivant / précédent dans le workspace ;
`⌘N` crée un space ; `⇧F2` renomme le space affiché.

## Hors périmètre

Explorateur et fichiers (phase 4), recherche dans le projet (phase 5), autres
machines (phase 6), synchronisation des workspaces avec Herdr au-delà de la
reprise initiale, partage des workspaces entre plusieurs ordinateurs.

## À ne surtout pas faire (anti-objectifs)

- Écrire dans `~/.config/herdr-app/` (dont `shared.json`) : lecture seule,
  une fois.
- Perdre un space : un space qui n'est rangé nulle part doit rester visible.
- Fermer des spaces sans la confirmation du dialogue de suppression.
- Tester sur les vrais spaces d'Antoine : créer ses propres spaces et
  workspaces de test, puis les supprimer.

## Code à reprendre

Les règles pures du mod `antoine` et leurs tests
(`~/dev/playground/herdr-app-mod/tests/`) : `workspaces.js` (création,
suppression, déplacement, rapprochement avec les spaces, état d'un workspace,
spaces visibles) et `subs.js` du mod `antoine-agents`. Les noter dans
`docs/COPIES.md`. Le mod suit l'espace affiché par Herdr (`reconcile`, `seen`,
`hold`) parce qu'il vit dans Herdr ; Berger choisit lui-même le space affiché :
ne reprendre que ce qui sert.

## Laissé au développeur

Où Berger garde l'état des workspaces (fichier JSON dans son dossier de
données, à la manière des réglages de la phase 7), le choix des emojis
(saisie libre ou sélecteur du système), la façon de lire l'état git d'un space
(`git` lancé par le core dans le dossier du space, rafraîchi aux changements),
les couleurs des pastilles de spaces (reprendre `space.colors` de Herdr si
utile).

## Fini quand

Antoine lance Berger pour la première fois et retrouve ses workspaces de
Herdr ; il passe de l'un à l'autre et ne voit que leurs spaces et agents ;
il crée, renomme, change l'emoji, déplace et supprime un workspace de test ;
un clic sur un agent l'amène à son terminal ; les sous-agents de Claude Code
s'affichent sous leur parent pendant qu'ils tournent ; `npm test` passe.
