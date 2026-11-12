// Point d'entrée de la fenêtre Berger.
import type { EtatFenetre } from '../../shared/etat-fenetre'
import type { Vue } from '../../shared/spaces'
import {
  afficherSpace,
  appliquerEtatRetenu,
  appliquerFichiersRetenus,
  changer,
  changerFichiers,
  etat,
  ongletAffiche,
  ouvrirChemins,
  redessiner,
  spaceAffiche,
  surChangement
} from './etat'
import { initFenetre } from './fenetre'
import { initColonne } from './colonne'
import { annoncer, initExplorateur } from './explorateur'
import { initRanger } from './ranger'
import { initRechercheFichiers } from './recherche-fichiers'
import {
  afficherImage,
  cacherImage,
  imageAffichee,
  initVisionneuse,
  raisonEchecImage
} from './visionneuse'
import { initBarreEtat } from './barre-etat'
import { brancherFichiers, dessinerBarre } from './barre-onglets'
import type { PlaceAgent } from '../../shared/onglets'
import {
  ajouterDossier,
  basculerDeplie,
  deWorkspace,
  estImage,
  fermerFichierWs,
  retirerDossier,
  type EtatFichiers
} from '../../shared/etat-fichiers'
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
import { initWorkspaces } from './workspaces'
import type { EtatWorkspaces } from '../../shared/workspaces'

initFenetre()
initBarreEtat()
initTerminaux({ fin: () => redessiner() })

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
initWorkspaces()
brancherFichiers(fermerFichierAvecQuestion)
initColonne({ choisirAgent: choisirPlace })

// Le contenu de la colonne de droite : l'onglet de terminal ou le fichier.
surChangement((e) => {
  document.getElementById('deconnecte')!.hidden = e.connecte
  dessinerBarre()
  const space = spaceAffiche()
  const a = ongletAffiche()
  const onglet = a?.type === 'terminal' ? space?.onglets.find((o) => o.id === a.id) : undefined
  document.getElementById('zone-terminaux')!.hidden = !onglet
  const image = a?.type === 'fichier' && estImage(a.chemin)
  document.getElementById('zone-fichier')!.hidden = a?.type !== 'fichier' || image
  document.getElementById('zone-image')!.hidden = !image
  oublierTerminauxSauf(adressesDeLOngletAffiche())
  if (space && onglet) dessinerOnglet(space, onglet)
  else viderZoneTerminaux()
  if (a?.type === 'fichier' && image) {
    if (fichierAffiche()) cacherEditeur()
    if (imageAffichee() !== a.chemin) {
      const chemin = a.chemin
      void afficherImage(chemin).then((ok) => {
        if (ok) return
        annoncer(`${chemin.slice(chemin.lastIndexOf('/') + 1)} : ${raisonEchecImage()}`)
        retirerOnglet(chemin)
      })
    }
  } else if (a?.type === 'fichier') {
    if (imageAffichee()) cacherImage()
    if (fichierAffiche() !== a.chemin) {
      const chemin = a.chemin
      void afficherFichier(chemin).then((ok) => {
        if (ok) return
        annoncer(`${chemin.slice(chemin.lastIndexOf('/') + 1)} : ${raisonEchec()}`)
        retirerOnglet(chemin)
      })
    }
  } else {
    if (fichierAffiche()) cacherEditeur()
    if (imageAffichee()) cacherImage()
  }
})

// Comme dans Herdr : un agent fini perd son point vert une fois regardé (son
// terminal dans l'onglet affiché, la fenêtre au premier plan).
surChangement((e) => {
  if (!document.hasFocus()) return
  const regardes = [...adressesDeLOngletAffiche()].filter(
    (a) => e.vue.terminaux[a]?.agent === 'fini'
  )
  if (regardes.length) window.berger.envoyer('berger:vu', { adresses: regardes })
})
window.addEventListener('focus', () => redessiner())

window.berger.ecouter('berger:connexion', ({ etat: c }) =>
  changer((e) => (e.connecte = c === 'connecte'))
)
window.berger.ecouter('berger:workspaces', (w: EtatWorkspaces) => {
  etat().workspaces = w
  redessiner()
})
window.berger.ecouter('berger:vue', (vue: Vue) => {
  etat().vue = vue
  redessiner()
})

void (async () => {
  const { connexion, vue, maison, workspaces } = await window.berger.demander<{
    connexion: 'connecte' | 'deconnecte'
    vue: Vue
    maison: string
    workspaces: EtatWorkspaces | null
  }>('berger:etat')
  initEditeur(maison)
  initExplorateur(maison)
  initRanger()
  initRechercheFichiers(maison)
  initVisionneuse(maison)
  appliquerFichiersRetenus(await window.berger.demander<EtatFichiers>('berger:etat-fichiers'))
  appliquerEtatRetenu(await window.berger.demander<EtatFenetre>('berger:etat-fenetre'))
  changer((e) => {
    e.connecte = connexion === 'connecte'
    e.vue = vue
    e.workspaces ??= workspaces
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
window.berger.ecouter('berger:scenario-fichier', ({ chemin }) => ouvrirChemins([chemin]))
window.berger.ecouter('berger:ouvrir-fichiers', ({ chemins }) => ouvrirChemins(chemins))
window.berger.ecouter('berger:scenario-dossier', ({ chemin }) =>
  changerFichiers((x, ws) => ajouterDossier(x, ws, chemin))
)
window.berger.ecouter('berger:scenario-retirer-dossier', ({ chemin }) =>
  changerFichiers((x, ws) => retirerDossier(x, ws, chemin))
)
// Développement : le scénario repart d'un état propre pour son dossier d'essai.
window.berger.ecouter('berger:scenario-oublier', ({ prefixe }: { prefixe: string }) =>
  changerFichiers((x, ws) => {
    const sous = (c: string): boolean => c === prefixe || c.startsWith(prefixe + '/')
    const f = deWorkspace(x, ws)
    let r = retirerDossier(x, ws, prefixe)
    for (const c of [...f.epingles, ...f.ouverts].filter(sous)) r = fermerFichierWs(r, ws, c)
    for (const c of f.deplies.filter(sous)) r = basculerDeplie(r, ws, c)
    return r
  })
)
