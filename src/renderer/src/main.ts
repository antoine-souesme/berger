// Point d'entrée de la fenêtre Berger.
import type { EtatFenetre } from '../../shared/etat-fenetre'
import type { Vue } from '../../shared/spaces'
import { appliquerEtatRetenu, changer, redessiner, surChangement, etat } from './etat'
import { initFenetre } from './fenetre'
import { initColonne } from './colonne'
import { initBarreEtat } from './barre-etat'

initFenetre()
initBarreEtat()
initColonne({
  ouvrirFichier: () => {},
  choisirAgent: (a) =>
    changer((e) => {
      e.space = a.space
      e.onglet = { type: 'terminal', id: a.onglet }
      e.focus[a.onglet] = a.panneau
    })
})
surChangement(() => {
  document.getElementById('deconnecte')!.hidden = etat().connecte
})

window.berger.ecouter('berger:connexion', ({ etat: c }) =>
  changer((e) => (e.connecte = c === 'connecte'))
)
window.berger.ecouter('berger:vue', (vue: Vue) => {
  etat().vue = vue
  redessiner()
})

void (async () => {
  const retenu = await window.berger.demander<EtatFenetre>('berger:etat-fenetre')
  appliquerEtatRetenu(retenu)
  const { connexion, vue } = await window.berger.demander<{
    connexion: 'connecte' | 'deconnecte'
    vue: Vue
  }>('berger:etat')
  changer((e) => {
    e.connecte = connexion === 'connecte'
    e.vue = vue
  })
})()

window.berger.ecouter('berger:non-enregistres', () =>
  window.berger.envoyer('berger:reponse-quitter', { quitter: true })
)
