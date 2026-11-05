import { hydrate } from '@ajustor/speedster'
import App from './App.spd'

const cible = document.getElementById('app')
if (cible === null) throw new Error('[site] #app est introuvable dans index.html')

// La page arrive déjà rendue par le build : on ne fait que brancher l'état et
// les écouteurs sur les nœuds présents.
hydrate(App, { target: cible })
