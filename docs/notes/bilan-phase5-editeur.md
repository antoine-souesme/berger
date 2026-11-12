# Bilan de la phase 5 : l'éditeur complet

Date : 2026-11-12. Spec : `docs/superpowers/specs/2026-11-12-phase5-editeur-design.md`.
Plan : `docs/superpowers/plans/2026-11-12-phase5-editeur.md`.

Recherche dans le projet et différences git : remises à plus tard (décision
d'Antoine), rien n'en est construit ; le bouton loupe de la barre des
workspaces est retiré.

## Ce qui marche (vu dans l'application lancée)

Les essais ont été faits dans un dossier `berger-essai-langage` du dossier
temporaire, ajouté comme racine. `workspaces.json`, `fichiers.json` et
`etat-fenetre.json` ont été copiés avant et remis à la fin. Aucun terminal ni
space d'Antoine n'a été touché. Le scénario `BERGER_SCENARIO=langage` joue tout
ce qui suit, avec une capture et une ligne de journal par étape.

- **Aller à la définition.** `F12` sur `somme` (importé de `./b`) ouvre l'onglet
  `src/b.ts` ; `F12` sur `bonjour` (paquet de `node_modules`) ouvre
  `node_modules/petit-paquet/index.d.ts`.
- **Erreurs en tapant.** `const n: number = 'x'` tapé en fin de fichier : erreur
  2322 soulignée en moins de 3 s (avec les indices « jamais lu » de TypeScript).
- **Survol** : `const café: number` (lettre accentuée et émoji avant le symbole).
- **Complétion** après `som` : `somme` en tête.
- **Menu du clic droit** : « Organiser les imports » (⇧⌥O) avec aller à la
  définition, aux références, renommer.
- **Un agent réécrit `b.ts`** (troisième paramètre) pendant que `a.ts` est
  modifié : `b.ts`, ouvert et non modifié, se recharge ; `a.ts` garde son texte
  et son point ; l'erreur 2554 « Expected 3 arguments » arrive.
- **JSON** : `package.json` sans virgule souligné (514 « Expected comma ») ;
  schémas de SchemaStore téléchargés par la partie Node et gardés en cache.
- **YAML** : `jobs: 3` dans `.github/workflows/ci.yml` souligné par le schéma
  GitHub Workflow.
- **Renommer un fichier ouvert** par l'explorateur (`b.ts` → `c.ts`) : le modèle
  porte la nouvelle adresse `file://…/src/c.ts`, `a.ts` reste modifié.
- **⌥Z** sur `long.txt` : retour à la ligne, aucun caractère sous la minicarte ;
  second ⌥Z, retour à l'état sans retour à la ligne ; l'état est retenu dans
  `etat-fenetre.json`.
- **Le service qui plante ou ne répond plus** : testé avec de faux serveurs
  (`tests/langage-serveurs.test.ts`) : trois arrêts, puis « Le service TypeScript
  s'est arrêté. » sans relance ; un serveur muet rend « Délai dépassé. ».
- **Couleurs.** Le même `a.ts` ouvert dans VS Code (thème Monokai, coloration
  sémantique active) et dans Berger : mêmes couleurs jeton par jeton, paramètres
  orange en italique, fonctions vertes, types en bleu italique, `import` rose,
  chaînes jaunes, commentaires `#88846f`.
- **Disposition** comparée à la maquette `vue-fichier.html` (rendue par Chrome
  sans fenêtre, l'extension ne lisant pas les fichiers locaux) : bandeau du
  chemin, éditeur, barre d'état du fichier inchangés.

## Écarts avec VS Code

- Pas d'indications en ligne (noms de paramètres `a:`, `b:`, types des
  paramètres de fonctions fléchées) : VS Code les affiche chez Antoine, la spec
  ne les demande pas.
- La police reste celle de Berger (Menlo, sans ligatures) ; VS Code chez Antoine
  affiche `=>` en ligature.
- Les menus de Monaco (clic droit, palette) restent en anglais, sauf
  « Organiser les imports ».
- `jsonc` est rangé sous `json` (seul langage du service JSON de Monaco) :
  les commentaires sont acceptés dans tous les fichiers JSON.

## Ce qui reste

Voir `docs/suivi/DETTE.md` : recherche et différences git, fichiers ouverts
hors des racines surveillées, empaquetage des serveurs de langage (phase 7).
