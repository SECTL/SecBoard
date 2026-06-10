import { AutoRouter, IRequest, error } from 'itty-router'
import type { Env } from './types'
import { putCunoxFile } from './storage'
import {
  handlePostCommand,
  handleGetKv,
  handlePutKv,
  handleDeleteKv,
  handleGetUiState,
  handlePutUiState,
  handleDeleteUiState,
  handleGetEvents,
  handleGetCunoxFile,
  handlePutCunoxFile,
  handleDeleteCunoxFile
} from './handlers'

const router = AutoRouter()

async function readJsonObject(req: IRequest): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  return body as Record<string, unknown>
}

router.get('/health', () => ({ ok: true, platform: 'cloudflare-workers' }))

router.get('/events', async (req: IRequest, env: Env) => {
  const since = Number(req.query.since) || 0
  return await handleGetEvents(env, since)
})

router.post('/rpc/post-command', async (req: IRequest, env: Env) => {
  const body = await readJsonObject(req)
  const command = String(body.command || '')
  if (!command) {
    return error(400, { ok: false, error: 'BAD_COMMAND' })
  }
  const result = await handlePostCommand(env, command, body.payload)
  if (!result.ok) {
    return error(400, result)
  }
  return { ok: true }
})

router.post('/commands', async (req: IRequest, env: Env) => {
  const body = await readJsonObject(req)
  const command = String(body.command || '')
  if (!command) {
    return error(400, { ok: false, error: 'BAD_COMMAND' })
  }
  const result = await handlePostCommand(env, command, body.payload)
  if (!result.ok) {
    return error(400, result)
  }
  return { ok: true }
})

router.get('/kv/:key', async (req: IRequest, env: Env) => {
  const key = decodeURIComponent(req.params.key || '')
  if (!key) {
    return error(400, { ok: false, error: 'BAD_KEY' })
  }
  return await handleGetKv(env, key)
})

router.put('/kv/:key', async (req: IRequest, env: Env) => {
  const key = decodeURIComponent(req.params.key || '')
  if (!key) {
    return error(400, { ok: false, error: 'BAD_KEY' })
  }
  const body = await readJsonObject(req)
  return await handlePutKv(env, key, body.value)
})

router.delete('/kv/:key', async (req: IRequest, env: Env) => {
  const key = decodeURIComponent(req.params.key || '')
  if (!key) {
    return error(400, { ok: false, error: 'BAD_KEY' })
  }
  return await handleDeleteKv(env, key)
})

router.get('/ui/:windowId', async (req: IRequest, env: Env) => {
  const windowId = decodeURIComponent(req.params.windowId || '')
  if (!windowId) {
    return error(400, { ok: false, error: 'BAD_WINDOW_ID' })
  }
  return await handleGetUiState(env, windowId)
})

router.put('/ui/:windowId/:key', async (req: IRequest, env: Env) => {
  const windowId = decodeURIComponent(req.params.windowId || '')
  const key = decodeURIComponent(req.params.key || '')
  if (!windowId || !key) {
    return error(400, { ok: false, error: 'BAD_UI_STATE_KEY' })
  }
  const body = await readJsonObject(req)
  return await handlePutUiState(env, windowId, key, body.value)
})

router.delete('/ui/:windowId/:key', async (req: IRequest, env: Env) => {
  const windowId = decodeURIComponent(req.params.windowId || '')
  const key = decodeURIComponent(req.params.key || '')
  if (!windowId || !key) {
    return error(400, { ok: false, error: 'BAD_UI_STATE_KEY' })
  }
  return await handleDeleteUiState(env, windowId, key)
})

router.get('/ui-state/:windowId', async (req: IRequest, env: Env) => {
  const windowId = decodeURIComponent(req.params.windowId || '')
  if (!windowId) {
    return error(400, { ok: false, error: 'BAD_WINDOW_ID' })
  }
  return await handleGetUiState(env, windowId)
})

router.put('/ui-state/:windowId/:key', async (req: IRequest, env: Env) => {
  const windowId = decodeURIComponent(req.params.windowId || '')
  const key = decodeURIComponent(req.params.key || '')
  if (!windowId || !key) {
    return error(400, { ok: false, error: 'BAD_UI_STATE_KEY' })
  }
  const body = await readJsonObject(req)
  return await handlePutUiState(env, windowId, key, body.value)
})

router.delete('/ui-state/:windowId/:key', async (req: IRequest, env: Env) => {
  const windowId = decodeURIComponent(req.params.windowId || '')
  const key = decodeURIComponent(req.params.key || '')
  if (!windowId || !key) {
    return error(400, { ok: false, error: 'BAD_UI_STATE_KEY' })
  }
  return await handleDeleteUiState(env, windowId, key)
})

router.get('/cunox/:path*', async (req: IRequest, env: Env) => {
  const path = decodeURIComponent(req.params.path || '')
  return await handleGetCunoxFile(env, path)
})

router.post('/cunox/:path*', async (req: IRequest, env: Env) => {
  const path = decodeURIComponent(req.params.path || '')
  const contentType = req.headers.get('content-type') || 'application/octet-stream'
  const data = await req.arrayBuffer()
  return await handlePutCunoxFile(env, path, data, contentType)
})

router.put('/cunox/:path*', async (req: IRequest, env: Env) => {
  const path = decodeURIComponent(req.params.path || '')
  const contentType = req.headers.get('content-type') || 'application/octet-stream'
  const data = await req.arrayBuffer()
  return await handlePutCunoxFile(env, path, data, contentType)
})

router.delete('/cunox/:path*', async (req: IRequest, env: Env) => {
  const path = decodeURIComponent(req.params.path || '')
  return await handleDeleteCunoxFile(env, path)
})

router.post('/cunox/export', async () => {
  return { ok: false, error: 'UNSUPPORTED_IN_CF' }
})

router.post('/cunox/import', async () => {
  return { ok: false, error: 'UNSUPPORTED_IN_CF' }
})

router.post('/img/file-to-data-url', async (req: IRequest) => {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return error(400, { ok: false, error: 'no_file' })
  }
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  // Chunked base64 encoding: spreading `...bytes` into String.fromCharCode can
  // blow the call stack for large files (typically >~120KB), so we iterate in
  // 32KB chunks and concatenate into a single binary string for btoa().
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, Array.from(chunk) as number[])
  }
  const base64 = btoa(binary)
  const dataUrl = `data:${file.type};base64,${base64}`
  return { ok: true, dataUrl }
})

router.post('/dialog/select-image-file', async (req: IRequest, env: Env) => {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return error(400, { ok: false, error: 'no_file' })
  }
  const arrayBuffer = await file.arrayBuffer()
  const key = `images/${Date.now()}-${file.name}`
  await putCunoxFile(env, key, arrayBuffer, file.type)
  return { ok: true, fileUrl: `/cunox/${key}` }
})

router.post('/dialog/select-directory', async () => {
  return { ok: false, error: 'UNSUPPORTED_IN_CF' }
})

router.post('/dialog/select-cunox-export-file', async () => {
  return { ok: false, error: 'UNSUPPORTED_IN_CF' }
})

router.post('/dialog/select-cunox-import-file', async () => {
  return { ok: false, error: 'UNSUPPORTED_IN_CF' }
})

router.get('*', () => ({ ok: false, error: 'NOT_FOUND' }))
router.post('*', () => ({ ok: false, error: 'NOT_FOUND' }))
router.put('*', () => ({ ok: false, error: 'NOT_FOUND' }))
router.delete('*', () => ({ ok: false, error: 'NOT_FOUND' }))

// ---------------------------------------------------------------------------
// CORS support
// ---------------------------------------------------------------------------
// The frontend is served from a different origin than the API, so every
// response (including errors thrown by itty-router) must carry CORS headers.
// The allowed origin is configured via the `ALLOWED_ORIGIN` var in
// `wrangler.toml` and defaults to "*" for backward compatibility.
function corsHeaders(env: Env): Record<string, string> {
  const origin = (env as Env & { ALLOWED_ORIGIN?: string }).ALLOWED_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

const innerFetch = router.fetch

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Short-circuit preflight requests before they reach the router.
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env),
      })
    }

    const response = await innerFetch(request, env, ctx)

    // Clone the response headers and append the CORS headers so the original
    // body and status are preserved. This covers success responses, error
    // responses produced by itty-router, and our 404 fallbacks.
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(corsHeaders(env))) {
      headers.set(key, value)
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}
