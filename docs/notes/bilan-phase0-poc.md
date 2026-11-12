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
