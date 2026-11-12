// Point d'entrée de la fenêtre Berger.
import type { Vue } from '../../shared/spaces'
import { afficherColonne, afficherConnexion, initColonne } from './colonne'
import { initTerminal, ouvrirTerminal } from './terminal'

initTerminal()

initColonne({
  surClicTerminal: (adresse) => ouvrirTerminal(adresse),
  surClicSpace: (space) => console.log('space choisi', space.nom, space.dossier)
})

window.berger.ecouter('berger:connexion', ({ etat }) => afficherConnexion(etat))
window.berger.ecouter('berger:vue', (vue: Vue) => afficherColonne(vue))

void window.berger
  .demander<{ connexion: 'connecte' | 'deconnecte'; vue: Vue }>('berger:etat')
  .then(({ connexion, vue }) => {
    afficherConnexion(connexion)
    afficherColonne(vue)
  })

window.berger.ecouter('berger:ouvrir', ({ adresse }) => ouvrirTerminal(adresse))
