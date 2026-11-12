# Bilan de la phase 2 : le cadre de la fenêtre

Date : 2026-11-12. Spec : `docs/superpowers/specs/2026-11-12-phase2-cadre-design.md`.
Plan : `docs/superpowers/plans/2026-11-12-phase2-cadre.md`.

## Ce qui marche (vu dans l'application lancée)

Tout a été joué dans un space de test (`spbergertest…`), créé pour l'occasion
puis fermé par Berger. Une copie du document `herdr-app` a été prise avant la
première écriture ; à la fin, les autres spaces étaient identiques à la copie,
sauf un découpage fait par Antoine dans Herdr pendant ce temps (space
« quipeutmaider », terminal que Berger n'a pas lancé).

- La fenêtre des maquettes : barre des workspaces (vide pour l'instant),
  zone « Explorateur » (la liste de fichiers de la phase 0 en attendant la
  phase 4), spaces avec leur pastille et leur branche, agents avec la couleur de
  leur état, barre d'onglets, barre d'état (« Cet ordinateur », branche, nombre
  d'agents, « ⇧⌘P Commandes »).
- Les largeurs des colonnes se règlent en tirant les séparateurs et reviennent
  au lancement suivant, avec le space, l'onglet affiché et les onglets de
  fichiers.
- Les onglets d'un space et leurs découpages sont ceux de Herdr ; plusieurs
  terminaux tournent et s'affichent en même temps (une connexion par terminal).
- Depuis Berger, au clavier et par les menus : nouvel onglet (`⌘T`), diviser à
  droite (`⌘D`) et en bas (`⇧⌘D`), aller au panneau voisin (`⌥⌘←`), échanger
  (`⌥⇧⌘→`), renommer sur place (F2), agrandir et rétablir (`⇧⌘↵`), fermer le
  panneau (`⇧⌘W`), fermer l'onglet (`⌘W`), et fermer le dernier onglet d'un space
  avec la question. Après chaque action, le document a été relu : l'onglet ou le
  panneau attendu était là, sans doublon.
- L'inverse : un renommage et un découpage écrits dans le document par un autre
  programme pendant que Berger tournait se sont affichés sans relancer.
- Les terminaux créés par Berger tournent toujours après avoir quitté Berger.
- Berger n'envoie sa taille aux terminaux que quand sa fenêtre est au premier
  plan (journal `BERGER_TRACE=1` : aucun `RESIZE` en arrière-plan).
- Onglets de fichiers : l'éditeur prend toute la largeur, avec le chemin en
  bandeau et « Ligne, colonne » et le langage en bas. Changer d'onglet ne perd
  rien ; un fichier modifié montre un point. Fermer un fichier modifié pose la
  question de VS Code ; quitter avec des fichiers modifiés aussi.
- Petits défauts de la phase 0 corrigés : délai d'attente sur le `hello`, suivi
  du numéro des événements après `missed`, erreur au `hello` tramé remontée,
  question avant d'enregistrer un fichier qu'on n'arrive plus à relire, liste de
  fichiers plafonnée annoncée, space sans dossier annoncé, fin des lignes longues
  lisible à gauche de la minicarte.

Les questions natives (fermeture, enregistrement) ne se voient pas sur les
captures de la fenêtre : elles ont été vérifiées par le journal.

## Décisions prises

- Icônes de l'interface : le paquet `lucide`. Découpages dessinés en code
  maison (boîtes flexibles), sans bibliothèque.
- Un terminal affiché a sa propre connexion `hc connect` ; les terminaux d'un
  onglet caché sont détachés (jamais tués) et rattachés au retour.
- L'état retenu est dans le dossier de données d'Electron
  (`~/Library/Application Support/berger/etat-fenetre.json`).
- Nom du programme d'un terminal : l'application qui donne l'état de l'agent
  (Claude Code, Codex) passe d'abord, puis le programme au premier plan. Le nom
  du processus de Claude Code est son numéro de version, il ne sert donc pas.
- Barre d'état : un point de la couleur de l'état des agents devant « N agents »,
  comme la maquette (le plan disait une icône).
- Police : celle du système (pas de police téléchargée).
- Zoom par demi-niveau (`⌘=`, `⌘-`, `⌘0`).
- Un fichier qu'on ne peut pas ouvrir (disparu, binaire, trop gros) : son onglet
  est retiré et un message passe sous le filtre de l'explorateur.
- La minicarte ne peignait que la hauteur du texte : son fond est maintenant
  plein, la fin des lignes ne se lit plus à travers.
- Fermer un onglet ou un panneau : Berger relit le document, ferme seulement
  les terminaux que la fermeture retire vraiment (pas un terminal que Herdr
  vient de déplacer), puis écrit. Les fermer avant d'écrire évite que Herdr
  les remette en place entre-temps.
- Un terminal créé par Berger : sa place est relue après l'écriture (Herdr a pu
  le ranger lui-même) ; s'il n'a pas de place (onglet fermé entre-temps), il est
  fermé.
- Quand la fenêtre de Berger est en arrière-plan, un terminal qui s'affiche s'y
  attache sans imposer sa taille ; la taille part quand la fenêtre revient au
  premier plan.
- Fermer le seul panneau du seul onglet d'un space pose la même question que
  fermer le dernier onglet.
- Si la page de la fenêtre plante, ne répond plus ou charge encore, Berger la
  laisse fermer (sinon il serait impossible de quitter).
- Les scénarios de vérification peuvent répondre à une question à la place
  d'Antoine (`BERGER_SCENARIO_REPONSE`), seulement quand un scénario tourne.
- Les maquettes ont été comparées dans Chrome lancé en arrière-plan (l'extension
  Chrome n'était pas branchée).

## À vérifier par Antoine

- Avec ses vrais onglets, Herdr ouvert à côté : les onglets et découpages de
  Berger sont les mêmes que dans Herdr.
- Un changement fait dans Herdr (nouvel onglet, découpage, renommage) se voit
  dans Berger sans relancer, et l'inverse.
- En revenant dans Herdr, Herdr reprend la taille de ses terminaux.
- Les questions natives : fermer un fichier modifié, quitter avec des fichiers
  modifiés, fermer le dernier onglet d'un space.
