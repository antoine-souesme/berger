// Point d'entrée de la fenêtre Berger.
import type { EtatFenetre } from '../../shared/etat-fenetre'
import type { Vue } from '../../shared/spaces'
import {
  afficherSpace,
  appliquerEtatRetenu,
  changer,
  etat,
  ongletAffiche,
  redessiner,
  spaceAffiche,
  surChangement
} from './etat'
import { initFenetre } from './fenetre'
import { annoncerColonne, initColonne } from './colonne'
import { initBarreEtat } from './barre-etat'
import { afficherOnglet, brancherFichiers, dessinerBarre } from './barre-onglets'
import { ouvrirFichier, type PlaceAgent } from '../../shared/onglets'
import { feuilles } from '../../shared/arbre'
import {
  afficherFichier,
  cacherEditeur,
  fermerFichierAvecQuestion,
  fichierAffiche,
  initEditeur,
  quitterAvecQuestion,
  raisonEchec,
  retirerOnglet
} from './editeur'
import { adressesDeLOngletAffiche, dessinerOnglet, viderZoneTerminaux } from './panneaux'
import { initTerminaux, oublierTerminauxSauf } from './terminal'
import { brancherClavier, choisirPlace } from './clavier'

initFenetre()
initBarreEtat()
initTerminaux({ fin: () => redessiner() })
function ouvrirUnFichier(chemin: string): void {
  changer((e) => (e.fichiers = ouvrirFichier(e.fichiers, chemin)))
  afficherOnglet({ type: 'fichier', chemin })
}

// Tous les terminaux rangés, à leur place (pour BERGER_OUVRIR).
function agentsEtTerminaux(): PlaceAgent[] {
  return etat().vue.spaces.flatMap((s) =>
    s.onglets.flatMap((o) =>
      feuilles(o.racine).flatMap((b) =>
        b.content?.terminal
          ? [{ space: s.id, onglet: o.id, panneau: b.id, adresse: b.content.terminal }]
          : []
      )
    )
  )
}

brancherClavier()
brancherFichiers(fermerFichierAvecQuestion)
initColonne({ ouvrirFichier: ouvrirUnFichier, choisirAgent: choisirPlace })

// Le contenu de la colonne de droite : l'onglet de terminal ou le fichier.
surChangement((e) => {
  document.getElementById('deconnecte')!.hidden = e.connecte
  dessinerBarre()
  const space = spaceAffiche()
  const a = ongletAffiche()
  const onglet = a?.type === 'terminal' ? space?.onglets.find((o) => o.id === a.id) : undefined
  document.getElementById('zone-terminaux')!.hidden = !onglet
  document.getElementById('zone-fichier')!.hidden = a?.type !== 'fichier'
  oublierTerminauxSauf(adressesDeLOngletAffiche())
  if (space && onglet) dessinerOnglet(space, onglet)
  else viderZoneTerminaux()
  if (a?.type === 'fichier') {
    if (fichierAffiche() !== a.chemin) {
      const chemin = a.chemin
      void afficherFichier(chemin).then((ok) => {
        if (ok) return
        annoncerColonne(`${chemin.slice(chemin.lastIndexOf('/') + 1)} : ${raisonEchec()}`)
        retirerOnglet(chemin)
      })
    }
  } else if (fichierAffiche()) cacherEditeur()
})

window.berger.ecouter('berger:connexion', ({ etat: c }) =>
  changer((e) => (e.connecte = c === 'connecte'))
)
window.berger.ecouter('berger:vue', (vue: Vue) => {
  etat().vue = vue
  redessiner()
})

void (async () => {
  const { connexion, vue, maison } = await window.berger.demander<{
    connexion: 'connecte' | 'deconnecte'
    vue: Vue
    maison: string
  }>('berger:etat')
  initEditeur(maison)
  appliquerEtatRetenu(await window.berger.demander<EtatFenetre>('berger:etat-fenetre'))
  changer((e) => {
    e.connecte = connexion === 'connecte'
    e.vue = vue
  })
})()

window.berger.ecouter('berger:non-enregistres', async () =>
  window.berger.envoyer('berger:reponse-quitter', { quitter: await quitterAvecQuestion() })
)

// Développement : ouvertures demandées par BERGER_OUVRIR et BERGER_SCENARIO.
window.berger.ecouter('berger:ouvrir', ({ adresse }) => {
  const place = agentsEtTerminaux().find((p) => p.adresse === adresse)
  if (place) choisirPlace(place)
})
window.berger.ecouter('berger:scenario-space', ({ space }) => afficherSpace(space))
window.berger.ecouter('berger:scenario-fichier', ({ chemin }) => ouvrirUnFichier(chemin))
