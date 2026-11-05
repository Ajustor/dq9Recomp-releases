// Le point d'entrée du rendu au build : le même App.spd, compilé en mode serveur.
import { renderToString, type Component } from '@ajustor/speedster/server'
import { locale, t, type LocaleCode } from '$messages'
import App from './App.spd'

export interface Page {
  html: string
  titre: string
  description: string
  partage: string
}

/**
 * Rend la page dans une langue. Le rendu est synchrone : régler la langue juste
 * avant est sûr, rien ne peut s'intercaler.
 */
export async function rendre(code: LocaleCode, racine: string): Promise<Page> {
  await locale.set(code)
  // Le module `.spd` est typé pour le navigateur ; compilé en mode serveur par le
  // build, c'est bien un composant de rendu en chaîne.
  const html = renderToString(App as unknown as Component<{ racine: string }>, { racine })
  return { html, titre: t.meta.titre, description: t.meta.description, partage: t.meta.partage }
}
