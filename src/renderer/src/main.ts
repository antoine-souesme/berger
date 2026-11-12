// Point d'entrée de la fenêtre Berger.
import type { EtatFenetre } from '../../shared/etat-fenetre'
import type { Vue } from '../../shared/spaces'
import {
  appliquerEtatRetenu,
  changer,
  etat,
  ongletAffiche,
  redessiner,
  spaceAffiche,
  surChangement
} from './etat'
import { initFenetre } from './fenetre'
import { initColonne } from './colonne'
import { initBarreEtat } from './barre-etat'
import { dessinerBarre } from './barre-onglets'
import {
  adressesDeLOngletAffiche,
  dessinerOnglet,
  oublierClavier,
  viderZoneTerminaux
} from './panneaux'
import { initTerminaux, oublierTerminauxSauf } from './terminal'

initFenetre()
initBarreEtat()
initTerminaux({ fin: () => redessiner() })
initColonne({
  ouvrirFichier: () => {},
  choisirAgent: (a) => {
    oublierClavier()
    changer((e) => {
      e.space = a.space
      e.onglet = { type: 'terminal', id: a.onglet }
      e.focus[a.onglet] = a.panneau
    })
  }
})

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
