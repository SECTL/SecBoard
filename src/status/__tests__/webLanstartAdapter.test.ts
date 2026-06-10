import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  APP_MODE_UI_STATE_KEY,
  NOTES_PAGE_INDEX_UI_STATE_KEY,
  NOTES_PAGE_TOTAL_UI_STATE_KEY,
  PEN_COLOR_UI_STATE_KEY,
  PEN_THICKNESS_UI_STATE_KEY,
  PEN_TYPE_UI_STATE_KEY,
  TOOL_UI_STATE_KEY,
  UI_STATE_APP_WINDOW_ID,
  WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY,
  WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY,
  WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY,
  WHITEBOARD_BG_COLOR_UI_STATE_KEY,
  WHITEBOARD_CANVAS_PAGES_KV_KEY
} from '../keys'

describe('web lanstart adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unmock('../webLanstartAdapter')
    delete (window as any).lanstart
    delete (window as any).__lanstartWebAdapter

    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('indexeddb should not be used in this unit test')
      }
    })
  })

  it('handles pure frontend whiteboard commands through ui state', async () => {
    const kv = new Map<string, unknown>()
    const uiState = new Map<string, Record<string, unknown>>()
    const events: Array<{ id: number; type: string; payload?: unknown; ts: number }> = []
    let eventId = 0

    const { ensureWebLanstartAdapter } = await import('../webLanstartAdapter')

    class Store {
      result: any
      get(key: string) {
        const req: any = {}
        queueMicrotask(() => {
          req.result = uiState.has(key) ? { windowId: key, state: uiState.get(key) } : kv.has(key) ? { key, value: kv.get(key) } : undefined
          req.onsuccess?.()
        })
        return req
      }
      put(value: any) {
        const req: any = {}
        queueMicrotask(() => {
          if (value && typeof value.windowId === 'string') uiState.set(value.windowId, value.state)
          else if (value && typeof value.key === 'string') kv.set(value.key, value.value)
          req.onsuccess?.()
        })
        return req
      }
    }

    const db = {
      objectStoreNames: { contains: () => true },
      createObjectStore: () => undefined,
      transaction: () => ({ objectStore: () => new Store() })
    }

    vi.stubGlobal('indexedDB', {
      open: () => {
        const req: any = {}
        queueMicrotask(() => {
          req.result = db
          req.onsuccess?.()
        })
        return req
      }
    })

    vi.stubEnv('VITE_PURE_FRONTEND', 'true')
    ensureWebLanstartAdapter()
    const api = window.lanstart!

    await api.postCommand('settings.setAppMode', { mode: 'whiteboard' })
    await api.postCommand('app.setTool', { tool: 'pen' })
    await api.postCommand('app.setPenSettings', { type: 'highlighter', color: '#ff0000', thickness: 14 })
    await api.postCommand('toggle-subwindow', { kind: 'pen', placement: 'bottom' })
    await api.postCommand('app.newPage', {})
    await api.postCommand('app.togglePageThumbnailsMenu', {})
    await api.postCommand('settings.setWhiteboardBackground', { bgColor: '#95C459' })

    const state = await api.getUiState(UI_STATE_APP_WINDOW_ID)
    expect(state[APP_MODE_UI_STATE_KEY]).toBe('whiteboard')
    expect(state[TOOL_UI_STATE_KEY]).toBe('pen')
    expect(state[PEN_TYPE_UI_STATE_KEY]).toBe('highlighter')
    expect(state[PEN_COLOR_UI_STATE_KEY]).toBe('#ff0000')
    expect(state[PEN_THICKNESS_UI_STATE_KEY]).toBe(14)
    expect(state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY]).toBe('pen')
    expect(state[WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY]).toBe('bottom')
    expect(state[NOTES_PAGE_TOTAL_UI_STATE_KEY]).toBe(2)
    expect(state[NOTES_PAGE_INDEX_UI_STATE_KEY]).toBe(1)
    expect(state[WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY]).toBe(true)
    expect(state[WHITEBOARD_BG_COLOR_UI_STATE_KEY]).toBe('#95C459')
    expect(await api.getKv('notes-page-total:whiteboard')).toBe(2)
    expect(await api.getKv('notes-page-index:whiteboard')).toBe(1)
    expect(await api.getKv(WHITEBOARD_CANVAS_PAGES_KV_KEY)).toMatchObject({ version: 1 })

    const eventResult = await api.getEvents(0)
    events.push(...eventResult.items)
    expect(events.some((event) => event.type === 'UI_STATE_PUT')).toBe(true)
    expect(events.some((event) => event.type === 'KV_PUT')).toBe(true)
  })

  it('migrates missing page kv from persisted annotation notes', async () => {
    const kv = new Map<string, unknown>()
    const uiState = new Map<string, Record<string, unknown>>()

    class Store {
      get(key: string) {
        const req: any = {}
        queueMicrotask(() => {
          req.result = uiState.has(key) ? { windowId: key, state: uiState.get(key) } : kv.has(key) ? { key, value: kv.get(key) } : undefined
          req.onsuccess?.()
        })
        return req
      }
      put(value: any) {
        const req: any = {}
        queueMicrotask(() => {
          if (value && typeof value.windowId === 'string') uiState.set(value.windowId, value.state)
          else if (value && typeof value.key === 'string') kv.set(value.key, value.value)
          req.onsuccess?.()
        })
        return req
      }
    }

    const db = {
      objectStoreNames: { contains: () => true },
      createObjectStore: () => undefined,
      transaction: () => ({ objectStore: () => new Store() })
    }

    vi.stubGlobal('indexedDB', {
      open: () => {
        const req: any = {}
        queueMicrotask(() => {
          req.result = db
          req.onsuccess?.()
        })
        return req
      }
    })

    kv.set('annotation-notes-whiteboard', {
      version: 2,
      currentPage: 2,
      pages: [
        { version: 1, nodes: [] },
        { version: 1, nodes: [] },
        { version: 1, nodes: [] }
      ]
    })

    vi.stubEnv('VITE_PURE_FRONTEND', 'true')
    const { ensureWebLanstartAdapter } = await import('../webLanstartAdapter')
    ensureWebLanstartAdapter()
    const api = window.lanstart!

    await api.postCommand('settings.setAppMode', { mode: 'whiteboard' })

    const state = await api.getUiState(UI_STATE_APP_WINDOW_ID)
    expect(state[NOTES_PAGE_TOTAL_UI_STATE_KEY]).toBe(3)
    expect(state[NOTES_PAGE_INDEX_UI_STATE_KEY]).toBe(2)
    expect(await api.getKv('notes-page-total:whiteboard')).toBe(3)
    expect(await api.getKv('notes-page-index:whiteboard')).toBe(2)
  })

  it('falls back to frontend ui state when backend endpoints fail', async () => {
    const kv = new Map<string, unknown>()
    const uiState = new Map<string, Record<string, unknown>>()

    class Store {
      get(key: string) {
        const req: any = {}
        queueMicrotask(() => {
          req.result = uiState.has(key) ? { windowId: key, state: uiState.get(key) } : kv.has(key) ? { key, value: kv.get(key) } : undefined
          req.onsuccess?.()
        })
        return req
      }
      put(value: any) {
        const req: any = {}
        queueMicrotask(() => {
          if (value && typeof value.windowId === 'string') uiState.set(value.windowId, value.state)
          else if (value && typeof value.key === 'string') kv.set(value.key, value.value)
          req.onsuccess?.()
        })
        return req
      }
    }

    const db = {
      objectStoreNames: { contains: () => true },
      createObjectStore: () => undefined,
      transaction: () => ({ objectStore: () => new Store() })
    }

    vi.stubGlobal('indexedDB', {
      open: () => {
        const req: any = {}
        queueMicrotask(() => {
          req.result = db
          req.onsuccess?.()
        })
        return req
      }
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'backend_down' }), { status: 500, headers: { 'content-type': 'application/json' } }))
    )
    vi.stubEnv('VITE_PURE_FRONTEND', 'false')
    const { ensureWebLanstartAdapter } = await import('../webLanstartAdapter')
    ensureWebLanstartAdapter()
    const api = window.lanstart!

    await api.postCommand('settings.setAppMode', { mode: 'whiteboard' })
    await api.postCommand('app.setTool', { tool: 'pen' })

    const state = await api.getUiState(UI_STATE_APP_WINDOW_ID)
    expect(state[APP_MODE_UI_STATE_KEY]).toBe('whiteboard')
    expect(state[TOOL_UI_STATE_KEY]).toBe('pen')

    const eventResult = await api.getEvents(0)
    expect(eventResult.items.some((event) => event.type === 'UI_STATE_PUT')).toBe(true)
  })
})
