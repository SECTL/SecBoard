import { Elysia, t } from 'elysia'
import type { PlatformAdapters, EventItem } from './adapters'

export function createCoreApp(adapters: PlatformAdapters) {
  const { storage, events } = adapters

  const app = new Elysia({ name: 'secboard-core' })

  app.get('/health', () => ({ ok: true, platform: 'unknown' }))

  app.get('/events', ({ query }) => {
    const since = Number(query.since) || 0
    return events.getEvents(since)
  })

  app.get('/kv/:key', async ({ params }) => {
    const key = decodeURIComponent(params.key)
    if (!key) return { ok: false, error: 'BAD_KEY' }
    try {
      const value = await storage.get(key)
      return { ok: true, value }
    } catch {
      return { ok: false, error: 'kv_not_found' }
    }
  })

  app.put('/kv/:key', async ({ params, body }) => {
    const key = decodeURIComponent(params.key)
    if (!key) return { ok: false, error: 'BAD_KEY' }
    await storage.put(key, (body as any)?.value)
    events.emit('KV_PUT', { key })
    return { ok: true }
  })

  app.delete('/kv/:key', async ({ params }) => {
    const key = decodeURIComponent(params.key)
    if (!key) return { ok: false, error: 'BAD_KEY' }
    await storage.delete(key)
    return { ok: true }
  })

  app.get('/ui/:windowId', async ({ params }) => {
    const windowId = decodeURIComponent(params.windowId)
    if (!windowId) return { ok: false, error: 'BAD_WINDOW_ID' }
    try {
      const state = await storage.get(`ui:state:${windowId}`)
      return { ok: true, state: state || {} }
    } catch {
      return { ok: true, state: {} }
    }
  })

  app.put('/ui/:windowId/:key', async ({ params, body }) => {
    const windowId = decodeURIComponent(params.windowId)
    const key = decodeURIComponent(params.key)
    if (!windowId || !key) return { ok: false, error: 'BAD_UI_STATE_KEY' }
    
    const stateKey = `ui:state:${windowId}`
    const currentState = (await storage.get(stateKey)) as Record<string, unknown> || {}
    const nextState = { ...currentState, [key]: (body as any)?.value }
    await storage.put(stateKey, nextState)
    
    events.emit('UI_STATE_PUT', { windowId, key, value: (body as any)?.value })
    return { ok: true }
  })

  app.delete('/ui/:windowId/:key', async ({ params }) => {
    const windowId = decodeURIComponent(params.windowId)
    const key = decodeURIComponent(params.key)
    if (!windowId || !key) return { ok: false, error: 'BAD_UI_STATE_KEY' }
    
    const stateKey = `ui:state:${windowId}`
    const currentState = (await storage.get(stateKey)) as Record<string, unknown> || {}
    const { [key]: _drop, ...nextState } = currentState
    await storage.put(stateKey, nextState)
    
    events.emit('UI_STATE_DEL', { windowId, key })
    return { ok: true }
  })

  app.get('/ui-state/:windowId', async ({ params }) => {
    const windowId = decodeURIComponent(params.windowId)
    if (!windowId) return { ok: false, error: 'BAD_WINDOW_ID' }
    try {
      const state = await storage.get(`ui:state:${windowId}`)
      return { ok: true, state: state || {} }
    } catch {
      return { ok: true, state: {} }
    }
  })

  app.put('/ui-state/:windowId/:key', async ({ params, body }) => {
    const windowId = decodeURIComponent(params.windowId)
    const key = decodeURIComponent(params.key)
    if (!windowId || !key) return { ok: false, error: 'BAD_UI_STATE_KEY' }
    
    const stateKey = `ui:state:${windowId}`
    const currentState = (await storage.get(stateKey)) as Record<string, unknown> || {}
    const nextState = { ...currentState, [key]: (body as any)?.value }
    await storage.put(stateKey, nextState)
    
    events.emit('UI_STATE_PUT', { windowId, key, value: (body as any)?.value })
    return { ok: true }
  })

  app.delete('/ui-state/:windowId/:key', async ({ params }) => {
    const windowId = decodeURIComponent(params.windowId)
    const key = decodeURIComponent(params.key)
    if (!windowId || !key) return { ok: false, error: 'BAD_UI_STATE_KEY' }
    
    const stateKey = `ui:state:${windowId}`
    const currentState = (await storage.get(stateKey)) as Record<string, unknown> || {}
    const { [key]: _drop, ...nextState } = currentState
    await storage.put(stateKey, nextState)
    
    events.emit('UI_STATE_DEL', { windowId, key })
    return { ok: true }
  })

  app.post('/rpc/post-command', async ({ body }) => {
    const command = String((body as any)?.command || '')
    if (!command) return { ok: false, error: 'BAD_COMMAND' }
    
    events.emit('COMMAND', { command, payload: (body as any)?.payload })
    
    return { ok: true }
  })

  app.post('/commands', async ({ body }) => {
    const command = String((body as any)?.command || '')
    if (!command) return { ok: false, error: 'BAD_COMMAND' }
    
    events.emit('COMMAND', { command, payload: (body as any)?.payload })
    
    return { ok: true }
  })

  return app
}

export type CoreApp = ReturnType<typeof createCoreApp>
