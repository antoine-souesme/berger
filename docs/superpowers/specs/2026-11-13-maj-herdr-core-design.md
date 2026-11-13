# Prévenir d'une mise à jour de herdr-core

Validé par Antoine le 13 novembre 2026.

## Pourquoi

Berger ne dit pas quand une nouvelle version de herdr-core est sortie. Herdr le
fait (Settings → Updates, avec un rond bleu) ; Berger doit le faire aussi.

## Ce qui est décidé

- Berger vérifie au lancement, puis toutes les heures, en lisant
  `https://releases.herdr.dev/core/latest.json` (champs `version` et
  `generation`), et compare avec `hc --version`. Une version de même
  génération (1, celle que Berger parle) et plus récente est « disponible ».
- Quand une version est disponible : un rond bleu sur le bouton « Réglages » en
  bas de la colonne, et sur la rubrique « Mises à jour » des réglages.
- Nouvelle rubrique « Mises à jour » : « herdr-core 0.1.20 », puis soit « À
  jour. Vérifié à 08:19. », soit « 0.1.21 est prête. Tes terminaux restent
  ouverts pendant la mise à jour. » ; boutons « Vérifier maintenant » et
  « Mettre à jour herdr-core » (ce dernier seulement quand une version est
  disponible). Une vérification ratée efface l'heure et dit qu'elle a échoué.
- « Mettre à jour herdr-core » lance `hc update` ; le core redémarre, Berger se
  rebranche tout seul (comme aujourd'hui), puis vérifie de nouveau : le rond
  disparaît.
- Berger n'installe jamais rien sans clic.

## Hors périmètre

- La mise à jour de Berger lui-même.
- Les autres machines (phase 6).
- Les notes de version (« What's new »).

## Approches

Lire `latest.json` directement (retenu) : c'est la source qu'utilise `hc` pour
`update`. Lancer `hc update` pour savoir s'il y a du nouveau : impossible, il
installe aussitôt. Attendre que le core le dise : il n'expose rien de tel.

## Laissé au développeur

- Pour les essais, `BERGER_VERSION_CORE=<x.y.z>` fait croire à Berger qu'il a
  cette version (la vraie mise à jour est laissée à Antoine).
- La comparaison de versions et la décision « disponible » sont dans un module
  pur testé (`src/shared/maj-core.ts`).
