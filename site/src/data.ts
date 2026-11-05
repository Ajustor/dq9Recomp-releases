import progress from './progress.json'

/**
 * Ce que le site affiche et qui ne vient pas de l'API de GitHub.
 *
 * Les noms de fichiers sont ceux que publie `.github/workflows/release.yml` : un
 * lien `releases/latest/download/<fichier>` pointe toujours sur la dernière version,
 * sans JavaScript. L'API ne sert qu'à afficher le numéro, la date et les tailles.
 */

export const REPO = 'Ajustor/dq9Recomp-releases'
export const RELEASES_PAGE = `https://github.com/${REPO}/releases`
export const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`

export type Platform = 'windows' | 'linux' | 'android'

/** Le détail de chaque paquet est un message : `t.download[platform]`. */
export interface Package {
  platform: Platform
  name: string
  file: string
}

export const PACKAGES: readonly Package[] = [
  { platform: 'windows', name: 'Windows', file: 'dq9recomp-windows-x64.zip' },
  { platform: 'linux', name: 'Linux', file: 'dq9recomp-linux-x64.tar.gz' },
  { platform: 'android', name: 'Android', file: 'dq9recomp-android-arm64.apk' },
]

/** La dernière version publiée, d'après l'API de GitHub. */
export interface Release {
  name: string
  publishedAt: string
  sizes: Record<string, number>
}

export const directLink = (file: string): string =>
  `https://github.com/${REPO}/releases/latest/download/${file}`

/**
 * L'avancement : `progress.json` est une copie telle quelle de `config/progress.json`
 * du dépôt privé (que la CI de ce dépôt public ne peut pas lire). Pour le mettre à
 * jour, recopier le fichier. Le calcul est celui du lanceur
 * (`crates/dq9-launcher/src/progress.rs`) : fait compte 1, partiel ½, manquant 0,
 * et les éléments prévus pour la v2 ne comptent pas.
 */
export type State = 'done' | 'partial' | 'missing' | 'later'

export interface Item {
  name: string
  state: State
  note?: string
}

export interface Domain {
  name: string
  items: Item[]
}

export const PROGRESS = progress as { updated: string; domains: Domain[] }

const WEIGHTS: Record<State, number> = { done: 1, partial: 0.5, missing: 0, later: 0 }

/** Part faite d'une liste d'éléments, entre 0 et 1. */
export function share(items: readonly Item[]): number {
  const counted = items.filter((item) => item.state !== 'later')
  if (counted.length === 0) return 0
  return counted.reduce((sum, item) => sum + WEIGHTS[item.state], 0) / counted.length
}

export const allItems = (): Item[] => PROGRESS.domains.flatMap((domain) => domain.items)

export const percent = (value: number): string => `${Math.round(value * 100)}`

/** Le système du visiteur, d'après son navigateur. `null` si on ne sait pas. */
export function detectPlatform(userAgent: string): Platform | null {
  if (/android/i.test(userAgent)) return 'android'
  if (/windows/i.test(userAgent)) return 'windows'
  if (/linux|x11/i.test(userAgent) && !/cros/i.test(userAgent)) return 'linux'
  return null
}

/** Une taille en Mio, arrondie comme on la lit : 8,3 mais 12. */
export function mebibytes(bytes: number): number {
  const value = bytes / (1024 * 1024)
  return value < 10 ? Math.round(value * 10) / 10 : Math.round(value)
}

/**
 * Les langues du site. La première est à la racine, les autres dans leur dossier
 * (`/en/`) : une page par langue, rendue au build, que les moteurs de recherche
 * indexent et que l'on peut partager.
 */
export const LOCALES = [
  { code: 'fr', name: 'Français', folder: '' },
  { code: 'en', name: 'English', folder: 'en/' },
] as const

export type SiteLocale = (typeof LOCALES)[number]['code']

/** L'adresse publique du site, pour les liens `hreflang` et canoniques. */
export const SITE_URL = 'https://ajustor.github.io/dq9Recomp-releases/'
