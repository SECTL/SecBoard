import { Elysia, t } from 'elysia'
import type { PlatformAdapters, EventItem } from './adapters'
import { createApiV1 } from '../../src/elysia/apiV1'
import {
  DEFAULT_SECBOARD_SETTINGS,
  annotationKeyForMode,
  type AnnotationBookV2,
  type AppMode,
  type SecBoardSettingsPatch,
  type SecBoardSettingsV1
} from '../../src/api/contracts'

export function createCoreApp(adapters: PlatformAdapters) {
  const { storage, events } = adapters

  const read = async <T>(key: string, fallback: T): Promise<T> => {
    try {
      return ((await storage.get(key)) ?? fallback) as T
    } catch {
      return fallback
    }
  }

  const unwrap = (value: unknown): unknown => value && typeof value === 'object' && 'value' in value
    ? (value as { value: unknown }).value
    : value

  const readSettings = async (): Promise<SecBoardSettingsV1> => {
    const appearance = unwrap(await read('app-appearance', 'light'))
    const color = unwrap(await read('whiteboard-bg-color', '#ffffff'))
    const image = unwrap(await read('whiteboard-bg-image-url', ''))
    const opacity = Number(unwrap(await read('whiteboard-bg-image-opacity', 0.5)))
    const merge = unwrap(await read('video-show-merge-layers', true))
    const leafer = await read<Record<string, unknown>>('leafer-settings', {})
    return {
      version: 1,
      appearance: appearance === 'dark' ? 'dark' : 'light',
      writingEngine: 'leafer',
      leafer: { ...DEFAULT_SECBOARD_SETTINGS.leafer, ...leafer },
      whiteboard: {
        backgroundColor: typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#ffffff',
        backgroundImageUrl: typeof image === 'string' ? image : '',
        backgroundImageOpacity: Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 0.5
      },
      videoShow: { mergeLayers: typeof merge === 'boolean' ? merge : true }
    }
  }

  const patchSettings = async (patch: SecBoardSettingsPatch): Promise<SecBoardSettingsV1> => {
    const current = await readSettings()
    const next: SecBoardSettingsV1 = {
      ...current,
      ...patch,
      version: 1,
      writingEngine: 'leafer',
      leafer: { ...current.leafer, ...patch.leafer },
      whiteboard: { ...current.whiteboard, ...patch.whiteboard },
      videoShow: { ...current.videoShow, ...patch.videoShow }
    }
    const values: Array<[string, unknown]> = [
      ['app-appearance', next.appearance],
      ['writing-framework', 'leafer'],
      ['leafer-settings', next.leafer],
      ['whiteboard-bg-color', next.whiteboard.backgroundColor],
      ['whiteboard-bg-image-url', next.whiteboard.backgroundImageUrl],
      ['whiteboard-bg-image-opacity', next.whiteboard.backgroundImageOpacity],
      ['video-show-merge-layers', next.videoShow.mergeLayers]
    ]
    await Promise.all(values.map(([key, value]) => storage.put(key, value)))
    values.forEach(([key]) => events.emit('KV_PUT', { key }))
    return next
  }

  const app = new Elysia({ name: 'secboard-core' })
    .onAfterHandle(({ request, set }) => {
      const path = new URL(request.url).pathname
      if (/^\/(?:kv|ui|ui-state)(?:\/|$)/.test(path) || path === '/commands' || path === '/rpc/post-command') {
        set.headers.Deprecation = 'true'
        set.headers.Link = '</api/v1>; rel="successor-version"'
      }
    })
    .use(createApiV1({
    readSettings,
    patchSettings,
    readAnnotations: async (mode: AppMode) => {
      try {
        return await storage.get(annotationKeyForMode(mode)) as AnnotationBookV2
      } catch {
        return null
      }
    },
    writeAnnotations: async (mode: AppMode, book: AnnotationBookV2) => {
      const key = annotationKeyForMode(mode)
      await storage.put(key, book)
      events.emit('KV_PUT', { key })
    },
    readEvents: (since: number) => events.getEvents(since),
    executeSystemCommand: async (request) => {
      events.emit('SYSTEM_COMMAND', request)
      return { accepted: true }
    }
    }))

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
