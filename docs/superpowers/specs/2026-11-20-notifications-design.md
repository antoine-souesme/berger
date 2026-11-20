# Notifications

Petite bulle discrète en bas à droite de la fenêtre, comme les toasts de
Herdr, pour dire qu'une chose s'est faite sans regarder ailleurs. Hors phase :
ajout à l'usage demandé par Antoine.

## Ce qui est décidé

- Première sorte : « Texte copié », quand une sélection à la souris dans un
  terminal part dans le presse-papiers (réglage « Copier la sélection »).
- Chaque sorte s'allume ou s'éteint dans une nouvelle rubrique « Notifications »
  des réglages, placée après « Alertes » ; allumée par défaut.
- Réglage écrit dans `reglages.json` : `"notifications": { "copie": true }`.
- Bulle : fond de menu du thème, pastille de couleur, titre en gras, une ligne
  grise (ici le début du texte copié, sur une ligne). Disparaît seule au bout
  de 2,5 s ou au clic. Plusieurs bulles s'empilent, trois au plus.
- La liste des sortes (id, nom, description, valeur par défaut) et la lecture
  du réglage vivent dans un module pur testé (`src/shared/notifications.ts`).

## Approches

Une seule raisonnable : un module d'affichage dans la fenêtre (le DOM), appelé
par ceux qui veulent notifier. Passer par les notifications de macOS serait
bruyant et sortirait de la fenêtre, à l'opposé du « discret » demandé.

## Hors périmètre

Les alertes des agents (fini, attend) restent des sons ; elles pourront devenir
de nouvelles sortes plus tard sans changer le reste.
