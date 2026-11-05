import { hydrate } from '@ajustor/speedster'
import { locale, type LocaleCode } from '$messages'
import App from './App.spd'

const cible = document.getElementById('app')
if (cible === null) throw new Error('[site] #app est introuvable dans index.html')

// La page arrive rendue au build, dans sa langue (`<html lang>`). Le catalogue de
// cette langue est chargé **avant** la reprise : sinon le premier effet réécrirait
// les textes en français, la langue de référence.
const racine = document.documentElement.dataset['racine'] ?? './'
const code: LocaleCode = document.documentElement.lang === 'en' ? 'en' : 'fr'
await locale.set(code)

hydrate(App, { target: cible, props: { racine } })
