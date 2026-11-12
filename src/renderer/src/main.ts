// Point d'entrée de la fenêtre Berger.
import type { Vue } from '../../shared/spaces'
import { afficherColonne, afficherConnexion, initColonne } from './colonne'
import { initTerminal, ouvrirTerminal } from './terminal'
import { initEditeur, ouvrirFichier } from './editeur'
import { initChoixFichier, montrerFichiersDe } from './choix-fichier'

initTerminal()
initEditeur()
initChoixFichier((chemin) => void ouvrirFichier(chemin))

initColonne({
  surClicTerminal: (adresse) => ouvrirTerminal(adresse),
  surClicSpace: (space) => void montrerFichiersDe(space.dossier)
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
window.berger.ecouter('berger:dossier', ({ dossier }) => void montrerFichiersDe(dossier))

window.berger.ecouter('berger:non-enregistres', () =>
  window.berger.envoyer('berger:reponse-quitter', { quitter: true })
)
