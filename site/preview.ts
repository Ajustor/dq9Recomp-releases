// Sert `dist/` comme GitHub Pages : fichiers tels quels, 404 sinon.
const server = Bun.serve({
  port: Number(process.env.PORT ?? 4173),
  async fetch(request) {
    const chemin = new URL(request.url).pathname
    const file = Bun.file(`dist${chemin.endsWith('/') ? `${chemin}index.html` : chemin}`)
    if (!(await file.exists())) return new Response(null, { status: 404 })
    return new Response(file)
  },
})

console.log(`http://localhost:${server.port}`)
