/**
 * Construit le site dans `dist/`, prêt pour GitHub Pages.
 *
 * Deux passes sur le même `App.spd` :
 * - **navigateur** : `main.js` (qui reprend la page), `main.css` (le style des
 *   composants), et un morceau par langue autre que le français, chargé à la
 *   demande ;
 * - **serveur** : le composant compilé en un programme qui rend du HTML, exécuté
 *   ici une fois par langue. Chaque page publiée (`/`, `/en/`) est donc complète et
 *   lisible sans JavaScript ; le script ne fait qu'ajouter le système détecté et le
 *   numéro de la dernière version.
 *
 * Tous les chemins sont relatifs : le site vit sous `/dq9Recomp-releases/`.
 */
import { cp, exists, mkdir, rm } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { speedster } from '@ajustor/speedster/plugin'
import { compilerLangues } from './i18n.ts'
import { ADRESSE, LANGUES, type CodeLangue } from './src/donnees.ts'

const SERVEUR = '.serveur'

await rm('dist', { recursive: true, force: true })
await rm(SERVEUR, { recursive: true, force: true })

// Le catalogue avant tout : les composants importent `$messages`, qui doit refléter
// les traductions telles qu'elles sont. Une clé manquante arrête le build.
if (!(await compilerLangues())) throw new Error('catalogue de messages invalide')

// --- Le navigateur ------------------------------------------------------------

const client = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  target: 'browser',
  minify: true,
  // L'anglais est un `import()` : il ne se télécharge que sur la page anglaise.
  splitting: true,
  naming: { entry: '[name].[ext]', chunk: 'morceaux/[name]-[hash].[ext]', asset: 'actifs/[name]-[hash].[ext]' },
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [speedster()],
})

if (!client.success) throw new AggregateError(client.logs, 'build du navigateur impossible')

// L'empaqueteur replie le style de tous les composants dans la feuille de l'entrée.
if (!client.outputs.some((sortie) => basename(sortie.path) === 'main.css')) {
  throw new Error('main.css absent : le style des composants a disparu')
}

// --- Le rendu, ici --------------------------------------------------------------

const serveur = await Bun.build({
  entrypoints: ['src/rendu.ts'],
  outdir: SERVEUR,
  target: 'bun',
  plugins: [speedster({ mode: 'server' })],
})

if (!serveur.success) throw new AggregateError(serveur.logs, 'build du rendu impossible')

const { rendre } = (await import(pathToFileURL(resolve(SERVEUR, 'rendu.js')).href)) as {
  rendre: (
    code: CodeLangue,
    racine: string,
  ) => Promise<{ html: string; titre: string; description: string; partage: string }>
}

const attribut = (texte: string) =>
  texte.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

const gabarit = await Bun.file('index.html').text()

// Les versions de la page, pour les moteurs de recherche : chaque page les annonce
// toutes, et le français sert de défaut.
const alternatives = [
  ...LANGUES.map((langue) => `<link rel="alternate" hreflang="${langue.code}" href="${ADRESSE}${langue.dossier}" />`),
  `<link rel="alternate" hreflang="x-default" href="${ADRESSE}" />`,
]

for (const langue of LANGUES) {
  // Profondeur du dossier de la page : `en/` est à un niveau de la racine.
  const racine = langue.dossier === '' ? './' : '../'.repeat(langue.dossier.split('/').filter(Boolean).length)
  const page = await rendre(langue.code, racine)

  const tete = [
    `<link rel="canonical" href="${ADRESSE}${langue.dossier}" />`,
    ...alternatives,
  ].join('\n    ')

  const html = gabarit
    .replaceAll('%lang%', langue.code)
    .replaceAll('%racine%', racine)
    .replace('%titre%', attribut(page.titre))
    .replace('%description%', attribut(page.description))
    .replace('%partage%', attribut(page.partage))
    .replace('<!--langues-->', tete)
    .replace('<!--tete-->', `<link rel="stylesheet" href="${racine}main.css" />`)
    .replace('<!--app-->', page.html)

  const reste = html.match(/%[a-z]+%|<!--(langues|tete|app)-->/)
  if (reste !== null) throw new Error(`index.html : le marqueur ${reste[0]} n'a pas été remplacé`)

  await mkdir(`dist/${langue.dossier}`, { recursive: true })
  await Bun.write(`dist/${langue.dossier}index.html`, html)
  console.log(`  ${langue.dossier}index.html — ${(html.length / 1024).toFixed(1)} ko, rendu au build (${langue.code})`)
}

await rm(SERVEUR, { recursive: true, force: true })

// `public/` à la racine : feuille globale, icône, et `.nojekyll`.
if (await exists('public')) await cp('public', 'dist', { recursive: true })

for (const sortie of client.outputs) {
  const quand = sortie.kind === 'chunk' ? 'à la demande' : 'au chargement'
  console.log(`  ${basename(sortie.path)} — ${(sortie.size / 1024).toFixed(1)} ko (${quand})`)
}
