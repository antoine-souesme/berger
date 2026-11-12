# Décisions mises de côté

Ce qui a été volontairement laissé pour plus tard, avec la raison. Les
décisions prises sont dans les bilans de phase (`docs/notes/`).

## Phase 3

- **Deux Berger lancés en même temps.** Rien n'empêche deux fenêtres Berger
  (deux processus) : chacune garde ses workspaces en mémoire et réécrit
  `workspaces.json`, la dernière qui écrit gagne. Vu une fois pendant les
  essais (un lancement précédent pas encore fermé). À trancher avec la phase 7
  (application installée) : un verrou d'instance unique
  (`app.requestSingleInstanceLock`) ou relire le fichier avant d'écrire.
- **Sous-agents d'un sous-agent.** Les sous-agents des hooks ne sont lus que
  sous un agent de premier niveau (comme le mod `antoine-agents`) ; un Claude
  Code lancé par `hc run` sous un autre agent n'affiche pas les siens. À voir
  si Antoine en a besoin.
