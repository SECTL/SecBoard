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

router.get('/health', () => ({ ok: true, platform: 'cloudflare-workers' }))

router.get('/events', async (req: IRequest, env: Env) => {
  const since = Number(req.query.since) || 0
  return await handleGetEvents(env, since)
})

router.post('/rpc/post-command', async (req: IRequest, env: Env) => {
  const body = await req.json()
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
  const body = await req.json()
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
  const body = await req.json()
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

export default {
  fetch: router.fetch
}
