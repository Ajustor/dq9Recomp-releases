/**
 * Ce que le site affiche et qui ne vient pas de l'API de GitHub.
 *
 * Les noms de fichiers sont ceux que publie `.github/workflows/release.yml` : un
 * lien `releases/latest/download/<fichier>` pointe toujours sur la dernière version,
 * sans JavaScript. L'API ne sert qu'à afficher le numéro, la date et les tailles.
 */

export const DEPOT = 'Ajustor/dq9Recomp-releases'
export const PAGE_DES_VERSIONS = `https://github.com/${DEPOT}/releases`
export const API_DERNIERE = `https://api.github.com/repos/${DEPOT}/releases/latest`

export type Systeme = 'windows' | 'linux' | 'android'

export interface Paquet {
  systeme: Systeme
  nom: string
  fichier: string
  detail: string
}

export const PAQUETS: readonly Paquet[] = [
  {
    systeme: 'windows',
    nom: 'Windows',
    fichier: 'dq9recomp-windows-x64.zip',
    detail: 'Windows 10 et 11, 64 bits. Décompressez, puis lancez dq9-runtime.exe.',
  },
  {
    systeme: 'linux',
    nom: 'Linux',
    fichier: 'dq9recomp-linux-x64.tar.gz',
    detail: 'x86-64. Décompressez, puis lancez ./dq9-runtime.',
  },
  {
    systeme: 'android',
    nom: 'Android',
    fichier: 'dq9recomp-android-arm64.apk',
    detail: 'Téléphones 64 bits, Android 8 ou plus. Manette tactile intégrée.',
  },
]

export const lienDirect = (fichier: string): string =>
  `https://github.com/${DEPOT}/releases/latest/download/${fichier}`

/**
 * L'avancement : `progress.json` est une copie telle quelle de `config/progress.json`
 * du dépôt privé (que la CI de ce dépôt public ne peut pas lire). Pour le mettre à
 * jour, recopier le fichier. Le calcul est celui du lanceur
 * (`crates/dq9-launcher/src/progress.rs`) : fait compte 1, partiel ½, manquant 0,
 * et les éléments prévus pour la v2 ne comptent pas.
 */
import avancement from './progress.json'

export type Etat = 'done' | 'partial' | 'missing' | 'later'

export interface Element {
  name: string
  state: Etat
  note?: string
}

export interface Domaine {
  name: string
  items: Element[]
}

export const AVANCEMENT = avancement as { updated: string; domains: Domaine[] }

const POIDS: Record<Etat, number> = { done: 1, partial: 0.5, missing: 0, later: 0 }

/** Part faite d'une liste d'éléments, entre 0 et 1. */
export function part(elements: readonly Element[]): number {
  const comptes = elements.filter((element) => element.state !== 'later')
  if (comptes.length === 0) return 0
  return comptes.reduce((somme, element) => somme + POIDS[element.state], 0) / comptes.length
}

export const tousLesElements = (): Element[] => AVANCEMENT.domains.flatMap((domaine) => domaine.items)

export const pourcent = (valeur: number): string => `${Math.round(valeur * 100)}`

/** Le mot de l'état, comme dans le lanceur. */
export const MOT: Record<Etat, string> = { done: 'fait', partial: 'partiel', missing: 'manquant', later: 'v2' }

/** Le système du visiteur, d'après son navigateur. `null` si on ne sait pas. */
export function detecterSysteme(agent: string): Systeme | null {
  if (/android/i.test(agent)) return 'android'
  if (/windows/i.test(agent)) return 'windows'
  if (/linux|x11/i.test(agent) && !/cros/i.test(agent)) return 'linux'
  return null
}

export function taille(octets: number): string {
  const mio = octets / (1024 * 1024)
  return `${mio.toLocaleString('fr-FR', { maximumFractionDigits: mio < 10 ? 1 : 0 })} Mio`
}

export function date(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
