function getApiBaseUrl(): string {
  const envBase = (import.meta as any)?.env?.VITE_LANSTART_API_BASE
  if (envBase) {
    const raw = String(envBase)
    return raw.endsWith('/') ? raw.slice(0, -1) : raw
  }
  return import.meta.env.DEV ? '' : 'http://127.0.0.1:3131'
}

export function isPureFrontendMode(): boolean {
  return (import.meta as any)?.env?.VITE_PURE_FRONTEND === true
}

async function parseApiResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      return await res.json()
    } catch {
      return null
    }
  }
  return await res.text()
}

function pickImageAsDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('no_file_selected'))
        return
      }
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('file_read_failed'))
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : ''
        if (!dataUrl) {
          reject(new Error('file_read_failed'))
          return
        }
        resolve(dataUrl)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

const DB_NAME = 'secboard-frontend'
const DB_VERSION = 1
const KV_STORE = 'kv'
const UI_STATE_STORE = 'uiState'

type FrontendEventItem = {
  id: number
  type: string
  payload?: unknown
  ts: number
}

type EventListener = (item: FrontendEventItem) => void

class FrontendEventBus {
  private eventId = 0
  private listeners: Set<EventListener> = new Set()
  private eventHistory: FrontendEventItem[] = []
  private maxHistorySize = 1000

  emit(type: string, payload?: unknown): void {
    const item: FrontendEventItem = {
      id: ++this.eventId,
      type,
      payload,
      ts: Date.now()
    }
    this.eventHistory.push(item)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize)
    }
    this.listeners.forEach((listener) => {
      try {
        listener(item)
      } catch {}
    })
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getEventsSince(since: number): { items: FrontendEventItem[]; latest: number } {
    const items = this.eventHistory.filter((item) => item.id > since)
    const latest = this.eventHistory.length > 0 ? this.eventHistory[this.eventHistory.length - 1].id : since
    return { items, latest }
  }
}

class FrontendIndexedDBStorage {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('indexeddb_open_failed'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(KV_STORE)) {
          db.createObjectStore(KV_STORE, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(UI_STATE_STORE)) {
          db.createObjectStore(UI_STATE_STORE, { keyPath: 'windowId' })
        }
      }
    })

    return this.dbPromise
  }

  async getKv(key: string): Promise<unknown> {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KV_STORE, 'readonly')
      const store = tx.objectStore(KV_STORE)
      const request = store.get(key)

      request.onerror = () => reject(new Error('kv_get_failed'))
      request.onsuccess = () => {
        const result = request.result
        if (result && 'value' in result) {
          resolve(result.value)
        } else {
          reject(new Error('kv_not_found'))
        }
      }
    })
  }

  async putKv(key: string, value: unknown): Promise<void> {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KV_STORE, 'readwrite')
      const store = tx.objectStore(KV_STORE)
      const request = store.put({ key, value })

      request.onerror = () => reject(new Error('kv_put_failed'))
      request.onsuccess = () => resolve()
    })
  }

  async getUiState(windowId: string): Promise<Record<string, unknown>> {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(UI_STATE_STORE, 'readonly')
      const store = tx.objectStore(UI_STATE_STORE)
      const request = store.get(windowId)

      request.onerror = () => reject(new Error('ui_state_get_failed'))
      request.onsuccess = () => {
        const result = request.result
        if (result && 'state' in result) {
          resolve(result.state as Record<string, unknown>)
        } else {
          resolve({})
        }
      }
    })
  }

  async putUiStateKey(windowId: string, key: string, value: unknown): Promise<void> {
    const db = await this.openDB()
    const currentState = await this.getUiState(windowId)
    const newState = { ...currentState, [key]: value }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(UI_STATE_STORE, 'readwrite')
      const store = tx.objectStore(UI_STATE_STORE)
      const request = store.put({ windowId, state: newState })

      request.onerror = () => reject(new Error('ui_state_put_failed'))
      request.onsuccess = () => resolve()
    })
  }

  async deleteUiStateKey(windowId: string, key: string): Promise<void> {
    const db = await this.openDB()
    const currentState = await this.getUiState(windowId)

    if (!(key in currentState)) {
      return
    }

    const newState = { ...currentState }
    delete (newState as any)[key]

    return new Promise((resolve, reject) => {
      const tx = db.transaction(UI_STATE_STORE, 'readwrite')
      const store = tx.objectStore(UI_STATE_STORE)
      const request = store.put({ windowId, state: newState })

      request.onerror = () => reject(new Error('ui_state_delete_failed'))
      request.onsuccess = () => resolve()
    })
  }
}

let globalEventBus: FrontendEventBus | null = null
let globalStorage: FrontendIndexedDBStorage | null = null

function getFrontendEventBus(): FrontendEventBus {
  if (!globalEventBus) {
    globalEventBus = new FrontendEventBus()
  }
  return globalEventBus
}

function getFrontendStorage(): FrontendIndexedDBStorage {
  if (!globalStorage) {
    globalStorage = new FrontendIndexedDBStorage()
  }
  return globalStorage
}

function createPureFrontendAdapter(): NonNullable<Window['lanstart']> {
  const eventBus = getFrontendEventBus()
  const storage = getFrontendStorage()
  let zoomLevel = 0

  return {
    postCommand: async (command: string, payload?: unknown) => {
      eventBus.emit('COMMAND', { command, payload })
      return null
    },
    getEvents: async (since: number) => {
      return eventBus.getEventsSince(since)
    },
    getKv: async (key: string) => {
      return storage.getKv(key)
    },
    putKv: async (key: string, value: unknown) => {
      await storage.putKv(key, value)
      return null
    },
    getUiState: async (windowId: string) => {
      return storage.getUiState(windowId)
    },
    putUiStateKey: async (windowId: string, key: string, value: unknown) => {
      await storage.putUiStateKey(windowId, key, value)
      eventBus.emit('UI_STATE_PUT', { windowId, key, value })
      return null
    },
    deleteUiStateKey: async (windowId: string, key: string) => {
      await storage.deleteUiStateKey(windowId, key)
      eventBus.emit('UI_STATE_DEL', { windowId, key })
      return null
    },
    apiRequest: async (input: { method: string; path: string; body?: unknown }) => {
      const method = String(input?.method ?? 'GET').toUpperCase()
      const path = String(input?.path ?? '')
      const body = input?.body

      if (method === 'POST' && path === '/dialog/select-image-file') {
        try {
          const dataUrl = await pickImageAsDataUrl()
          return { status: 200, body: { ok: true, fileUrl: dataUrl } }
        } catch (e) {
          return { status: 400, body: { ok: false, error: String(e) } }
        }
      }

      if (method === 'POST' && path === '/img/file-to-data-url') {
        const fileUrl = typeof (body as any)?.fileUrl === 'string' ? String((body as any).fileUrl) : ''
        if (fileUrl.startsWith('data:')) return { status: 200, body: { ok: true, dataUrl: fileUrl } }
      }

      return { status: 501, body: { ok: false, error: 'not_implemented_in_pure_frontend_mode' } }
    },
    clipboardWriteText: async (text: string) => {
      await navigator.clipboard?.writeText?.(text)
      return null
    },
    getToolbarNoticeKind: async () => '',
    setToolbarNoticeVisible: async (_input: { visible: boolean; kind?: string }) => null,
    setToolbarNoticeBounds: async (_input: { width: number; height: number }) => null,
    restartBackendAll: async () => null,
    setZoomLevel: (level: number) => {
      zoomLevel = Number.isFinite(level) ? level : 0
    },
    getZoomLevel: () => zoomLevel
  }
}

export function ensureWebLanstartAdapter(): void {
  if (typeof window === 'undefined') return
  if (window.lanstart) return

  const w = window as any
  if (w.__lanstartWebAdapter) {
    window.lanstart = w.__lanstartWebAdapter
    return
  }

  if (isPureFrontendMode()) {
    const api = createPureFrontendAdapter()
    w.__lanstartWebAdapter = api
    window.lanstart = api
    return
  }

  const apiBase = getApiBaseUrl()
  let zoomLevel = 0

  const api: NonNullable<Window['lanstart']> = {
    postCommand: async (command: string, payload?: unknown) => {
      const res = await fetch(`${apiBase}/rpc/post-command`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command, payload })
      })
      const body = (await parseApiResponse(res)) as any
      if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'post_command_failed'))
      return null
    },
    getEvents: async (since: number) => {
      const s = Number.isFinite(Number(since)) ? Math.max(0, Math.floor(Number(since))) : 0
      const res = await fetch(`${apiBase}/events?since=${encodeURIComponent(String(s))}`, { method: 'GET' })
      const body = (await parseApiResponse(res)) as any
      if (!res.ok || body?.ok !== true) return { items: [], latest: s }
      const items = Array.isArray(body?.items) ? body.items : []
      const latest = Number.isFinite(Number(body?.latest)) ? Number(body.latest) : s
      return { items, latest }
    },
    getKv: async (key: string) => {
      const res = await fetch(`${apiBase}/kv/${encodeURIComponent(key)}`, { method: 'GET' })
      const body = (await parseApiResponse(res)) as any
      if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'kv_not_found'))
      return body?.value
    },
    putKv: async (key: string, value: unknown) => {
      const res = await fetch(`${apiBase}/kv/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value })
      })
      const body = (await parseApiResponse(res)) as any
      if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'kv_put_failed'))
      return null
    },
    getUiState: async (windowId: string) => {
      const res = await fetch(`${apiBase}/ui/${encodeURIComponent(windowId)}`, { method: 'GET' })
      const body = (await parseApiResponse(res)) as any
      if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'ui_state_get_failed'))
      const state = body?.state
      return state && typeof state === 'object' ? (state as Record<string, unknown>) : {}
    },
    putUiStateKey: async (windowId: string, key: string, value: unknown) => {
      const res = await fetch(`${apiBase}/ui/${encodeURIComponent(windowId)}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value })
      })
      const body = (await parseApiResponse(res)) as any
      if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'ui_state_put_failed'))
      return null
    },
    deleteUiStateKey: async (windowId: string, key: string) => {
      const res = await fetch(`${apiBase}/ui/${encodeURIComponent(windowId)}/${encodeURIComponent(key)}`, { method: 'DELETE' })
      const body = (await parseApiResponse(res)) as any
      if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'ui_state_delete_failed'))
      return null
    },
    apiRequest: async (input: { method: string; path: string; body?: unknown }) => {
      const method = String(input?.method ?? 'GET').toUpperCase()
      const path = String(input?.path ?? '')
      const body = input?.body

      if (method === 'POST' && path === '/dialog/select-image-file') {
        try {
          const dataUrl = await pickImageAsDataUrl()
          return { status: 200, body: { ok: true, fileUrl: dataUrl } }
        } catch (e) {
          return { status: 400, body: { ok: false, error: String(e) } }
        }
      }

      if (method === 'POST' && path === '/img/file-to-data-url') {
        const fileUrl = typeof (body as any)?.fileUrl === 'string' ? String((body as any).fileUrl) : ''
        if (fileUrl.startsWith('data:')) return { status: 200, body: { ok: true, dataUrl: fileUrl } }
      }

      const headers: Record<string, string> = {}
      let payload: BodyInit | undefined
      if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
        headers['content-type'] = 'application/json'
        payload = JSON.stringify(body)
      }
      const res = await fetch(`${apiBase}${path}`, { method, headers, body: payload })
      return { status: res.status, body: await parseApiResponse(res) }
    },
    clipboardWriteText: async (text: string) => {
      await navigator.clipboard?.writeText?.(text)
      return null
    },
    getToolbarNoticeKind: async () => '',
    setToolbarNoticeVisible: async (_input: { visible: boolean; kind?: string }) => null,
    setToolbarNoticeBounds: async (_input: { width: number; height: number }) => null,
    restartBackendAll: async () => null,
    setZoomLevel: (level: number) => {
      zoomLevel = Number.isFinite(level) ? level : 0
    },
    getZoomLevel: () => zoomLevel
  }

  w.__lanstartWebAdapter = api
  window.lanstart = api
}

export function getFrontendEventBusInstance(): FrontendEventBus | null {
  return globalEventBus
}
