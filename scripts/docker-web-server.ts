type BunFile = Blob & { exists(): Promise<boolean> }

declare const Bun: {
  serve(options: {
    hostname: string
    port: number
    fetch(request: Request): Response | Promise<Response>
  }): unknown
  file(input: string | URL): BunFile
}

const backendOrigin = normalizeOrigin(process.env.SECBOARD_BACKEND_ORIGIN ?? 'http://127.0.0.1:3131')
const rootDir = new URL('../dist/web/', import.meta.url)
const port = Number(process.env.SECBOARD_WEB_PORT ?? 8080)
const host = process.env.SECBOARD_WEB_HOST ?? '0.0.0.0'

const proxyPrefixes = [
  '/rpc',
  '/events',
  '/kv',
  '/ui',
  '/ui-state',
  '/dialog',
  '/img',
  '/cunox',
  '/cs',
  '/health'
]

function normalizeOrigin(origin: string): string {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin
}

function contentType(pathname: string): string | undefined {
  if (pathname.endsWith('.html')) return 'text/html; charset=utf-8'
  if (pathname.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (pathname.endsWith('.css')) return 'text/css; charset=utf-8'
  if (pathname.endsWith('.json')) return 'application/json; charset=utf-8'
  if (pathname.endsWith('.svg')) return 'image/svg+xml'
  if (pathname.endsWith('.png')) return 'image/png'
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg'
  if (pathname.endsWith('.webp')) return 'image/webp'
  if (pathname.endsWith('.ico')) return 'image/x-icon'
  if (pathname.endsWith('.woff2')) return 'font/woff2'
  if (pathname.endsWith('.woff')) return 'font/woff'
  return undefined
}

function isProxyPath(pathname: string): boolean {
  return proxyPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function safeStaticPath(pathname: string): string {
  const decoded = decodeURIComponent(pathname)
  return decoded
    .replace(/^\/+/, '')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/')
}

Bun.serve({
  hostname: host,
  port,
  async fetch(request: Request) {
    const url = new URL(request.url)

    if (isProxyPath(url.pathname)) {
      const target = `${backendOrigin}${url.pathname}${url.search}`
      return fetch(target, {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body
      })
    }

    const filePath = safeStaticPath(url.pathname || '/')
    const staticUrl = new URL(filePath || 'index.html', rootDir)
    const file = Bun.file(staticUrl)
    if (await file.exists()) {
      const headers = new Headers()
      const type = contentType(staticUrl.pathname)
      if (type) headers.set('content-type', type)
      if (/\.[a-z0-9]+$/i.test(staticUrl.pathname) && !staticUrl.pathname.endsWith('.html')) {
        headers.set('cache-control', 'public, max-age=31536000, immutable')
      }
      return new Response(file, { headers })
    }

    return new Response(Bun.file(new URL('index.html', rootDir)), {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    })
  }
})

console.log(`SecBoard web server listening on http://${host}:${port}`)
