// Développement : reconstruit `dist/` à chaque sauvegarde (le rendu au build fait
// partie du résultat), le sert, et recharge la page.
import { watch } from 'node:fs'
import type { ServerWebSocket } from 'bun'

const clients = new Set<ServerWebSocket<unknown>>()
const RECHARGEMENT = `<script>new WebSocket('ws://' + location.host + '/__rechargement').onmessage = () => location.reload()</script>`

async function construire(): Promise<void> {
  const resultat = Bun.spawnSync(['bun', 'run', 'build.ts'], { stdout: 'inherit', stderr: 'inherit' })
  if (resultat.exitCode === 0) for (const client of clients) client.send('recharger')
}

await construire()

const server = Bun.serve({
  port: 3000,
  async fetch(request, server) {
    const chemin = new URL(request.url).pathname
    if (chemin === '/__rechargement') {
      return server.upgrade(request) ? undefined : new Response(null, { status: 400 })
    }
    const file = Bun.file(`dist${chemin === '/' ? '/index.html' : chemin}`)
    if (!(await file.exists())) return new Response(null, { status: 404 })
    if (chemin === '/') {
      const page = await file.text()
      return new Response(page.replace('</body>', `${RECHARGEMENT}</body>`), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    return new Response(file, { headers: { 'cache-control': 'no-store' } })
  },
  websocket: {
    open: (ws) => void clients.add(ws),
    close: (ws) => void clients.delete(ws),
    message: () => {},
  },
})

let attente: ReturnType<typeof setTimeout> | undefined
const planifier = () => {
  clearTimeout(attente)
  attente = setTimeout(() => void construire(), 80)
}
watch('src', { recursive: true }, (_evenement, nom) => {
  // Le catalogue compilé est écrit par le build lui-même : le surveiller bouclerait.
  const fichier = String(nom ?? '').replaceAll('\\', '/')
  if (fichier.startsWith('lang/') && fichier.endsWith('.ts')) return
  planifier()
})
watch('public', { recursive: true }, planifier)
watch('index.html', planifier)

console.log(`http://localhost:${server.port}`)
