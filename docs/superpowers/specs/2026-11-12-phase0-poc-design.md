# Berger — phase 0, première preuve de concept

Date : 2026-11-12. Contexte général : `VISION.md` et `CLAUDE.md` à la racine.

## Intention

Prouver qu'une application Electron peut se bâtir sur herdr-core, et voir
l'éditeur Monaco tourner dedans. Antoine ne veut pas toutes les fonctions de la
phase 0 d'un coup : il veut d'abord la preuve que le core tient la route, et
l'éditeur en action. L'apparence est brute ; les maquettes viendront après.

## Ce qu'Antoine doit pouvoir faire (objectifs)

1. Lancer Berger et voir ses **spaces**, et dans chacun ses **terminaux** et ses
   **agents** avec leur état (au travail, en attente, fini…), mis à jour en
   direct quand l'état change, sans relancer l'app.
2. Cliquer sur un terminal : il s'affiche dans la fenêtre et Antoine **tape
   dedans**, voit la sortie en direct, **pendant que l'app Herdr est ouverte
   sur le même terminal** (les deux restent utilisables).
3. Ouvrir dans l'éditeur Monaco **un fichier du dossier du space sélectionné**,
   avec la coloration (Markdown compris), la recherche `cmd-f` et
   l'enregistrement `cmd-s`.

## Hors périmètre

Workspaces, vrai explorateur de fichiers, Git, `cmd-p`, onglets, plusieurs
machines (ssh, VPS : seulement la machine locale), création / fermeture /
renommage de spaces, d'onglets ou de terminaux depuis Berger, serveurs de
langage, travail soigné sur l'apparence.

## À ne surtout pas faire (anti-objectifs)

- Casser ou perturber les terminaux d'Antoine : il les utilise en même temps
  dans Herdr. Berger ne tue, ne retire, ne renomme et n'écrit rien dans le
  core (pas de `doc.set` sur `herdr-app`, pas de `terminal.kill`/`rm`). Les
  seules écritures dans un terminal sont les touches qu'Antoine tape.
- Pour les tests automatiques ou manuels du développeur : lancer ses propres
  terminaux (`hc run --bg …`) et les fermer ensuite.
- Ne rien modifier dans `~/.config/herdr-app/` ni dans
  `~/dev/playground/herdr-app-mod/`.

## Ce qui est déjà établi sur herdr-core (vérifié, `hc` 0.1.20)

- `hc connect` expose l'API JSON-RPC 2.0, un message par ligne, sur l'entrée et
  la sortie standard ; `hc schema` la décrit (méthodes `hello`,
  `terminal.list`, `terminal.get`, `terminal.attach`, `events.subscribe`,
  `doc.get`, `file.read`, `file.write`…).
- Les spaces sont dans le document `herdr-app` du core
  (`doc.get {name:"herdr-app"}`) : `spaces[]` avec `id`, `name` (vide = pas
  nommé), `folder`, `tabs[]`, et dans chaque onglet un arbre `root` dont les
  feuilles `block` portent `content.terminal` (ex. `t2b`). Le nom affiché d'un
  space non nommé suit les règles de `~/.config/herdr-app/AGENTS.md` (§ « The
  model ») — pour la phase 0, le nom du dossier suffit.
- `events.subscribe` donne un instantané puis chaque changement (statut,
  titre, création, fin, `doc`…), avec `missed` + nouvel instantané si on prend
  du retard. Le changement `doc` permet de relire `herdr-app` quand Herdr
  modifie les spaces.
- `terminal.attach` ouvre un flux brut sur une connexion **tramée** (`hello`
  avec `framed: true`) : première image puis octets en direct ; les touches
  partent en trames DATA, et RESIZE/FOCUS/CLOSE… pilotent le flux. Le format
  binaire exact des trames **n'est pas décrit** dans `hc schema` ni dans
  `hc --skill`.

## Décisions de forme

- Electron, Monaco pour l'éditeur, xterm.js pour le terminal (décidé dans
  `VISION.md`).
- Le processus principal d'Electron parle au core en lançant `hc connect` ; la
  fenêtre ne parle jamais directement à `hc`.
- Les règles pures (lire l'arbre `herdr-app` en spaces → terminaux, rapprocher
  terminaux et états, nom affiché d'un space) vivent dans des modules purs,
  testés à part de l'interface (règle de `CLAUDE.md`).
- Textes de l'interface en français, avec les accents.

## Taille du terminal partagé (décidé par Antoine : « comme dans Herdr »)

Berger se comporte comme une autre fenêtre Herdr branchée sur le même
terminal : la fenêtre où Antoine travaille impose sa taille (au clic, au
focus, au redimensionnement), et l'autre fenêtre s'y adapte, exactement comme
deux fenêtres Herdr entre elles. Le développeur vérifie dans `hc --skill` et
`~/.config/herdr-app/AGENTS.md` comment Herdr fait (focus, RESIZE) et l'imite.

## Choix faits par Claude (Antoine peut les contester)

- **Disposition** : une colonne à gauche avec les spaces et, sous chacun, ses
  terminaux avec leur état ; à droite, la zone du terminal choisi et la zone de
  l'éditeur côte à côte (ou l'une au-dessus de l'autre). Rien de plus.
- **Choix du fichier** : une simple liste plate des fichiers du dossier du
  space sélectionné, avec un champ de filtre, en sautant les dossiers lourds
  (`.git`, `node_modules`…). Ce n'est pas l'explorateur de la phase suivante.
- **Lecture / écriture des fichiers** : par `file.read` / `file.write` du core,
  pour rester « branché sur le core » et préparer les autres machines ; si
  c'est un frein, Node local est acceptable pour la phase 0.
- **Terminal** : d'abord `terminal.attach` sur une connexion tramée. Si le
  format des trames ne peut pas être établi raisonnablement (lecture du code
  source Apache 2.0 de herdr-core s'il est trouvable, ou observation), repli :
  lancer `hc attach <t>` dans un pseudo-terminal (`node-pty`) branché sur
  xterm.js, en le notant clairement comme un repli. Attention dans ce cas :
  `ctrl+\` détache.
- **Terminaux montrés** : ceux rangés dans l'arbre `herdr-app`, sous leur
  space ; tous les autres terminaux vivants du core (sous-agents lancés par
  `hc run`, terminaux de test) dans un groupe « Autres terminaux » en bas de
  la liste. Pas de rattachement des sous-agents à leur parent en phase 0.
- **Tests du développeur** : il lit les vrais spaces d'Antoine sans les
  changer ; pour taper dans un terminal, il lance le sien (`hc run --bg`, sans
  étiquettes `herdr.*`, donc absent des spaces de Herdr), le trouve dans
  « Autres terminaux », puis le ferme.
- **Dossier du space** : celui où se trouve maintenant son premier terminal
  (règle du manuel de Herdr), et le champ `folder` du document à défaut.
- **Thème** : `antoine-monokai` dans Monaco seulement si c'est rapide ; sinon
  le thème sombre par défaut.
- Code repris d'ailleurs : noté dans `COPIES.md` (source et licence).

## Laissé au développeur

Structure du projet, outil de build, versions, découpage des modules, détail
de l'affichage des états, gestion de la taille du terminal, tests précis.

## Comment savoir que c'est réussi

Antoine lance Berger avec Herdr ouvert à côté, voit ses spaces et leurs
terminaux avec un état qui bouge quand un agent passe au travail puis en
attente, ouvre un terminal et tape dedans en voyant le même texte apparaître
dans Herdr, puis ouvre un `.md` du dossier du space, le cherche avec `cmd-f`,
le modifie, l'enregistre avec `cmd-s` et retrouve la modification sur le disque.
Avant de dire que ça marche, le développeur lance l'app et la regarde.
