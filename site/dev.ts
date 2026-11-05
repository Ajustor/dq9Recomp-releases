// Développement : reconstruit `dist/` à chaque sauvegarde (le rendu au build fait
// partie du résultat), le sert, et recharge la page.
import { watch } from 'node:fs'
import type { ServerWebSocket } from 'bun'

const clients = new Set<ServerWebSocket<unknown>>()
const RELOAD_SCRIPT = `<script>new WebSocket('ws://' + location.host + '/__reload').onmessage = () => location.reload()</script>`

async function rebuild(): Promise<void> {
  const result = Bun.spawnSync(['bun', 'run', 'build.ts'], { stdout: 'inherit', stderr: 'inherit' })
  if (result.exitCode === 0) for (const client of clients) client.send('reload')
}

await rebuild()

const server = Bun.serve({
  port: 3000,
  async fetch(request, server) {
    const path = new URL(request.url).pathname
    if (path === '/__reload') {
      return server.upgrade(request) ? undefined : new Response(null, { status: 400 })
    }
    // Une page par langue : `/` et `/en/` sont chacune un `index.html`.
    const isPage = path.endsWith('/')
    const file = Bun.file(`dist${isPage ? `${path}index.html` : path}`)
    if (!(await file.exists())) return new Response(null, { status: 404 })
    if (isPage) {
      const page = await file.text()
      return new Response(page.replace('</body>', `${RELOAD_SCRIPT}</body>`), {
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

let pending: ReturnType<typeof setTimeout> | undefined
const schedule = () => {
  clearTimeout(pending)
  pending = setTimeout(() => void rebuild(), 80)
}
watch('src', { recursive: true }, (_event, name) => {
  // Le catalogue compilé est écrit par le build lui-même : le surveiller bouclerait.
  const file = String(name ?? '').replaceAll('\\', '/')
  if (file.startsWith('lang/') && file.endsWith('.ts')) return
  schedule()
})
watch('public', { recursive: true }, schedule)
watch('index.html', schedule)

console.log(`http://localhost:${server.port}`)
