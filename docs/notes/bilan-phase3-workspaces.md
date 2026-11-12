# Bilan de la phase 3 : workspaces, spaces et agents

Date : 2026-11-12. Spec : `docs/superpowers/specs/2026-11-12-phase3-workspaces-design.md`.
Plan : `docs/superpowers/plans/2026-11-12-phase3-workspaces.md`.

## Ce qui marche (vu dans l'application lancée)

Les essais ont été faits avec un workspace de test, des spaces de test
(`spbergertest…`) et un space créé par Berger, tous supprimés ensuite. Une
copie du document `herdr-app` et de `workspaces.json` a été prise avant ; à la
fin, les spaces du document et `workspaces.json` étaient identiques aux copies.
`shared.json` de Herdr n'a jamais changé (même empreinte avant et après).

- **Reprise depuis Herdr.** Au premier lancement, Berger a lu une fois la clé
  `antoine.workspaces` de `~/.config/herdr-app/shared.json` : mêmes noms,
  emojis, ordre, spaces de chacun, workspace ouvert et dernier space que dans
  Herdr. Ensuite il ne relit plus ce fichier.
- **Barre des workspaces** comme la maquette : boutons de la colonne (inactifs
  jusqu'aux phases 4 et 5), un trait, un bouton par emoji (le nom au survol),
  l'ouvert bordé de vert, les autres plus pâles, « + » en bas. Une pastille
  montre l'état le plus urgent (rose t'attend, vert fini, jaune au travail).
- **Passer d'un workspace à l'autre** : la liste des spaces, celle des agents,
  l'explorateur et la barre d'état ne montrent plus que ce workspace, et Berger
  rouvre le dernier space qu'on y avait choisi.
- **Gérer les workspaces** (scénario `BERGER_SCENARIO=workspaces`, captures
  lues une à une) : créer (« + », dialogue « Nouveau workspace »), renommer et
  changer l'emoji (menu du clic droit et leurs dialogues), glisser en première
  place, supprimer (« Supprimer « Essai » ? », « Son space et ses agents seront
  fermés. ») : le workspace disparaît et son space est fermé dans le document,
  aucun autre space touché.
- **Workspace vide** : « Nouveau space » en pointillé, « Aucun agent »,
  « Aucun space dans ce workspace » dans l'explorateur, et la carte « <Nom> est
  vide. Crée un space pour commencer. » à droite, sans onglets.
- **Créer un space** (`⌘N`, « + » du titre « Spaces », « Nouveau space ») : un
  shell dans le dossier personnel, rangé dans le workspace ouvert et affiché.
- **Liste des spaces** : pastille avec l'initiale, nom, branche à droite, ou
  `↑n` en vert quand des commits restent à pousser ; glisser une ligne la
  déplace.
- **Liste des agents** : icône du programme, nom du space, titre en gris,
  durée, état (cercle jaune qui tourne, point rose, coche verte). Le bouton du
  titre bascule « Ordre des spaces » / « Par urgence », retenu après relance.
- **Sous-agents** : dans un space de test, un `hc run` lancé depuis le
  terminal d'un Claude Code s'est affiché sous lui, en arbre.
- **Raccourcis** (scénario `BERGER_SCENARIO=raccourcis`) : `⌃1`, `⌃2`,
  `⌥⌘]`, `⌥⌘[` suivent la liste des spaces du workspace ouvert ; `⌘]`, `⌘[`
  suivent la liste des agents et sautent les sous-agents sans terminal.
- **Space créé ailleurs** : un space de test créé par `hc run` pendant que
  Berger tournait a rejoint le workspace ouvert, puis en est parti à sa
  fermeture.

## Décisions prises

- `workspaces.json` est dans le dossier de données d'Electron
  (`~/Library/Application Support/berger/`), écrit au plus toutes les 300 ms.
  Un fichier illisible est renommé `workspaces.json.illisible` et Berger
  reprend depuis Herdr.
- Le fichier laissé par les essais a été renommé
  `workspaces.json.essai-phase3`, pour que le vrai premier lancement d'Antoine
  reprenne les workspaces de Herdr tels qu'ils seront ce jour-là.
- Berger ne rapproche les workspaces des spaces qu'avec un document lu (un
  tableau `spaces`) : jamais avec une liste vide au démarrage.
- Un space rangé dans aucun workspace (créé ailleurs, ou dont la fermeture a
  échoué) rejoint le workspace ouvert au rapprochement suivant.
- Supprimer un workspace ne ferme que les spaces annoncés par le dialogue.
- Pendant un scénario, Berger refuse de fermer un space qu'il n'a pas créé
  lui-même dans ce lancement et qui n'est pas un space de test.
- Emoji en saisie libre (on garde le premier caractère, emoji composé
  compris), `📁` si le champ est vide. Les deux dialogues « Renommer » et
  « Changer l'emoji » montrent les deux champs et appliquent les deux.
- Pas de « F2 » à côté de « Renommer » dans le menu (la maquette l'affiche),
  car F2 renomme l'onglet de terminal.
- Glisser à la souris (sans glisser-déposer HTML), seuil de 4 px : un clic
  sans mouvement reste un clic.
- Un sous-agent sans panneau mène, au clic, au terminal le plus proche qui en a
  un (son parent, sinon le parent de son parent). Un agent rangé sous un autre
  agent n'a pas de ligne à lui, même s'il y a un shell entre les deux.
- La barre d'état compte les agents du workspace ouvert, et dit « Aucun agent »
  quand il n'y en a pas (maquette d).
- Les sous-agents que Claude Code lance en lui-même (étiquettes posées par ses
  hooks) ont été retirés à la demande d'Antoine : seuls ceux de `hc run` s'affichent.
- Les maquettes ont été comparées dans Chrome lancé en arrière-plan
  (l'extension Chrome n'était pas branchée).

## À vérifier par Antoine

- Au premier lancement : ses vrais workspaces, tels qu'il les a dans Herdr.
