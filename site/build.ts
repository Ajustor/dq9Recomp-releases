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
import { compileLocales } from './i18n.ts'
import { LOCALES, SITE_URL, type SiteLocale } from './src/data.ts'

const SERVER_DIR = '.server'

await rm('dist', { recursive: true, force: true })
await rm(SERVER_DIR, { recursive: true, force: true })

// Le catalogue avant tout : les composants importent `$messages`, qui doit refléter
// les traductions telles qu'elles sont. Une clé manquante arrête le build.
if (!(await compileLocales())) throw new Error('catalogue de messages invalide')

// --- Le navigateur ------------------------------------------------------------

const client = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  target: 'browser',
  minify: true,
  // L'anglais est un `import()` : il ne se télécharge que sur la page anglaise.
  splitting: true,
  naming: { entry: '[name].[ext]', chunk: 'chunks/[name]-[hash].[ext]', asset: 'assets/[name]-[hash].[ext]' },
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [speedster()],
})

if (!client.success) throw new AggregateError(client.logs, 'build du navigateur impossible')

// L'empaqueteur replie le style de tous les composants dans la feuille de l'entrée.
if (!client.outputs.some((output) => basename(output.path) === 'main.css')) {
  throw new Error('main.css absent : le style des composants a disparu')
}

// --- Le rendu, ici --------------------------------------------------------------

const server = await Bun.build({
  entrypoints: ['src/render.ts'],
  outdir: SERVER_DIR,
  target: 'bun',
  plugins: [speedster({ mode: 'server' })],
})

if (!server.success) throw new AggregateError(server.logs, 'build du rendu impossible')

const { render } = (await import(pathToFileURL(resolve(SERVER_DIR, 'render.js')).href)) as {
  render: (
    code: SiteLocale,
    root: string,
  ) => Promise<{ html: string; title: string; description: string; share: string }>
}

const escapeAttribute = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

const template = await Bun.file('index.html').text()

// Les versions de la page, pour les moteurs de recherche : chaque page les annonce
// toutes, et le français sert de défaut.
const alternates = [
  ...LOCALES.map((entry) => `<link rel="alternate" hreflang="${entry.code}" href="${SITE_URL}${entry.folder}" />`),
  `<link rel="alternate" hreflang="x-default" href="${SITE_URL}" />`,
]

for (const entry of LOCALES) {
  // Profondeur du dossier de la page : `en/` est à un niveau de la racine.
  const root = entry.folder === '' ? './' : '../'.repeat(entry.folder.split('/').filter(Boolean).length)
  const page = await render(entry.code, root)

  const head = [`<link rel="canonical" href="${SITE_URL}${entry.folder}" />`, ...alternates].join('\n    ')

  const html = template
    .replaceAll('%lang%', entry.code)
    .replaceAll('%root%', root)
    .replace('%title%', escapeAttribute(page.title))
    .replace('%description%', escapeAttribute(page.description))
    .replace('%share%', escapeAttribute(page.share))
    .replace('<!--alternates-->', head)
    .replace('<!--head-->', `<link rel="stylesheet" href="${root}main.css" />`)
    .replace('<!--app-->', page.html)

  const leftover = html.match(/%[a-z]+%|<!--(alternates|head|app)-->/)
  if (leftover !== null) throw new Error(`index.html : le marqueur ${leftover[0]} n'a pas été remplacé`)

  await mkdir(`dist/${entry.folder}`, { recursive: true })
  await Bun.write(`dist/${entry.folder}index.html`, html)
  console.log(`  ${entry.folder}index.html — ${(html.length / 1024).toFixed(1)} ko, rendu au build (${entry.code})`)
}

await rm(SERVER_DIR, { recursive: true, force: true })

// `public/` à la racine : feuille globale, icône, et `.nojekyll`.
if (await exists('public')) await cp('public', 'dist', { recursive: true })

for (const output of client.outputs) {
  const when = output.kind === 'chunk' ? 'à la demande' : 'au chargement'
  console.log(`  ${basename(output.path)} — ${(output.size / 1024).toFixed(1)} ko (${when})`)
}
