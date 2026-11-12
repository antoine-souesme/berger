# Bilan de la première preuve de concept (phase 0)

Date : 2026-11-12. Spec : `docs/superpowers/specs/2026-11-12-phase0-poc-design.md`.

## Ce qui marche (vu dans l'app lancée)

- Berger se branche sur herdr-core par `hc connect` et se rebranche seul si la
  connexion tombe (bandeau « Déconnecté de herdr-core » entre-temps).
- La colonne montre les mêmes spaces que Herdr (noms identiques, d'après le dossier
  actuel du premier terminal), leurs terminaux, et les autres terminaux en bas.
- Les états des agents changent en direct (« au travail » puis « fini » vu sur un
  agent de test).
- Un terminal du core s'ouvre dans Berger : on tape dedans (accents compris), la
  sortie arrive en direct, `exit` affiche « Terminal terminé ». Berger impose sa
  taille au terminal quand il s'y attache, se redimensionne ou reprend le focus.
- Le format des trames de herdr-core, non documenté, a été établi en observant
  `hc attach` : pas besoin de repli (`docs/notes/trames-herdr-core.md`).
- L'éditeur Monaco ouvre un fichier du dossier du space (liste filtrable), colore
  le Markdown, cherche avec `cmd-f`, enregistre avec `cmd-s` par herdr-core,
  demande avant d'écraser un fichier changé sur le disque, refuse proprement un
  fichier qui n'est pas du texte. Thème `antoine-monokai`.

## À vérifier par Antoine

Vérifié par Antoine le 12 novembre 2026 : les deux points ci-dessous marchent.

- Ouvrir un de ses vrais terminaux dans Berger avec Herdr ouvert à côté, et taper
  dedans : je ne l'ai pas fait pour ne pas déranger ses terminaux. S'attacher
  redimensionne le terminal à la taille de Berger ; Herdr reprend la sienne quand
  on revient dans sa fenêtre (à confirmer).
- Renommer ou créer un space dans Herdr : la colonne doit suivre sans relancer
  Berger (événement `doc`, codé mais pas vu en vrai).

## Limites connues

- Les terminaux dont le titre est `utilisateur@machine:chemin` s'affichent ainsi ;
  un meilleur libellé viendra avec les maquettes.
- Les lignes longues passent sous la minicarte de Monaco (pas de retour à la ligne).
- Un seul terminal ouvert à la fois, machine locale seulement.

## Décisions prises pendant la construction

- Task 1: Ruling: dépôt créé directement sur main (nouveau dépôt vide, plan approuvé) — pas de worktree — coût si faux : un renommage de branche.
- Task 1: Ruling: ajout de BERGER_CAPTURE (capture PNG de la fenêtre) pour regarder l'app sans intervention — coût : quelques lignes de code de dev.
- Task 3: Ruling: ajout de src/shared/terminaux.ts (appliquerEvenement) testé à part — la mise à jour de la table est une règle pure — coût : aucun.
- Task 3: Ruling: BERGER_TRACE journalise les changements d'état (vérif sans regarder) — coût : quelques lignes.
- Task 3: Ruling: le renommage d'un space dans Herdr (événement doc) n'a pas été testé en vrai (Antoine absent) — à vérifier par lui — coût : la colonne ne suit pas un renommage.
- Task 4: Ruling: format des trames établi par observation de hc attach (relais via XDG_STATE_HOME), pas de repli node-pty — noté dans docs/notes/trames-herdr-core.md — coût si faux : casse à une mise à jour de hc.
- Task 4: Ruling: BERGER_OUVRIR / BERGER_TAPER (dev) pour tester sans clic — coût : quelques lignes.
- Task 4: Ruling: pas d'ouverture d'un terminal d'Antoine (s'attacher le redimensionne, ce qui perturbe Herdr) — à vérifier par Antoine — coût : comportement face à Herdr non vu par moi.
- Task 4: Ruling: nom d'un space sans nom = dossier actuel du premier terminal (règle Herdr, la tâche 3 prenait folder) — test ajouté — coût : aucun.
- Task 4: Ruling: nom d'un space sans nom = dossier actuel du premier terminal (règle Herdr, la tâche 3 prenait folder) — test ajouté — coût : aucun.
- Task 5: Ruling: scénario de dev BERGER_SCENARIO (src/main/scenario.ts) qui tape les touches et capture, testé sur une copie de VISION.md dans le scratchpad — coût : un fichier de dev.
- Task 5: Ruling: thème antoine-monokai fait (rapide) — coût : aucun.
- Task 5: Ruling: question d'écrasement par la boîte de dialogue native d'Electron (dans le processus principal) plutôt que dans la fenêtre — coût : aucun.
- Final: Ruling: le scénario de dev de l'éditeur rate parfois la touche Échap (≈1 fois sur 3, ancien code compris) — outil de test, pas l'app — coût : un faux négatif de temps en temps.

## Petits défauts laissés pour plus tard (relecture finale)

- enregistrement sans question si la relecture échoue (fichier supprimé par un agent).
- seq des événements non suivi après un instantané missed.
- pas de délai d'attente sur le hello de hc connect.
- liste de fichiers plafonnée à 5 000 sans le dire.
- space sans dossier → liste vide et chemins /relatif.
- erreur au hello tramé avalée avant terminal.attach.
