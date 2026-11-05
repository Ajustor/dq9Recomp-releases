// Le point d'entrée du rendu au build : le même App.spd, compilé en mode serveur.
import { renderToString, type Component } from '@ajustor/speedster/server'
import App from './App.spd'

// Le module `.spd` est typé pour le navigateur ; compilé en mode serveur par le
// build, c'est bien un composant de rendu en chaîne.
export const rendre = (): string => renderToString(App as unknown as Component<Record<string, never>>)
