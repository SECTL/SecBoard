import { useEffect, useRef, useState } from 'react'
import { ensureWebLanstartAdapter } from './webLanstartAdapter'
import {
  APP_MODE_UI_STATE_KEY,
  APPEARANCE_KV_KEY,
  APPEARANCE_UI_STATE_KEY,
  CLEAR_PAGE_REV_UI_STATE_KEY,
  EFFECTIVE_WRITING_BACKEND_UI_STATE_KEY,
  ERASER_THICKNESS_UI_STATE_KEY,
  ERASER_SETTINGS_KV_KEY,
  ERASER_TYPE_UI_STATE_KEY,
  LEAFER_SETTINGS_KV_KEY,
  LEAFER_SETTINGS_UI_STATE_KEY,
  NOTES_RELOAD_REV_UI_STATE_KEY,
  NOTICE_KIND_UI_STATE_KEY,
  CLOCK_TAB_UI_STATE_KEY,
  CLOCK_TIMER_RUNNING_UI_STATE_KEY,
  CLOCK_TIMER_START_MS_UI_STATE_KEY,
  CLOCK_TIMER_ELAPSED_MS_UI_STATE_KEY,
  CLOCK_COUNTDOWN_RUNNING_UI_STATE_KEY,
  CLOCK_COUNTDOWN_END_MS_UI_STATE_KEY,
  CLOCK_COUNTDOWN_PRESET_MS_UI_STATE_KEY,
  CLOCK_COUNTDOWN_REMAINING_MS_UI_STATE_KEY,
  WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY,
  WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY,
  WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY,
  WEB_SETTINGS_VISIBLE_UI_STATE_KEY,
  PEN_COLOR_UI_STATE_KEY,
  PEN_SETTINGS_KV_KEY,
  PEN_THICKNESS_UI_STATE_KEY,
  PEN_TYPE_UI_STATE_KEY,
  REDO_REV_UI_STATE_KEY,
  TOOL_UI_STATE_KEY,
  TOOLBAR_STATE_KEY,
  TOOLBAR_STATE_UI_STATE_KEY,
  UI_STATE_APP_WINDOW_ID,
  UNDO_REV_UI_STATE_KEY,
  WHITEBOARD_BG_COLOR_KV_KEY,
  WHITEBOARD_BG_COLOR_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_URL_KV_KEY,
  WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY,
  WHITEBOARD_CANVAS_PAGES_KV_KEY,
  VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY,
  VIDEO_SHOW_DEVICE_ID_UI_STATE_KEY,
  VIDEO_SHOW_LIVE_THUMB_UI_STATE_KEY,
  VIDEO_SHOW_MERGE_LAYERS_KV_KEY,
  VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY,
  VIDEO_SHOW_PAGES_KV_KEY,
  VIDEO_SHOW_QUALITY_UI_STATE_KEY,
  VIDEO_SHOW_QUALITY_PRESETS_UI_STATE_KEY,
  VIDEO_SHOW_SOURCE_UI_STATE_KEY,
  VIDEO_SHOW_VIEW_UI_STATE_KEY,
  VIDEO_SHOW_WEBRTC_SESSION_ID_UI_STATE_KEY,
  VIDEO_SHOW_WEBRTC_STATUS_UI_STATE_KEY,
  WRITING_FRAMEWORK_KV_KEY,
  WRITING_FRAMEWORK_UI_STATE_KEY,
  isAppearance,
  isAppMode,
  isEraserSettings,
  isEffectiveWritingBackend,
  isFileOrDataUrl,
  isHexColor,
  isLeaferSettings,
  isPenSettings,
  isWritingFramework,
  type AppMode,
  type Appearance,
  type EraserType,
  type EraserSettings,
  type EffectiveWritingBackend,
  type LeaferNibMode,
  type LeaferRendererEngine,
  type LeaferSettings,
  type PenType,
  type PenSettings,
  type VideoShowSource,
  type VideoShowViewTransform,
  type ClockTab,
  type WritingFramework
} from './keys'

export {
  type Tool,
  type FrontendState,
  type FrontendAction,
  type FrontendStateContextValue,
  type FrontendStateProviderProps,
  FrontendStateContext,
  FrontendStateProvider,
  useFrontendState,
  useOptionalFrontendState,
  useFrontendStateValue,
  useTool,
  usePenSettings,
  useEraserSettings,
  useAppModeState,
  useNotesPage,
  useRevision,
  useWhiteboardBackground,
  toUiStateSnapshot,
  fromUiStateSnapshot,
  initialState
} from './frontendState'

export {
  openDb,
  getValue,
  getValueOrUndefined,
  putValue,
  deleteValue,
  deleteByPrefix,
  getAllKeys,
  listEntriesByPrefix,
  listKeysByPrefix,
  clearAll,
  closeDb,
  clearCache,
  getCacheSize
} from './indexedDbStorage'

export { type EventItem, type EventPayloadMap, subscribe, emit, getEvents as getLocalEvents } from './eventBus'

export { isPureFrontendMode } from './webLanstartAdapter'

export {
  APP_MODE_KV_KEY,
  APP_MODE_UI_STATE_KEY,
  APPEARANCE_KV_KEY,
  APPEARANCE_UI_STATE_KEY,
  CLEAR_PAGE_REV_UI_STATE_KEY,
  EFFECTIVE_WRITING_BACKEND_UI_STATE_KEY,
  ERASER_THICKNESS_UI_STATE_KEY,
  ERASER_SETTINGS_KV_KEY,
  ERASER_TYPE_UI_STATE_KEY,
  LEAFER_SETTINGS_KV_KEY,
  LEAFER_SETTINGS_UI_STATE_KEY,
  NOTES_PAGE_INDEX_UI_STATE_KEY,
  NOTES_PAGE_TOTAL_UI_STATE_KEY,
  NOTES_RELOAD_REV_UI_STATE_KEY,
  NOTICE_KIND_UI_STATE_KEY,
  CLOCK_TAB_UI_STATE_KEY,
  CLOCK_TIMER_RUNNING_UI_STATE_KEY,
  CLOCK_TIMER_START_MS_UI_STATE_KEY,
  CLOCK_TIMER_ELAPSED_MS_UI_STATE_KEY,
  CLOCK_COUNTDOWN_RUNNING_UI_STATE_KEY,
  CLOCK_COUNTDOWN_END_MS_UI_STATE_KEY,
  CLOCK_COUNTDOWN_PRESET_MS_UI_STATE_KEY,
  CLOCK_COUNTDOWN_REMAINING_MS_UI_STATE_KEY,
  WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY,
  WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY,
  WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY,
  WEB_SETTINGS_VISIBLE_UI_STATE_KEY,
  PEN_COLOR_UI_STATE_KEY,
  PEN_SETTINGS_KV_KEY,
  PEN_THICKNESS_UI_STATE_KEY,
  PEN_TYPE_UI_STATE_KEY,
  REDO_REV_UI_STATE_KEY,
  TOOL_UI_STATE_KEY,
  TOOLBAR_STATE_KEY,
  TOOLBAR_STATE_UI_STATE_KEY,
  UI_STATE_APP_WINDOW_ID,
  UNDO_REV_UI_STATE_KEY,
  WHITEBOARD_BG_COLOR_KV_KEY,
  WHITEBOARD_BG_COLOR_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_URL_KV_KEY,
  WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY,
  WHITEBOARD_CANVAS_PAGES_KV_KEY,
  VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY,
  VIDEO_SHOW_DEVICE_ID_UI_STATE_KEY,
  VIDEO_SHOW_LIVE_THUMB_UI_STATE_KEY,
  VIDEO_SHOW_MERGE_LAYERS_KV_KEY,
  VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY,
  VIDEO_SHOW_PAGES_KV_KEY,
  VIDEO_SHOW_QUALITY_UI_STATE_KEY,
  VIDEO_SHOW_QUALITY_PRESETS_UI_STATE_KEY,
  VIDEO_SHOW_SOURCE_UI_STATE_KEY,
  VIDEO_SHOW_VIEW_UI_STATE_KEY,
  VIDEO_SHOW_WEBRTC_SESSION_ID_UI_STATE_KEY,
  VIDEO_SHOW_WEBRTC_STATUS_UI_STATE_KEY,
  WRITING_FRAMEWORK_KV_KEY,
  WRITING_FRAMEWORK_UI_STATE_KEY,
  isAppearance,
  isAppMode,
  isEraserSettings,
  isEffectiveWritingBackend,
  isFileOrDataUrl,
  isHexColor,
  isLeaferSettings,
  isPenSettings,
  isWritingFramework,
  type AppMode,
  type Appearance,
  type EraserType,
  type EraserSettings,
  type EffectiveWritingBackend,
  type LeaferNibMode,
  type LeaferRendererEngine,
  type LeaferSettings,
  type PenType,
  type PenSettings,
  type VideoShowSource,
  type VideoShowViewTransform,
  type ClockTab,
  type WritingFramework
} from './keys'

export type BackendEventItem = {
  id: number
  type: string
  payload?: unknown
  ts: number
}

type LocalUiStateEvent = { type: 'put' | 'delete'; windowId: string; key: string; value?: unknown }
type LocalUiStateListener = (event: LocalUiStateEvent) => void

const localUiState = new Map<string, Record<string, unknown>>()
const localUiStateListeners = new Set<LocalUiStateListener>()

function getLocalUiState(windowId: string): Record<string, unknown> {
  return localUiState.get(windowId) ?? {}
}

function mergeLocalUiState(windowId: string, state: Record<string, unknown>): void {
  if (!Object.keys(state).length) return
  localUiState.set(windowId, { ...getLocalUiState(windowId), ...state })
}

function putLocalUiStateKey(windowId: string, key: string, value: unknown): void {
  localUiState.set(windowId, { ...getLocalUiState(windowId), [key]: value })
  for (const listener of localUiStateListeners) listener({ type: 'put', windowId, key, value })
}

function deleteLocalUiStateKey(windowId: string, key: string): void {
  const current = getLocalUiState(windowId)
  if (!(key in current)) return
  const { [key]: _drop, ...next } = current
  localUiState.set(windowId, next)
  for (const listener of localUiStateListeners) listener({ type: 'delete', windowId, key })
}

function subscribeLocalUiState(listener: LocalUiStateListener): () => void {
  localUiStateListeners.add(listener)
  return () => {
    localUiStateListeners.delete(listener)
  }
}

function getFallbackLanstart() {
  const w = window as any
  if (w.__lanstartFallback) return w.__lanstartFallback as NonNullable<Window['lanstart']>

  const kv = new Map<string, unknown>()
  const uiState = new Map<string, Record<string, unknown>>()

  const api: NonNullable<Window['lanstart']> = {
    postCommand: async () => null,
    getEvents: async (since: number) => ({ items: [], latest: since }),
    getKv: async (key: string) => {
      if (kv.has(key)) return kv.get(key)
      throw new Error('kv_not_found')
    },
    putKv: async (key: string, value: unknown) => {
      kv.set(key, value)
      return null
    },
    getUiState: async (windowId: string) => uiState.get(windowId) ?? {},
    putUiStateKey: async (windowId: string, key: string, value: unknown) => {
      const prev = uiState.get(windowId) ?? {}
      uiState.set(windowId, { ...prev, [key]: value })
      return null
    },
    deleteUiStateKey: async (windowId: string, key: string) => {
      const prev = uiState.get(windowId) ?? {}
      if (!(key in prev)) return null
      const next = { ...prev } as any
      delete next[key]
      uiState.set(windowId, next)
      return null
    },
    apiRequest: async () => ({ status: 503, body: { ok: false, error: 'lanstart_unavailable' } }),
    clipboardWriteText: async () => null,
    setZoomLevel: () => undefined,
    getZoomLevel: () => 0
  }

  w.__lanstartFallback = api
  return api
}

function requireLanstart() {
  ensureWebLanstartAdapter()
  const api = window.lanstart
  return api ?? getFallbackLanstart()
}

export async function postCommand(command: string, payload?: unknown): Promise<void> {
  await requireLanstart().postCommand(command, payload)
}

export async function getEvents(since: number): Promise<{ items: BackendEventItem[]; latest: number }> {
  return await requireLanstart().getEvents(since)
}

export async function getKv<T>(key: string): Promise<T> {
  return (await requireLanstart().getKv(key)) as T
}

export async function putKv<T>(key: string, value: T): Promise<void> {
  await requireLanstart().putKv(key, value)
}

export async function selectImageFile(): Promise<{ fileUrl?: string }> {
  const res = (await requireLanstart().apiRequest({ method: 'POST', path: '/dialog/select-image-file' })) as any
  const body = res?.body as any
  const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl : undefined
  return { fileUrl }
}

export async function readImageFileUrlAsDataUrl(fileUrl: string): Promise<{ dataUrl?: string }> {
  const res = (await requireLanstart().apiRequest({
    method: 'POST',
    path: '/img/file-to-data-url',
    body: { fileUrl }
  })) as any
  const body = res?.body as any
  if (res?.status !== 200 || body?.ok !== true) throw new Error(String(body?.error ?? 'IMAGE_READ_FAILED'))
  const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl : undefined
  return { dataUrl }
}

export async function selectDirectory(): Promise<{ dir?: string; dirUrl?: string }> {
  const res = (await requireLanstart().apiRequest({ method: 'POST', path: '/dialog/select-directory' })) as any
  const body = res?.body as any
  const dir = typeof body?.dir === 'string' ? body.dir : undefined
  const dirUrl = typeof body?.dirUrl === 'string' ? body.dirUrl : undefined
  return { dir, dirUrl }
}

export async function selectCunoxExportFile(): Promise<{ file?: string; fileUrl?: string }> {
  const res = (await requireLanstart().apiRequest({ method: 'POST', path: '/dialog/select-cunox-export-file' })) as any
  const body = res?.body as any
  const file = typeof body?.file === 'string' ? body.file : undefined
  const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl : undefined
  return { file, fileUrl }
}

export async function selectCunoxImportFile(): Promise<{ file?: string; fileUrl?: string }> {
  const res = (await requireLanstart().apiRequest({ method: 'POST', path: '/dialog/select-cunox-import-file' })) as any
  const body = res?.body as any
  const file = typeof body?.file === 'string' ? body.file : undefined
  const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl : undefined
  return { file, fileUrl }
}

export async function getUiState(windowId: string): Promise<Record<string, unknown>> {
  const state = await requireLanstart().getUiState(windowId)
  mergeLocalUiState(windowId, state)
  return { ...getLocalUiState(windowId), ...state }
}

export async function putUiStateKey(windowId: string, key: string, value: unknown): Promise<void> {
  putLocalUiStateKey(windowId, key, value)
  await requireLanstart().putUiStateKey(windowId, key, value)
}

export async function deleteUiStateKey(windowId: string, key: string): Promise<void> {
  deleteLocalUiStateKey(windowId, key)
  await requireLanstart().deleteUiStateKey(windowId, key)
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options?: {
    validate?: (value: unknown) => value is T
    mapLoad?: (value: T) => T
    mapSave?: (value: T) => unknown
  }
) {
  const [value, setValue] = useState<T>(defaultValue)
  const didHydrate = useRef(false)
  const validateRef = useRef<((value: unknown) => value is T) | undefined>(undefined)
  const mapLoadRef = useRef<((value: T) => T) | undefined>(undefined)
  const mapSaveRef = useRef<((value: T) => unknown) | undefined>(undefined)

  validateRef.current = options?.validate
  mapLoadRef.current = options?.mapLoad
  mapSaveRef.current = options?.mapSave

  useEffect(() => {
    let cancelled = false
    didHydrate.current = false

    const run = async () => {
      try {
        const loaded = await getKv<unknown>(key)
        if (cancelled) return
        if (loaded === undefined) return
        const validate = validateRef.current
        if (validate && !validate(loaded)) return
        const mapLoad = mapLoadRef.current
        const next = mapLoad ? mapLoad(loaded as T) : (loaded as T)
        setValue(next)
      } catch {
        return
      } finally {
        if (!cancelled) didHydrate.current = true
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [key])

  useEffect(() => {
    if (!didHydrate.current) return

    const id = window.setTimeout(() => {
      const mapSave = mapSaveRef.current
      const next = mapSave ? mapSave(value) : value
      putKv(key, next as any).catch(() => undefined)
    }, 250)

    return () => window.clearTimeout(id)
  }, [key, value])

  return [value, setValue] as const
}

function coerceString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

export function useUiStateBus(windowId: string, options?: { intervalMs?: number }) {
  const intervalMs = options?.intervalMs ?? 600
  const latestRef = useRef(0)
  const [state, setState] = useState<Record<string, unknown>>(() => getLocalUiState(windowId))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const initial = await getUiState(windowId)
        if (cancelled) return
        mergeLocalUiState(windowId, initial)
        setState(initial)
      } catch {
        return
      }
    })()
    return () => {
      cancelled = true
    }
  }, [windowId])

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      try {
        const res = await getEvents(latestRef.current)
        if (cancelled) return
        latestRef.current = res.latest
        if (!res.items.length) return

        const nextPatches: Array<(prev: Record<string, unknown>) => Record<string, unknown>> = []

        for (const item of res.items) {
          if (item.type !== 'UI_STATE_PUT' && item.type !== 'UI_STATE_DEL') continue
          const payload = (item.payload ?? {}) as any
          if (coerceString(payload.windowId) !== windowId) continue
          const key = coerceString(payload.key)
          if (!key) continue

          if (item.type === 'UI_STATE_PUT') {
            const value = payload.value as unknown
            nextPatches.push((prev) => ({ ...prev, [key]: value }))
          } else {
            nextPatches.push((prev) => {
              if (!(key in prev)) return prev
              const { [key]: _drop, ...rest } = prev
              return rest
            })
          }
        }

        if (!nextPatches.length) return
        setState((prev) => {
          const next = nextPatches.reduce((acc, patch) => patch(acc), prev)
          mergeLocalUiState(windowId, next)
          return next
        })
      } catch {
        return
      }
    }

    const id = window.setInterval(tick, intervalMs)
    tick()
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [intervalMs, windowId])

  useEffect(() => {
    return subscribeLocalUiState((event) => {
      if (event.windowId !== windowId) return
      if (event.type === 'put') {
        setState((prev) => ({ ...prev, [event.key]: event.value }))
        return
      }
      setState((prev) => {
        if (!(event.key in prev)) return prev
        const { [event.key]: _drop, ...rest } = prev
        return rest
      })
    })
  }, [windowId])

  const setKey = async (key: string, value: unknown) => {
    setState((prev) => ({ ...prev, [key]: value }))
    await putUiStateKey(windowId, key, value)
  }

  const deleteKey = async (key: string) => {
    setState((prev) => {
      if (!(key in prev)) return prev
      const { [key]: _drop, ...rest } = prev
      return rest
    })
    await deleteUiStateKey(windowId, key)
  }

  const refresh = async () => {
    const latest = await getUiState(windowId)
    mergeLocalUiState(windowId, latest)
    setState(latest)
  }

  return { state, setKey, deleteKey, refresh }
}

export function useAppAppearance() {
  const [appearance, setAppearanceState] = usePersistedState<Appearance>(APPEARANCE_KV_KEY, 'light', {
    validate: isAppearance
  })
  const bus = useUiStateBus(UI_STATE_APP_WINDOW_ID)

  const busAppearanceRaw = bus.state[APPEARANCE_UI_STATE_KEY]
  const busAppearance: Appearance | undefined = isAppearance(busAppearanceRaw) ? busAppearanceRaw : undefined

  useEffect(() => {
    if (!busAppearance) return
    if (busAppearance === appearance) return
    setAppearanceState(busAppearance)
  }, [appearance, busAppearance, setAppearanceState])

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-appearance', appearance)
    } catch {}
  }, [appearance])

  const setAppearance = (next: Appearance) => {
    if (next === appearance) return
    setAppearanceState(next)
    bus.setKey(APPEARANCE_UI_STATE_KEY, next).catch(() => undefined)
    postCommand('set-appearance', { appearance: next }).catch(() => undefined)
  }

  return { appearance, setAppearance }
}

export function useAppMode() {
  const bus = useUiStateBus(UI_STATE_APP_WINDOW_ID)
  const busModeRaw = bus.state[APP_MODE_UI_STATE_KEY]
  const busMode: AppMode | undefined = isAppMode(busModeRaw) ? busModeRaw : undefined
  const appMode = busMode ?? 'whiteboard'

  useEffect(() => {
    if (busMode) return
    postCommand('settings.setAppMode', { mode: appMode }).catch(() => undefined)
  }, [appMode, busMode])

  const setAppMode = (next: AppMode) => {
    if (next === appMode) return
    postCommand('settings.setAppMode', { mode: next }).catch(() => undefined)
  }

  return { appMode, setAppMode }
}
