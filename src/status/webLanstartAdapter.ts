import {
  APP_MODE_KV_KEY,
  APP_MODE_UI_STATE_KEY,
  APPEARANCE_KV_KEY,
  APPEARANCE_UI_STATE_KEY,
  CLEAR_PAGE_REV_UI_STATE_KEY,
  EFFECTIVE_WRITING_BACKEND_UI_STATE_KEY,
  ERASER_SETTINGS_KV_KEY,
  ERASER_THICKNESS_UI_STATE_KEY,
  ERASER_TYPE_UI_STATE_KEY,
  NOTICE_KIND_UI_STATE_KEY,
  NOTES_PAGE_INDEX_UI_STATE_KEY,
  NOTES_PAGE_TOTAL_UI_STATE_KEY,
  PEN_COLOR_UI_STATE_KEY,
  PEN_SETTINGS_KV_KEY,
  PEN_THICKNESS_UI_STATE_KEY,
  PEN_TYPE_UI_STATE_KEY,
  REDO_REV_UI_STATE_KEY,
  TOOL_UI_STATE_KEY,
  UI_STATE_APP_WINDOW_ID,
  UNDO_REV_UI_STATE_KEY,
  VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY,
  VIDEO_SHOW_MERGE_LAYERS_KV_KEY,
  VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY,
  VIDEO_SHOW_PAGES_KV_KEY,
  WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY,
  WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY,
  WEB_SETTINGS_VISIBLE_UI_STATE_KEY,
  WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY,
  WHITEBOARD_BG_COLOR_KV_KEY,
  WHITEBOARD_BG_COLOR_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_URL_KV_KEY,
  WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY,
  WHITEBOARD_CANVAS_PAGES_KV_KEY,
  WRITING_FRAMEWORK_KV_KEY,
  WRITING_FRAMEWORK_UI_STATE_KEY,
  isAppearance,
  isAppMode,
  isFileOrDataUrl,
  isHexColor,
  isWritingFramework,
  type AppMode,
  type WritingFramework
} from './keys'

function getApiBaseUrl(): string {
  const envBase = String((import.meta as any)?.env?.VITE_LANSTART_API_BASE ?? '').trim()
  if (envBase) {
    return envBase.endsWith('/') ? envBase.slice(0, -1) : envBase
  }
  return ''
}

function getApiAuthHeaders(): Record<string, string> {
  const token = String((import.meta as any)?.env?.VITE_LANSTART_API_TOKEN ?? '').trim()
  if (!token) return {}
  return { authorization: `Bearer ${token}` }
}

const API_FALLBACK_TIMEOUT_MS = 900

async function fetchApiWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), API_FALLBACK_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(id)
  }
}

export function isPureFrontendMode(): boolean {
  const raw = (import.meta as any)?.env?.VITE_PURE_FRONTEND
  return raw === true || raw === 'true' || raw === '1'
}

function hasLanstartApi(value: unknown): value is NonNullable<Window['lanstart']> {
  const api = value as Partial<NonNullable<Window['lanstart']>> | null | undefined
  return (
    !!api &&
    typeof api === 'object' &&
    typeof api.postCommand === 'function' &&
    typeof api.getEvents === 'function' &&
    typeof api.getKv === 'function' &&
    typeof api.putKv === 'function' &&
    typeof api.getUiState === 'function'
  )
}

function isTestLanstartEnvironment(): boolean {
  const g = globalThis as any
  if (g.__vitest_worker__ || g.__vitest_mocker__ || g.__vitest_index__ || g.vi) return true
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return /\bjsdom\b/i.test(userAgent)
}

function shouldPreserveExistingLanstart(existing: unknown): boolean {
  if (!hasLanstartApi(existing)) return false
  if ((existing as any).__secboardWebAdapter) return true
  if (!import.meta.env.DEV && !isPureFrontendMode()) return true
  return isTestLanstartEnvironment()
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

  async putUiState(windowId: string, state: Record<string, unknown>): Promise<void> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(UI_STATE_STORE, 'readwrite')
      const store = tx.objectStore(UI_STATE_STORE)
      const request = store.put({ windowId, state })

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

type WhiteboardCanvasPageV1 = { bgColor?: string; bgImageUrl?: string; bgImageOpacity?: number }
type WhiteboardCanvasBookV1 = { version: 1; pages: WhiteboardCanvasPageV1[] }
type VideoShowPageV1 = { name?: string; imageUrl?: string; createdAt?: number }
type VideoShowPageBookV1 = { version: 1; pages: VideoShowPageV1[] }
type PersistedAnnotationBookV2 = { version: 2; currentPage: number; pages: unknown[] }

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isLocalFirstCommand(command: string): boolean {
  if (command === 'toggle-subwindow') return true
  const dot = command.indexOf('.')
  if (dot <= 0) return false
  const scope = command.slice(0, dot)
  if (scope === 'app' || scope === 'settings' || scope === 'notes') return true
  if (scope !== 'win') return false
  const action = command.slice(dot + 1)
  return action === 'toggleSubwindow' || action === 'setNoticeVisible'
}

function coercePageIndexTotal(state: Record<string, unknown>): { index: number; total: number } {
  const totalRaw = Number(state[NOTES_PAGE_TOTAL_UI_STATE_KEY])
  const total = Number.isFinite(totalRaw) && totalRaw >= 1 ? Math.min(2000, Math.floor(totalRaw)) : 1
  const indexRaw = Number(state[NOTES_PAGE_INDEX_UI_STATE_KEY])
  const index = Number.isFinite(indexRaw) ? Math.floor(indexRaw) : 0
  return { index: Math.max(0, Math.min(total - 1, index)), total }
}

function coerceOpacity(value: unknown, fallback = 0.5): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback
}

function isWhiteboardCanvasBookV1(value: unknown): value is WhiteboardCanvasBookV1 {
  if (!value || typeof value !== 'object') return false
  const book = value as any
  return book.version === 1 && Array.isArray(book.pages)
}

function isVideoShowPageBookV1(value: unknown): value is VideoShowPageBookV1 {
  if (!value || typeof value !== 'object') return false
  const book = value as any
  return book.version === 1 && Array.isArray(book.pages)
}

function isPersistedAnnotationBookV2(value: unknown): value is PersistedAnnotationBookV2 {
  if (!value || typeof value !== 'object') return false
  const book = value as any
  return book.version === 2 && Array.isArray(book.pages) && Number.isFinite(Number(book.currentPage))
}

function annotationNotesKvKeyForMode(mode: AppMode): string {
  return mode === 'whiteboard'
    ? 'annotation-notes-whiteboard'
    : mode === 'video-show'
      ? 'annotation-notes-video-show'
      : 'annotation-notes-toolbar'
}

function putStateValue(
  state: Record<string, unknown>,
  patches: Array<{ key: string; value: unknown }>,
  key: string,
  value: unknown
): void {
  if (state[key] === value) return
  state[key] = value
  patches.push({ key, value })
}

async function putKvAndEmit(
  storage: FrontendIndexedDBStorage,
  eventBus: FrontendEventBus,
  key: string,
  value: unknown
): Promise<void> {
  await storage.putKv(key, value)
  eventBus.emit('KV_PUT', { key })
}

async function flushUiStatePatches(
  storage: FrontendIndexedDBStorage,
  eventBus: FrontendEventBus,
  state: Record<string, unknown>,
  patches: Array<{ key: string; value: unknown }>,
  deletes?: string[]
): Promise<void> {
  await storage.putUiState(UI_STATE_APP_WINDOW_ID, state)
  for (const patch of patches) {
    eventBus.emit('UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: patch.key, value: patch.value })
  }
  for (const key of deletes ?? []) {
    eventBus.emit('UI_STATE_DEL', { windowId: UI_STATE_APP_WINDOW_ID, key })
  }
}

async function getDefaultWhiteboardBackground(storage: FrontendIndexedDBStorage): Promise<{
  bgColor: string
  bgImageUrl: string
  bgImageOpacity: number
}> {
  let bgColor = '#ffffff'
  let bgImageUrl = ''
  let bgImageOpacity = 0.5
  try {
    const value = await storage.getKv(WHITEBOARD_BG_COLOR_KV_KEY)
    if (isHexColor(value)) bgColor = value
  } catch {}
  try {
    const value = await storage.getKv(WHITEBOARD_BG_IMAGE_URL_KV_KEY)
    if (isFileOrDataUrl(value)) bgImageUrl = value
  } catch {}
  try {
    bgImageOpacity = coerceOpacity(await storage.getKv(WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY), 0.5)
  } catch {}
  return { bgColor, bgImageUrl, bgImageOpacity }
}

async function ensureWhiteboardCanvasBookPersisted(args: {
  storage: FrontendIndexedDBStorage
  eventBus: FrontendEventBus
  total: number
  defaultBg: { bgColor: string; bgImageUrl: string; bgImageOpacity: number }
}): Promise<WhiteboardCanvasBookV1> {
  const total = Number.isFinite(args.total) ? Math.max(1, Math.min(2000, Math.floor(args.total))) : 1
  let book: WhiteboardCanvasBookV1 = { version: 1, pages: [] }
  let changed = false
  try {
    const loaded = await args.storage.getKv(WHITEBOARD_CANVAS_PAGES_KV_KEY)
    if (isWhiteboardCanvasBookV1(loaded)) book = { version: 1, pages: [...loaded.pages] }
  } catch {}

  if (book.pages.length < total) {
    changed = true
    while (book.pages.length < total) {
      book.pages.push({
        bgColor: args.defaultBg.bgColor,
        bgImageUrl: args.defaultBg.bgImageUrl,
        bgImageOpacity: args.defaultBg.bgImageOpacity
      })
    }
  } else if (book.pages.length > total) {
    changed = true
    book.pages.length = total
  }

  if (changed) await putKvAndEmit(args.storage, args.eventBus, WHITEBOARD_CANVAS_PAGES_KV_KEY, book)
  return book
}

async function applyWhiteboardBackgroundForPage(args: {
  storage: FrontendIndexedDBStorage
  eventBus: FrontendEventBus
  state: Record<string, unknown>
  patches: Array<{ key: string; value: unknown }>
  index: number
  total: number
}): Promise<void> {
  const modeRaw = args.state[APP_MODE_UI_STATE_KEY]
  const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'
  if (mode !== 'whiteboard') return

  const defaultBg = await getDefaultWhiteboardBackground(args.storage)
  const book = await ensureWhiteboardCanvasBookPersisted({
    storage: args.storage,
    eventBus: args.eventBus,
    total: args.total,
    defaultBg
  })
  const raw = book.pages[args.index]
  const page = {
    bgColor: typeof raw?.bgColor === 'string' ? raw.bgColor : defaultBg.bgColor,
    bgImageUrl: isFileOrDataUrl(raw?.bgImageUrl) ? String(raw?.bgImageUrl ?? '') : defaultBg.bgImageUrl,
    bgImageOpacity: coerceOpacity(raw?.bgImageOpacity, defaultBg.bgImageOpacity)
  }

  putStateValue(args.state, args.patches, WHITEBOARD_BG_COLOR_UI_STATE_KEY, page.bgColor)
  putStateValue(args.state, args.patches, WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY, page.bgImageUrl)
  putStateValue(args.state, args.patches, WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY, page.bgImageOpacity)
}

async function ensureVideoShowPageBookPersisted(args: {
  storage: FrontendIndexedDBStorage
  eventBus: FrontendEventBus
  photoTotal: number
}): Promise<VideoShowPageBookV1> {
  const photoTotal = Number.isFinite(args.photoTotal) ? Math.max(0, Math.min(1999, Math.floor(args.photoTotal))) : 0
  let book: VideoShowPageBookV1 = { version: 1, pages: [] }
  let changed = false
  try {
    const loaded = await args.storage.getKv(VIDEO_SHOW_PAGES_KV_KEY)
    if (isVideoShowPageBookV1(loaded)) book = { version: 1, pages: [...loaded.pages] }
  } catch {}

  if (book.pages.length < photoTotal) {
    changed = true
    while (book.pages.length < photoTotal) book.pages.push({ name: '', imageUrl: '', createdAt: 0 })
  } else if (book.pages.length > photoTotal) {
    changed = true
    book.pages.length = photoTotal
  }

  if (changed) await putKvAndEmit(args.storage, args.eventBus, VIDEO_SHOW_PAGES_KV_KEY, book)
  return book
}

function videoShowPhotoPageName(pageNo: number): string {
  return `Page ${Math.max(1, Math.floor(pageNo))}`
}

async function restoreNotesPageStateForMode(args: {
  storage: FrontendIndexedDBStorage
  eventBus: FrontendEventBus
  state: Record<string, unknown>
  patches: Array<{ key: string; value: unknown }>
  mode: AppMode
}): Promise<void> {
  let total = 1
  let index = 0
  let hasTotal = false
  let hasIndex = false
  try {
    total = Number(await args.storage.getKv(`notes-page-total:${args.mode}`))
    hasTotal = true
  } catch {}
  try {
    index = Number(await args.storage.getKv(`notes-page-index:${args.mode}`))
    hasIndex = true
  } catch {}
  if (!hasTotal || !hasIndex) {
    try {
      const notesBook = await args.storage.getKv(annotationNotesKvKeyForMode(args.mode))
      if (isPersistedAnnotationBookV2(notesBook)) {
        if (!hasTotal) total = notesBook.pages.length
        if (!hasIndex) index = Number(notesBook.currentPage)
      }
    } catch {}
  }
  total = Number.isFinite(total) ? Math.max(1, Math.min(2000, Math.floor(total))) : 1
  index = Number.isFinite(index) ? Math.max(0, Math.min(total - 1, Math.floor(index))) : 0
  if (!hasTotal || !hasIndex) {
    await persistPageStateForMode({ storage: args.storage, eventBus: args.eventBus, mode: args.mode, index, total })
  }
  putStateValue(args.state, args.patches, NOTES_PAGE_TOTAL_UI_STATE_KEY, total)
  putStateValue(args.state, args.patches, NOTES_PAGE_INDEX_UI_STATE_KEY, index)
  await applyWhiteboardBackgroundForPage({ ...args, index, total })
}

async function persistPageStateForMode(args: {
  storage: FrontendIndexedDBStorage
  eventBus: FrontendEventBus
  mode: AppMode
  index: number
  total: number
}): Promise<void> {
  const total = Number.isFinite(args.total) ? Math.max(1, Math.min(2000, Math.floor(args.total))) : 1
  const indexRaw = Number.isFinite(args.index) ? Math.floor(args.index) : 0
  const index = Math.max(0, Math.min(total - 1, indexRaw))
  await Promise.allSettled([
    putKvAndEmit(args.storage, args.eventBus, `notes-page-index:${args.mode}`, index),
    putKvAndEmit(args.storage, args.eventBus, `notes-page-total:${args.mode}`, total)
  ])
}

async function handlePureFrontendCommand(args: {
  command: string
  payload: unknown
  storage: FrontendIndexedDBStorage
  eventBus: FrontendEventBus
}): Promise<void> {
  const { command, payload, storage, eventBus } = args
  const state = await storage.getUiState(UI_STATE_APP_WINDOW_ID)
  const patches: Array<{ key: string; value: unknown }> = []
  const deletes: string[] = []

  const toggleSubwindow = async () => {
    const kind = coerceString((payload as any)?.kind)
    const placementRaw = coerceString((payload as any)?.placement)
    const placement = placementRaw === 'top' ? 'top' : 'bottom'
    if (!kind) return
    const currentKind = coerceString(state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY])
    if (currentKind === kind) {
      delete state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY]
      delete state[WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY]
      deletes.push(WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY, WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY)
    } else {
      putStateValue(state, patches, WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY, kind)
      putStateValue(state, patches, WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY, placement)
    }
  }

  const setPageIndex = async (desiredRaw: unknown) => {
    const { total } = coercePageIndexTotal(state)
    const desired = Number(desiredRaw)
    const nextIndex = Number.isFinite(desired) ? Math.max(0, Math.min(total - 1, Math.floor(desired))) : 0
    putStateValue(state, patches, NOTES_PAGE_TOTAL_UI_STATE_KEY, total)
    putStateValue(state, patches, NOTES_PAGE_INDEX_UI_STATE_KEY, nextIndex)
    const modeRaw = state[APP_MODE_UI_STATE_KEY]
    const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'
    await persistPageStateForMode({ storage, eventBus, mode, index: nextIndex, total })
    await applyWhiteboardBackgroundForPage({ storage, eventBus, state, patches, index: nextIndex, total })
  }

  const dot = command.indexOf('.')
  if (dot > 0) {
    const scope = command.slice(0, dot)
    const action = command.slice(dot + 1)

    if (scope === 'win') {
      if (action === 'toggleSubwindow') await toggleSubwindow()
      else if (action === 'setNoticeVisible') {
        const visible = Boolean((payload as any)?.visible)
        putStateValue(state, patches, NOTICE_KIND_UI_STATE_KEY, visible ? coerceString((payload as any)?.kind) || 'notice' : '')
      }
      await flushUiStatePatches(storage, eventBus, state, patches, deletes)
      return
    }

    if (scope === 'settings') {
      if (action === 'setAppearance') {
        const appearance = coerceString((payload as any)?.appearance)
        if (isAppearance(appearance)) {
          await putKvAndEmit(storage, eventBus, APPEARANCE_KV_KEY, appearance)
          putStateValue(state, patches, APPEARANCE_UI_STATE_KEY, appearance)
        }
      } else if (action === 'setAppMode') {
        const modeRaw = coerceString((payload as any)?.mode)
        if (isAppMode(modeRaw)) {
          const prevModeRaw = state[APP_MODE_UI_STATE_KEY]
          const prevMode = isAppMode(prevModeRaw) ? prevModeRaw : undefined
          if (prevMode && prevMode !== modeRaw) {
            const { index, total } = coercePageIndexTotal(state)
            await Promise.allSettled([
              putKvAndEmit(storage, eventBus, `notes-page-index:${prevMode}`, index),
              putKvAndEmit(storage, eventBus, `notes-page-total:${prevMode}`, total)
            ])
          }
          await putKvAndEmit(storage, eventBus, APP_MODE_KV_KEY, modeRaw)
          putStateValue(state, patches, APP_MODE_UI_STATE_KEY, modeRaw)
          await restoreNotesPageStateForMode({ storage, eventBus, state, patches, mode: modeRaw })
        }
      } else if (action === 'setWhiteboardBackground') {
        const nextColor = isHexColor((payload as any)?.bgColor) ? String((payload as any)?.bgColor) : undefined
        const nextImageUrl = isFileOrDataUrl((payload as any)?.bgImageUrl) ? String((payload as any)?.bgImageUrl ?? '') : undefined
        const nextOpacity =
          (payload as any)?.bgImageOpacity !== undefined ? coerceOpacity((payload as any)?.bgImageOpacity, 0.5) : undefined

        if (nextColor !== undefined) putStateValue(state, patches, WHITEBOARD_BG_COLOR_UI_STATE_KEY, nextColor)
        if (nextImageUrl !== undefined) putStateValue(state, patches, WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY, nextImageUrl)
        if (nextOpacity !== undefined) putStateValue(state, patches, WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY, nextOpacity)

        const modeRaw = state[APP_MODE_UI_STATE_KEY]
        const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'
        if (mode === 'whiteboard') {
          const { index, total } = coercePageIndexTotal(state)
          const defaultBg = await getDefaultWhiteboardBackground(storage)
          const book = await ensureWhiteboardCanvasBookPersisted({ storage, eventBus, total, defaultBg })
          const rawPage = book.pages[index]
          const current = {
            bgColor: typeof rawPage?.bgColor === 'string' ? rawPage.bgColor : defaultBg.bgColor,
            bgImageUrl: isFileOrDataUrl(rawPage?.bgImageUrl) ? String(rawPage?.bgImageUrl ?? '') : defaultBg.bgImageUrl,
            bgImageOpacity: coerceOpacity(rawPage?.bgImageOpacity, defaultBg.bgImageOpacity)
          }
          const nextPage = {
            bgColor: nextColor ?? current.bgColor,
            bgImageUrl: nextImageUrl ?? current.bgImageUrl,
            bgImageOpacity: nextOpacity ?? current.bgImageOpacity
          }
          book.pages[index] = nextPage
          await putKvAndEmit(storage, eventBus, WHITEBOARD_CANVAS_PAGES_KV_KEY, book)
        }

        if (nextColor !== undefined) await putKvAndEmit(storage, eventBus, WHITEBOARD_BG_COLOR_KV_KEY, nextColor)
        if (nextImageUrl !== undefined) await putKvAndEmit(storage, eventBus, WHITEBOARD_BG_IMAGE_URL_KV_KEY, nextImageUrl)
        if (nextOpacity !== undefined) await putKvAndEmit(storage, eventBus, WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY, nextOpacity)
      } else if (action === 'setVideoShowMergeLayers') {
        const enabled = Boolean((payload as any)?.enabled)
        await putKvAndEmit(storage, eventBus, VIDEO_SHOW_MERGE_LAYERS_KV_KEY, enabled)
        putStateValue(state, patches, VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY, enabled)
      }

      await flushUiStatePatches(storage, eventBus, state, patches, deletes)
      return
    }

    if (scope === 'app') {
      if (action === 'setTool') {
        const toolRaw = coerceString((payload as any)?.tool)
        const tool = toolRaw === 'pen' || toolRaw === 'eraser' ? toolRaw : 'mouse'
        putStateValue(state, patches, TOOL_UI_STATE_KEY, tool)
        const frameworkRaw = state[WRITING_FRAMEWORK_UI_STATE_KEY]
        const framework = isWritingFramework(frameworkRaw) ? frameworkRaw : ((await getPersistedWritingFramework(storage)) ?? 'leafer')
        putStateValue(state, patches, WRITING_FRAMEWORK_UI_STATE_KEY, framework)
        putStateValue(state, patches, EFFECTIVE_WRITING_BACKEND_UI_STATE_KEY, framework)
      } else if (action === 'setPenSettings') {
        const typeRaw = coerceString((payload as any)?.type)
        const type = typeRaw === 'highlighter' || typeRaw === 'laser' ? typeRaw : 'writing'
        const color = coerceString((payload as any)?.color) || '#333333'
        const thicknessRaw = Number((payload as any)?.thickness)
        const thickness = Number.isFinite(thicknessRaw) ? Math.max(1, Math.min(120, thicknessRaw)) : 6
        const settings = { type, color, thickness }
        await putKvAndEmit(storage, eventBus, PEN_SETTINGS_KV_KEY, settings)
        putStateValue(state, patches, PEN_TYPE_UI_STATE_KEY, type)
        putStateValue(state, patches, PEN_COLOR_UI_STATE_KEY, color)
        putStateValue(state, patches, PEN_THICKNESS_UI_STATE_KEY, thickness)
      } else if (action === 'setEraserSettings') {
        const typeRaw = coerceString((payload as any)?.type)
        const type = typeRaw === 'stroke' ? 'stroke' : 'pixel'
        const thicknessRaw = Number((payload as any)?.thickness)
        const thickness = Number.isFinite(thicknessRaw) ? Math.max(1, Math.min(240, thicknessRaw)) : 18
        const settings = { type, thickness }
        await putKvAndEmit(storage, eventBus, ERASER_SETTINGS_KV_KEY, settings)
        putStateValue(state, patches, ERASER_TYPE_UI_STATE_KEY, type)
        putStateValue(state, patches, ERASER_THICKNESS_UI_STATE_KEY, thickness)
      } else if (action === 'clearPage') {
        putStateValue(state, patches, CLEAR_PAGE_REV_UI_STATE_KEY, (Number(state[CLEAR_PAGE_REV_UI_STATE_KEY]) || 0) + 1)
      } else if (action === 'undo') {
        putStateValue(state, patches, UNDO_REV_UI_STATE_KEY, (Number(state[UNDO_REV_UI_STATE_KEY]) || 0) + 1)
      } else if (action === 'redo') {
        putStateValue(state, patches, REDO_REV_UI_STATE_KEY, (Number(state[REDO_REV_UI_STATE_KEY]) || 0) + 1)
      } else if (action === 'prevPage') {
        const { index, total } = coercePageIndexTotal(state)
        const nextIndex = Math.max(0, Math.min(total - 1, index - 1))
        putStateValue(state, patches, NOTES_PAGE_TOTAL_UI_STATE_KEY, total)
        putStateValue(state, patches, NOTES_PAGE_INDEX_UI_STATE_KEY, nextIndex)
        const modeRaw = state[APP_MODE_UI_STATE_KEY]
        const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'
        await persistPageStateForMode({ storage, eventBus, mode, index: nextIndex, total })
        await applyWhiteboardBackgroundForPage({ storage, eventBus, state, patches, index: nextIndex, total })
      } else if (action === 'nextPage') {
        const { index, total } = coercePageIndexTotal(state)
        const modeRaw = state[APP_MODE_UI_STATE_KEY]
        const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'
        const shouldAppend = mode === 'whiteboard' && index >= total - 1
        const nextTotal = shouldAppend ? Math.min(2000, total + 1) : total
        const nextIndex = shouldAppend ? nextTotal - 1 : Math.max(0, Math.min(total - 1, index + 1))
        putStateValue(state, patches, NOTES_PAGE_TOTAL_UI_STATE_KEY, nextTotal)
        putStateValue(state, patches, NOTES_PAGE_INDEX_UI_STATE_KEY, nextIndex)
        await persistPageStateForMode({ storage, eventBus, mode, index: nextIndex, total: nextTotal })
        await applyWhiteboardBackgroundForPage({ storage, eventBus, state, patches, index: nextIndex, total: nextTotal })
      } else if (action === 'newPage') {
        const { total } = coercePageIndexTotal(state)
        const modeRaw = state[APP_MODE_UI_STATE_KEY]
        const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'
        const nextTotal = Math.min(2000, Math.max(1, total) + 1)
        const nextIndex = nextTotal - 1
        putStateValue(state, patches, NOTES_PAGE_TOTAL_UI_STATE_KEY, nextTotal)
        putStateValue(state, patches, NOTES_PAGE_INDEX_UI_STATE_KEY, nextIndex)
        await persistPageStateForMode({ storage, eventBus, mode, index: nextIndex, total: nextTotal })
        if (mode === 'video-show') {
          const rev = Date.now()
          const photoTotal = Math.max(0, nextTotal - 1)
          const photoIndex = Math.max(0, nextIndex - 1)
          const name = videoShowPhotoPageName(nextIndex)
          const book = await ensureVideoShowPageBookPersisted({ storage, eventBus, photoTotal })
          book.pages[photoIndex] = { name, imageUrl: '', createdAt: rev }
          await putKvAndEmit(storage, eventBus, VIDEO_SHOW_PAGES_KV_KEY, book)
          putStateValue(state, patches, VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY, { rev, index: nextIndex, total: nextTotal, name })
        } else {
          await applyWhiteboardBackgroundForPage({ storage, eventBus, state, patches, index: nextIndex, total: nextTotal })
        }
      } else if (action === 'setPageIndex') {
        await setPageIndex((payload as any)?.index)
      } else if (action === 'togglePageThumbnailsMenu') {
        putStateValue(state, patches, WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY, !Boolean(state[WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY]))
      } else if (action === 'setWritingFramework') {
        const frameworkRaw = coerceString((payload as any)?.framework)
        if (isWritingFramework(frameworkRaw)) {
          await putKvAndEmit(storage, eventBus, WRITING_FRAMEWORK_KV_KEY, frameworkRaw)
          putStateValue(state, patches, WRITING_FRAMEWORK_UI_STATE_KEY, frameworkRaw)
        }
      } else if (action === 'openSettingsWindow') {
        putStateValue(state, patches, WEB_SETTINGS_VISIBLE_UI_STATE_KEY, true)
      } else if (action === 'closeSettingsWindow') {
        putStateValue(state, patches, WEB_SETTINGS_VISIBLE_UI_STATE_KEY, false)
      }

      await flushUiStatePatches(storage, eventBus, state, patches, deletes)
      return
    }

    if (scope === 'notes' && action === 'setPageIndex') {
      await setPageIndex((payload as any)?.index)
      await flushUiStatePatches(storage, eventBus, state, patches, deletes)
      return
    }

    await flushUiStatePatches(storage, eventBus, state, patches, deletes)
    return
  }

  if (command === 'toggle-subwindow') await toggleSubwindow()
  else if (command === 'set-appearance') {
    const appearance = coerceString((payload as any)?.appearance)
    if (isAppearance(appearance)) {
      await putKvAndEmit(storage, eventBus, APPEARANCE_KV_KEY, appearance)
      putStateValue(state, patches, APPEARANCE_UI_STATE_KEY, appearance)
    }
  }

  await flushUiStatePatches(storage, eventBus, state, patches, deletes)
}

async function getPersistedWritingFramework(storage: FrontendIndexedDBStorage): Promise<WritingFramework | undefined> {
  try {
    const value = await storage.getKv(WRITING_FRAMEWORK_KV_KEY)
    return isWritingFramework(value) ? value : undefined
  } catch {
    return undefined
  }
}

function createPureFrontendAdapter(): NonNullable<Window['lanstart']> {
  const eventBus = getFrontendEventBus()
  const storage = getFrontendStorage()
  let zoomLevel = 0

  return {
    postCommand: async (command: string, payload?: unknown) => {
      eventBus.emit('COMMAND', { command, payload })
      await handlePureFrontendCommand({ command, payload, storage, eventBus })
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
      eventBus.emit('KV_PUT', { key })
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

  const w = window as any
  const existing = window.lanstart as any
  if (shouldPreserveExistingLanstart(existing)) return

  if (w.__lanstartWebAdapter?.__secboardWebAdapter) {
    window.lanstart = w.__lanstartWebAdapter
    return
  }
  if (w.__lanstartWebAdapter) {
    delete w.__lanstartWebAdapter
  }

  if (isPureFrontendMode()) {
    const api = createPureFrontendAdapter()
    ;(api as any).__secboardWebAdapter = true
    w.__lanstartWebAdapter = api
    window.lanstart = api
    return
  }

  const apiBase = getApiBaseUrl()
  const authHeaders = getApiAuthHeaders()
  const fallbackEventBus = getFrontendEventBus()
  const fallbackStorage = getFrontendStorage()
  let zoomLevel = 0

  const runFallbackCommand = async (command: string, payload?: unknown) => {
    fallbackEventBus.emit('COMMAND', { command, payload })
    await handlePureFrontendCommand({ command, payload, storage: fallbackStorage, eventBus: fallbackEventBus })
    return null
  }

  const api: NonNullable<Window['lanstart']> = {
    postCommand: async (command: string, payload?: unknown) => {
      if (isLocalFirstCommand(command)) {
        return runFallbackCommand(command, payload)
      }
      try {
        const res = await fetchApiWithTimeout(`${apiBase}/rpc/post-command`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeaders },
          body: JSON.stringify({ command, payload })
        })
        const body = (await parseApiResponse(res)) as any
        if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'post_command_failed'))
        return null
      } catch {
        return runFallbackCommand(command, payload)
      }
    },
    getEvents: async (since: number) => {
      const s = Number.isFinite(Number(since)) ? Math.max(0, Math.floor(Number(since))) : 0
      try {
        const res = await fetchApiWithTimeout(`${apiBase}/events?since=${encodeURIComponent(String(s))}`, { method: 'GET', headers: { ...authHeaders } })
        const body = (await parseApiResponse(res)) as any
        if (!res.ok || body?.ok !== true) throw new Error('events_failed')
        const items = Array.isArray(body?.items) ? body.items : []
        const latest = Number.isFinite(Number(body?.latest)) ? Number(body.latest) : s
        return { items, latest }
      } catch {
        return fallbackEventBus.getEventsSince(s)
      }
    },
    getKv: async (key: string) => {
      try {
        const res = await fetchApiWithTimeout(`${apiBase}/kv/${encodeURIComponent(key)}`, { method: 'GET', headers: { ...authHeaders } })
        const body = (await parseApiResponse(res)) as any
        if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'kv_not_found'))
        return body?.value
      } catch {
        return fallbackStorage.getKv(key)
      }
    },
    putKv: async (key: string, value: unknown) => {
      try {
        const res = await fetchApiWithTimeout(`${apiBase}/kv/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json', ...authHeaders },
          body: JSON.stringify({ value })
        })
        const body = (await parseApiResponse(res)) as any
        if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'kv_put_failed'))
        return null
      } catch {
        await fallbackStorage.putKv(key, value)
        fallbackEventBus.emit('KV_PUT', { key })
      }
      return null
    },
    getUiState: async (windowId: string) => {
      try {
        const res = await fetchApiWithTimeout(`${apiBase}/ui/${encodeURIComponent(windowId)}`, { method: 'GET', headers: { ...authHeaders } })
        const body = (await parseApiResponse(res)) as any
        if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'ui_state_get_failed'))
        const state = body?.state
        return state && typeof state === 'object' ? (state as Record<string, unknown>) : {}
      } catch {
        return fallbackStorage.getUiState(windowId)
      }
    },
    putUiStateKey: async (windowId: string, key: string, value: unknown) => {
      try {
        const res = await fetchApiWithTimeout(`${apiBase}/ui/${encodeURIComponent(windowId)}/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json', ...authHeaders },
          body: JSON.stringify({ value })
        })
        const body = (await parseApiResponse(res)) as any
        if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'ui_state_put_failed'))
        return null
      } catch {
        await fallbackStorage.putUiStateKey(windowId, key, value)
        fallbackEventBus.emit('UI_STATE_PUT', { windowId, key, value })
      }
      return null
    },
    deleteUiStateKey: async (windowId: string, key: string) => {
      try {
        const res = await fetchApiWithTimeout(`${apiBase}/ui/${encodeURIComponent(windowId)}/${encodeURIComponent(key)}`, { method: 'DELETE', headers: { ...authHeaders } })
        const body = (await parseApiResponse(res)) as any
        if (!res.ok || body?.ok !== true) throw new Error(String(body?.error ?? 'ui_state_delete_failed'))
        return null
      } catch {
        await fallbackStorage.deleteUiStateKey(windowId, key)
        fallbackEventBus.emit('UI_STATE_DEL', { windowId, key })
      }
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

      const headers: Record<string, string> = { ...authHeaders }
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

  ;(api as any).__secboardWebAdapter = true
  w.__lanstartWebAdapter = api
  window.lanstart = api
}

export function getFrontendEventBusInstance(): FrontendEventBus | null {
  return globalEventBus
}
