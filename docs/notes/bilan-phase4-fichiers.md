# Bilan de la phase 4 : fichiers

Date : 2026-11-12. Spec : `docs/superpowers/specs/2026-11-12-phase4-fichiers-design.md`.
Plan : `docs/superpowers/plans/2026-11-12-phase4-fichiers.md`.

## Ce qui marche (vu dans l'application lancée)

Les essais ont été faits dans des dossiers d'essai (`berger-essai-…`, dans un
dossier temporaire), ajoutés comme racines puis retirés. Une copie de
`workspaces.json` et `etat-fenetre.json` a été prise avant et remise à la fin ;
`shared.json` de Herdr n'a jamais changé (même empreinte avant et après).
L'extension Chrome n'étant pas branchée, les maquettes ont été rendues par
Chrome sans fenêtre (`--headless --screenshot`) et comparées aux captures.

- **Reprise depuis Herdr.** Au premier lancement, Berger a lu une fois
  `antoine.folders`, `antoine.recent` et `antoine.files` dans `shared.json` :
  `fichiers.json` créé avec les dossiers ajoutés, les récents et les onglets de
  chacun des trois workspaces.
- **Explorateur** (scénario `explorateur`) : une racine par space puis les
  dossiers ajoutés, séparés par un trait ; nom de la racine dans sa couleur git
  et chemin en gris (`~` pour la maison) ; `M` jaune, `U` vert, point sur les
  dossiers parents ; `node_modules` en gris ; pas de `.DS_Store` ; icônes
  Material ; lignes de 22 px. Un fichier créé par Node pendant que Berger
  tournait est apparu seul. `⇧⌘E` et le bouton de la barre des workspaces
  masquent puis réaffichent l'explorateur ; l'état est retenu.
- **Ranger les fichiers** (scénario `fichiers`, captures lues une à une) :
  menu du clic droit comme la maquette (avec « Retirer de l'explorateur » sur la
  racine ajoutée) ; nouveau fichier et nouveau dossier sur place ; renommer
  (F2, le nom sans l'extension choisi) ; copier / coller (`⌘C`, `⌘V`) donne
  `b copie.txt` ; glisser `b.txt` sur `notes` le déplace et son onglet suit ;
  glisser un nom déjà pris pose la question, « Garder les deux » donne
  `b copie copie.txt` (même règle que le Finder et le mod) ; un fichier déposé
  « du Finder » sur `notes` y est copié ; « Mettre à la corbeille » montre le
  dialogue de la maquette et le fichier quitte le dossier (par la corbeille de
  macOS, `shell.trashItem`).
- **Ouvrir un fichier de partout** : clic dans l'explorateur, `⌘P` (champ vide :
  « Récents » ; `bt` : lettres surlignées, `↵` ouvre), dépôt d'un fichier sur la
  fenêtre (il s'ouvre en onglet), « Fichier › Ouvrir un fichier… » (`⌘O`, le
  sélecteur de macOS s'est ouvert, vu sur une capture d'écran de macOS).
- **Visionneuse** : `logo.png` centré sur un damier, chemin en bandeau,
  « 512 × 512 px · 35 Ko » et « Image PNG » en bas.
- **Onglets de fichiers** (scénario `onglets`) : `notes.md` épinglé passe en
  premier avec sa punaise, deux `index.ts` suivis de `main` et `renderer` en
  gris, un point sur le fichier modifié ; menu « Épingler » / « Désépingler »,
  « Enregistrer », « Fermer » ; clic molette ferme.
- **Relancement** : les onglets (épinglés compris) et le fichier affiché (texte
  ou image) reviennent ; un fichier ouvert supprimé pendant que Berger était
  fermé a disparu sans message, les autres sont revenus.

## Décisions prises

- « Retirer de l'explorateur » seulement sur une racine ajoutée à la main,
  jamais sur celle d'un space (spec, décision d'Antoine).
- « Renommer » et « Mettre à la corbeille » sont inactifs sur une racine :
  renommer ou jeter le dossier d'un space casserait ce space.
- Le collage prend un nom libre comme le Finder (`a copie.txt`,
  `a copie 2.txt`) ; un nom pris au glisser-déposer pose la question
  « Remplacer » / « Garder les deux » / « Annuler » ; « Remplacer » met
  d'abord l'ancien à la corbeille, jamais de suppression définitive.
- Le fichier affiché est retenu par `etat-fenetre.json` (l'onglet affiché),
  pas par l'état des fichiers ; le `shown` de Herdr n'est pas repris.
- Les onglets de fichiers de la phase 3 (liste globale dans
  `etat-fenetre.json`) ne sont pas repris : ils sont maintenant par workspace.
- Un fichier ouvert d'un clic dans l'explorateur laisse le clavier à
  l'explorateur (comme VS Code), pour que `⌘C`, `F2` ou `⌘⌫` visent le fichier
  choisi et non l'éditeur.
- `git status` est lancé avec `--no-optional-locks` : sinon il réécrit
  `.git/index`, la surveillance le voit et relance git sans fin.
- Champ vide de `⌘P` : seulement les récents (la spec), pas la section
  « Récents » sous les résultats que montre la maquette.
- Le fichier `fichiers.json` des essais a été renommé
  `fichiers.json.essai-phase4`, pour que le vrai premier lancement reprenne les
  fichiers de Herdr tels qu'ils seront ce jour-là.

## À vérifier par Antoine

- Au premier lancement : ses dossiers ajoutés, ses récents et ses onglets de
  fichiers de Herdr, dans chaque workspace.
- Un vrai glisser-déposer à la souris depuis le Finder et dans l'arbre (les
  essais l'ont joué par le protocole de débogage de Chromium).
- La corbeille de macOS : le dossier `~/.Trash` n'est pas lisible depuis le
  terminal des essais ; le fichier a bien quitté son dossier.
- La capture d'écran de macOS faite pour voir le sélecteur de `⌘O` a déclenché
  une demande d'autorisation d'enregistrement de l'écran ; elle peut être
  refusée.
