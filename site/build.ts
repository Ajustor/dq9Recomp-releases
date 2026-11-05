/**
 * Construit le site dans `dist/`, prêt pour GitHub Pages.
 *
 * Deux passes sur le même `App.spd` :
 * - **navigateur** : `main.js` (qui reprend la page) et `main.css` (le style des
 *   composants) ;
 * - **serveur** : le composant compilé en un programme qui rend du HTML, exécuté
 *   ici. La page publiée est donc complète et lisible sans JavaScript ; le script
 *   ne fait qu'ajouter le système détecté et le numéro de la dernière version.
 *
 * Tous les chemins sont relatifs : le site vit sous `/dq9Recomp-releases/`.
 */
import { cp, exists, rm } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { speedster } from '@ajustor/speedster/plugin'

const SERVEUR = '.serveur'

await rm('dist', { recursive: true, force: true })
await rm(SERVEUR, { recursive: true, force: true })

// --- Le navigateur ------------------------------------------------------------

const client = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  target: 'browser',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [speedster()],
})

if (!client.success) throw new AggregateError(client.logs, 'build du navigateur impossible')

const feuilles = client.outputs
  .filter((sortie) => sortie.path.endsWith('.css'))
  .map((sortie) => basename(sortie.path))

// Une page sans la feuille des composants serait servie sans style, sans erreur.
if (feuilles.length === 0) throw new Error("aucune feuille produite : le style des composants a disparu")

// --- Le rendu, ici --------------------------------------------------------------

const serveur = await Bun.build({
  entrypoints: ['src/rendu.ts'],
  outdir: SERVEUR,
  target: 'bun',
  plugins: [speedster({ mode: 'server' })],
})

if (!serveur.success) throw new AggregateError(serveur.logs, 'build du rendu impossible')

const { rendre } = (await import(pathToFileURL(resolve(SERVEUR, 'rendu.js')).href)) as {
  rendre: () => string
}

const gabarit = await Bun.file('index.html').text()
const liens = feuilles.map((nom) => `<link rel="stylesheet" href="./${nom}" />`).join('\n    ')
const page = gabarit.replace('<!--tete-->', liens).replace('<!--app-->', rendre())

if (page.includes('<!--app-->') || page.includes('<!--tete-->')) {
  throw new Error('index.html : un marqueur <!--app--> ou <!--tete--> n’a pas été remplacé')
}

await Bun.write('dist/index.html', page)
await rm(SERVEUR, { recursive: true, force: true })

// `public/` à la racine : feuille globale, icône, et `.nojekyll`.
if (await exists('public')) await cp('public', 'dist', { recursive: true })

for (const sortie of client.outputs) {
  console.log(`  ${basename(sortie.path)} — ${(sortie.size / 1024).toFixed(1)} ko`)
}
console.log(`  index.html — ${(page.length / 1024).toFixed(1)} ko, rendu au build`)
