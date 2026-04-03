import type { Env, EventItem } from './types'
import { getKv, putKv, deleteKv, getKvOrUndefined, deleteByPrefix } from './kv'
import { getEvents, addEvent } from './events'
import { getUiState, getUiStateKey, putUiStateKey, deleteUiStateKey } from './ui'
import { getCunoxFile, putCunoxFile, deleteCunoxFile } from './storage'
import {
  APPEARANCE_KV_KEY,
  APP_MODE_KV_KEY,
  VIDEO_SHOW_MERGE_LAYERS_KV_KEY,
  WHITEBOARD_BG_COLOR_KV_KEY,
  WHITEBOARD_BG_IMAGE_URL_KV_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY,
  WHITEBOARD_CANVAS_PAGES_KV_KEY,
  VIDEO_SHOW_PAGES_KV_KEY,
  WRITING_FRAMEWORK_KV_KEY,
  UI_STATE_APP_WINDOW_ID,
  APPEARANCE_UI_STATE_KEY,
  APP_MODE_UI_STATE_KEY,
  WRITING_FRAMEWORK_UI_STATE_KEY,
  EFFECTIVE_WRITING_BACKEND_UI_STATE_KEY,
  TOOL_UI_STATE_KEY,
  PEN_TYPE_UI_STATE_KEY,
  PEN_COLOR_UI_STATE_KEY,
  PEN_THICKNESS_UI_STATE_KEY,
  ERASER_TYPE_UI_STATE_KEY,
  ERASER_THICKNESS_UI_STATE_KEY,
  CLEAR_PAGE_REV_UI_STATE_KEY,
  UNDO_REV_UI_STATE_KEY,
  REDO_REV_UI_STATE_KEY,
  NOTES_PAGE_INDEX_UI_STATE_KEY,
  NOTES_PAGE_TOTAL_UI_STATE_KEY,
  WHITEBOARD_BG_COLOR_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY,
  VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY,
  VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY,
  NOTICE_KIND_UI_STATE_KEY,
  WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY,
  WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY,
  WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY,
  WEB_SETTINGS_VISIBLE_UI_STATE_KEY,
  isAppearance,
  isAppMode,
  isWritingFramework,
  isHexColor,
  isFileOrDataUrl,
  type AppMode,
  type WritingFramework
} from './keys'

function coerceString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function coerceInt(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.floor(n) : fallback
}

function videoShowPhotoPageName(pageNo: number): string {
  const n = Math.floor(pageNo)
  if (n <= 0) return `第${Math.max(1, n)}页`
  const d = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (n < 10) return `第${d[n]}页`
  if (n === 10) return '第十页'
  if (n < 20) return `第十${d[n - 10]}页`
  if (n < 100) {
    const tens = Math.floor(n / 10)
    const ones = n % 10
    return `第${d[tens]}十${ones ? d[ones] : ''}页`
  }
  return `第${n}页`
}

type WhiteboardCanvasPageV1 = { bgColor: string; bgImageUrl: string; bgImageOpacity: number }
type WhiteboardCanvasBookV1 = { version: 1; pages: WhiteboardCanvasPageV1[] }
type VideoShowPageV1 = { name: string; imageUrl: string; createdAt: number }
type VideoShowPageBookV1 = { version: 1; pages: VideoShowPageV1[] }

function isWhiteboardCanvasBookV1(v: unknown): v is WhiteboardCanvasBookV1 {
  if (!v || typeof v !== 'object') return false
  const b = v as any
  if (b.version !== 1) return false
  if (!Array.isArray(b.pages)) return false
  return true
}

function isVideoShowPageBookV1(v: unknown): v is VideoShowPageBookV1 {
  if (!v || typeof v !== 'object') return false
  const b = v as any
  if (b.version !== 1) return false
  if (!Array.isArray(b.pages)) return false
  return true
}

async function getDefaultWhiteboardBackground(env: Env): Promise<{ bgColor: string; bgImageUrl: string; bgImageOpacity: number }> {
  let bgColor = '#ffffff'
  let bgImageUrl = ''
  let bgImageOpacity = 0.5
  try {
    const v = await getKv(env, WHITEBOARD_BG_COLOR_KV_KEY)
    if (isHexColor(v)) bgColor = v as string
  } catch {}
  try {
    const v = await getKv(env, WHITEBOARD_BG_IMAGE_URL_KV_KEY)
    if (isFileOrDataUrl(v)) bgImageUrl = v as string
  } catch {}
  try {
    const v = await getKv(env, WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY)
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
    if (Number.isFinite(n)) bgImageOpacity = Math.max(0, Math.min(1, n))
  } catch {}
  return { bgColor, bgImageUrl, bgImageOpacity }
}

async function getOrInitWhiteboardCanvasBook(env: Env, args: { total: number; defaultBg: { bgColor: string; bgImageUrl: string; bgImageOpacity: number } }): Promise<{ book: WhiteboardCanvasBookV1; changed: boolean }> {
  const total = Math.max(1, Math.floor(args.total))
  let changed = false
  let book: WhiteboardCanvasBookV1 = { version: 1, pages: [] }
  try {
    const loaded = await getKv(env, WHITEBOARD_CANVAS_PAGES_KV_KEY)
    if (isWhiteboardCanvasBookV1(loaded)) book = loaded
  } catch {}

  if (!Array.isArray(book.pages)) {
    book = { version: 1, pages: [] }
    changed = true
  }

  if (book.pages.length < total) {
    changed = true
    while (book.pages.length < total) {
      book.pages.push({ bgColor: args.defaultBg.bgColor, bgImageUrl: args.defaultBg.bgImageUrl, bgImageOpacity: args.defaultBg.bgImageOpacity })
    }
  } else if (book.pages.length > total) {
    changed = true
    book.pages.length = total
  }

  return { book, changed }
}

async function ensureWhiteboardCanvasBookPersisted(env: Env, args: { total: number; defaultBg: { bgColor: string; bgImageUrl: string; bgImageOpacity: number } }): Promise<WhiteboardCanvasBookV1> {
  const { book, changed } = await getOrInitWhiteboardCanvasBook(env, args)
  if (changed) {
    await putKv(env, WHITEBOARD_CANVAS_PAGES_KV_KEY, book)
    await addEvent(env, 'KV_PUT', { key: WHITEBOARD_CANVAS_PAGES_KV_KEY })
  }
  return book
}

async function getOrInitVideoShowPageBook(env: Env, args: { photoTotal: number }): Promise<{ book: VideoShowPageBookV1; changed: boolean }> {
  const total = Math.max(0, Math.floor(args.photoTotal))
  let changed = false
  let book: VideoShowPageBookV1 = { version: 1, pages: [] }
  try {
    const loaded = await getKv(env, VIDEO_SHOW_PAGES_KV_KEY)
    if (isVideoShowPageBookV1(loaded)) book = loaded
  } catch {}

  const rawPages = Array.isArray(book.pages) ? book.pages : null
  if (!rawPages) {
    book = { version: 1, pages: [] }
    changed = true
  } else {
    book = { version: 1, pages: [...rawPages] }
  }

  if (book.pages.length < total) {
    changed = true
    while (book.pages.length < total) book.pages.push({ name: '', imageUrl: '', createdAt: 0 })
  } else if (book.pages.length > total) {
    changed = true
    book.pages.length = total
  }

  return { book, changed }
}

async function ensureVideoShowPageBookPersisted(env: Env, args: { photoTotal: number }): Promise<VideoShowPageBookV1> {
  const { book, changed } = await getOrInitVideoShowPageBook(env, args)
  if (changed) {
    await putKv(env, VIDEO_SHOW_PAGES_KV_KEY, book)
    await addEvent(env, 'KV_PUT', { key: VIDEO_SHOW_PAGES_KV_KEY })
  }
  return book
}

async function getPersistedWritingFramework(env: Env): Promise<WritingFramework | undefined> {
  try {
    const value = await getKv(env, WRITING_FRAMEWORK_KV_KEY)
    return isWritingFramework(value) ? value : undefined
  } catch {
    return undefined
  }
}

function coercePageIndexTotal(state: Record<string, unknown>): { index: number; total: number } {
  const total = coerceInt(state[NOTES_PAGE_TOTAL_UI_STATE_KEY], 1)
  const index = coerceInt(state[NOTES_PAGE_INDEX_UI_STATE_KEY], 0)
  const bounded = Math.max(0, Math.min(Math.max(1, total) - 1, index))
  return { index: bounded, total: Math.max(1, total) }
}

function ensurePageTotalInState(state: Record<string, unknown>, total: number): void {
  const totalRaw = Number(state[NOTES_PAGE_TOTAL_UI_STATE_KEY])
  if (Number.isFinite(totalRaw) && totalRaw >= 1) return
  state[NOTES_PAGE_TOTAL_UI_STATE_KEY] = total
}

async function applyWhiteboardBackgroundForPage(env: Env, state: Record<string, unknown>, index: number, total: number): Promise<void> {
  const modeRaw = state[APP_MODE_UI_STATE_KEY]
  const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'
  if (mode !== 'whiteboard') return

  const defaultBg = await getDefaultWhiteboardBackground(env)
  const book = await ensureWhiteboardCanvasBookPersisted(env, { total, defaultBg })
  const raw = book.pages?.[index] as Partial<WhiteboardCanvasPageV1> | undefined
  const page = {
    bgColor: typeof raw?.bgColor === 'string' ? raw.bgColor : defaultBg.bgColor,
    bgImageUrl: isFileOrDataUrl(raw?.bgImageUrl) ? String(raw?.bgImageUrl ?? '') : defaultBg.bgImageUrl,
    bgImageOpacity: typeof raw?.bgImageOpacity === 'number' && Number.isFinite(raw.bgImageOpacity) ? Math.max(0, Math.min(1, raw.bgImageOpacity)) : defaultBg.bgImageOpacity
  }

  state[WHITEBOARD_BG_COLOR_UI_STATE_KEY] = page.bgColor
  state[WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY] = page.bgImageUrl
  state[WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY] = page.bgImageOpacity
  await addEvent(env, 'UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: WHITEBOARD_BG_COLOR_UI_STATE_KEY, value: page.bgColor })
  await addEvent(env, 'UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY, value: page.bgImageUrl })
  await addEvent(env, 'UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY, value: page.bgImageOpacity })
}

async function syncUiState(env: Env, state: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(state)) {
    await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
  }
}

export async function handlePostCommand(env: Env, command: string, payload: unknown): Promise<{ ok: boolean; error?: string }> {
  await addEvent(env, 'COMMAND', { command, payload })

  const dot = command.indexOf('.')
  if (dot > 0) {
    const scope = command.slice(0, dot)
    const action = command.slice(dot + 1)

    if (scope === 'settings') {
      if (action === 'setAppearance') {
        const appearanceRaw = coerceString((payload as any)?.appearance)
        const appearance = isAppearance(appearanceRaw) ? appearanceRaw : undefined
        if (!appearance) return { ok: false, error: 'BAD_APPEARANCE' }
        await putKv(env, APPEARANCE_KV_KEY, appearance)
        await addEvent(env, 'KV_PUT', { key: APPEARANCE_KV_KEY })
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[APPEARANCE_UI_STATE_KEY] = appearance
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setAppMode') {
        const modeRaw = coerceString((payload as any)?.mode)
        const mode = isAppMode(modeRaw) ? modeRaw : undefined
        if (!mode) return { ok: false, error: 'BAD_MODE' }

        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const prevModeRaw = state[APP_MODE_UI_STATE_KEY]
        const prevMode = isAppMode(prevModeRaw) ? prevModeRaw : undefined

        if (prevMode && prevMode !== mode) {
          const { index, total } = coercePageIndexTotal(state)
          await Promise.allSettled([
            putKv(env, `notes-page-index:${prevMode}`, index),
            putKv(env, `notes-page-total:${prevMode}`, total)
          ])
        }

        await putKv(env, APP_MODE_KV_KEY, mode)
        await addEvent(env, 'KV_PUT', { key: APP_MODE_KV_KEY })
        state[APP_MODE_UI_STATE_KEY] = mode

        const [idxRes, totalRes] = await Promise.allSettled([
          getKvOrUndefined(env, `notes-page-index:${mode}`),
          getKvOrUndefined(env, `notes-page-total:${mode}`)
        ])
        const totalRaw = totalRes.status === 'fulfilled' ? Number(totalRes.value) : NaN
        const total = Number.isFinite(totalRaw) ? Math.max(1, Math.min(2000, Math.floor(totalRaw))) : 1
        const idxRaw = idxRes.status === 'fulfilled' ? Number(idxRes.value) : NaN
        const index = Number.isFinite(idxRaw) ? Math.max(0, Math.min(total - 1, Math.floor(idxRaw))) : 0
        state[NOTES_PAGE_TOTAL_UI_STATE_KEY] = total
        state[NOTES_PAGE_INDEX_UI_STATE_KEY] = index
        await applyWhiteboardBackgroundForPage(env, state, index, total)
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setVideoShowMergeLayers') {
        const enabled = Boolean((payload as any)?.enabled)
        await putKv(env, VIDEO_SHOW_MERGE_LAYERS_KV_KEY, enabled)
        await addEvent(env, 'KV_PUT', { key: VIDEO_SHOW_MERGE_LAYERS_KV_KEY })
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY] = enabled
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setWhiteboardBackground') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const nextColor = isHexColor((payload as any)?.bgColor) ? String((payload as any)?.bgColor) : undefined
        const nextImageUrl = isFileOrDataUrl((payload as any)?.bgImageUrl) ? String((payload as any)?.bgImageUrl ?? '') : undefined
        const nextOpacity = (() => {
          const raw = (payload as any)?.bgImageOpacity
          const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
          if (!Number.isFinite(n)) return undefined
          return Math.max(0, Math.min(1, n))
        })()

        if (nextColor !== undefined) {
          state[WHITEBOARD_BG_COLOR_UI_STATE_KEY] = nextColor
          await addEvent(env, 'UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: WHITEBOARD_BG_COLOR_UI_STATE_KEY, value: nextColor })
        }
        if (nextImageUrl !== undefined) {
          state[WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY] = nextImageUrl
          await addEvent(env, 'UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY, value: nextImageUrl })
        }
        if (nextOpacity !== undefined) {
          state[WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY] = nextOpacity
          await addEvent(env, 'UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY, value: nextOpacity })
        }

        const modeRaw = state[APP_MODE_UI_STATE_KEY]
        const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'
        if (mode === 'whiteboard') {
          const { index, total } = coercePageIndexTotal(state)
          const defaultBg = await getDefaultWhiteboardBackground(env)
          const book = await ensureWhiteboardCanvasBookPersisted(env, { total, defaultBg })
          const rawPage = book.pages?.[index] as Partial<WhiteboardCanvasPageV1> | undefined
          const page = {
            bgColor: typeof rawPage?.bgColor === 'string' ? rawPage.bgColor : defaultBg.bgColor,
            bgImageUrl: isFileOrDataUrl(rawPage?.bgImageUrl) ? String(rawPage?.bgImageUrl ?? '') : defaultBg.bgImageUrl,
            bgImageOpacity: typeof rawPage?.bgImageOpacity === 'number' && Number.isFinite(rawPage.bgImageOpacity) ? Math.max(0, Math.min(1, rawPage.bgImageOpacity)) : defaultBg.bgImageOpacity
          }

          const appliedColor = nextColor ?? page.bgColor
          const appliedImageUrl = nextImageUrl ?? page.bgImageUrl
          const appliedOpacity = nextOpacity ?? page.bgImageOpacity

          if (appliedColor !== page.bgColor || appliedImageUrl !== page.bgImageUrl || appliedOpacity !== page.bgImageOpacity) {
            book.pages[index] = { bgColor: appliedColor, bgImageUrl: appliedImageUrl, bgImageOpacity: appliedOpacity }
            await putKv(env, WHITEBOARD_CANVAS_PAGES_KV_KEY, book)
            await addEvent(env, 'KV_PUT', { key: WHITEBOARD_CANVAS_PAGES_KV_KEY })
          }
        }

        if (nextColor !== undefined) {
          await putKv(env, WHITEBOARD_BG_COLOR_KV_KEY, nextColor)
          await addEvent(env, 'KV_PUT', { key: WHITEBOARD_BG_COLOR_KV_KEY })
        }
        if (nextImageUrl !== undefined) {
          await putKv(env, WHITEBOARD_BG_IMAGE_URL_KV_KEY, nextImageUrl)
          await addEvent(env, 'KV_PUT', { key: WHITEBOARD_BG_IMAGE_URL_KV_KEY })
        }
        if (nextOpacity !== undefined) {
          await putKv(env, WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY, nextOpacity)
          await addEvent(env, 'KV_PUT', { key: WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY })
        }

        await syncUiState(env, state)
        return { ok: true }
      }

      return { ok: false, error: 'UNKNOWN_COMMAND' }
    }

    if (scope === 'win') {
      if (action === 'toggleSubwindow') {
        const kind = coerceString((payload as any)?.kind)
        const placementRaw = coerceString((payload as any)?.placement)
        const placement = placementRaw === 'top' ? 'top' : placementRaw === 'bottom' ? 'bottom' : undefined
        if (!kind || !placement) return { ok: false, error: 'BAD_SUBWINDOW' }
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const currentKind = coerceString(state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY])
        if (currentKind === kind) {
          delete state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY]
          delete state[WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY]
          await addEvent(env, 'UI_STATE_DEL', { windowId: UI_STATE_APP_WINDOW_ID, key: WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY })
          await addEvent(env, 'UI_STATE_DEL', { windowId: UI_STATE_APP_WINDOW_ID, key: WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY })
        } else {
          state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY] = kind
          state[WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY] = placement
        }
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setNoticeVisible') {
        const visible = Boolean((payload as any)?.visible)
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[NOTICE_KIND_UI_STATE_KEY] = visible ? (coerceString((payload as any)?.kind) || 'notice') : ''
        await addEvent(env, 'UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: NOTICE_KIND_UI_STATE_KEY, value: state[NOTICE_KIND_UI_STATE_KEY] })
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setSubwindowHeight' || action === 'setSubwindowBounds' || action === 'setToolbarBounds' || action === 'setAppWindowBounds' || action === 'setUiZoom') {
        return { ok: true }
      }

      return { ok: false, error: 'UNKNOWN_COMMAND' }
    }

    if (scope === 'app') {
      if (action === 'setTool') {
        const toolRaw = coerceString((payload as any)?.tool)
        const tool = toolRaw === 'pen' ? 'pen' : toolRaw === 'eraser' ? 'eraser' : 'mouse'
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[TOOL_UI_STATE_KEY] = tool

        const uiFrameworkRaw = state[WRITING_FRAMEWORK_UI_STATE_KEY]
        const uiFramework = isWritingFramework(uiFrameworkRaw) ? uiFrameworkRaw : undefined
        const writingFramework = uiFramework ?? (await getPersistedWritingFramework(env)) ?? 'konva'

        if (!uiFramework) {
          state[WRITING_FRAMEWORK_UI_STATE_KEY] = writingFramework
        }
        state[EFFECTIVE_WRITING_BACKEND_UI_STATE_KEY] = writingFramework
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setPenSettings') {
        const typeRaw = coerceString((payload as any)?.type)
        const type = typeRaw === 'highlighter' ? 'highlighter' : typeRaw === 'laser' ? 'laser' : 'writing'
        const color = coerceString((payload as any)?.color) || '#333333'
        const thickness = coerceInt((payload as any)?.thickness, 6)

        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[PEN_TYPE_UI_STATE_KEY] = type
        state[PEN_COLOR_UI_STATE_KEY] = color
        state[PEN_THICKNESS_UI_STATE_KEY] = thickness
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setEraserSettings') {
        const typeRaw = coerceString((payload as any)?.type)
        const type = typeRaw === 'stroke' ? 'stroke' : 'pixel'
        const thickness = coerceInt((payload as any)?.thickness, 18)

        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[ERASER_TYPE_UI_STATE_KEY] = type
        state[ERASER_THICKNESS_UI_STATE_KEY] = thickness
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'clearPage') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[CLEAR_PAGE_REV_UI_STATE_KEY] = (Number(state[CLEAR_PAGE_REV_UI_STATE_KEY]) || 0) + 1
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'undo') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[UNDO_REV_UI_STATE_KEY] = (Number(state[UNDO_REV_UI_STATE_KEY]) || 0) + 1
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'redo') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[REDO_REV_UI_STATE_KEY] = (Number(state[REDO_REV_UI_STATE_KEY]) || 0) + 1
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'prevPage') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const { index, total } = coercePageIndexTotal(state)
        ensurePageTotalInState(state, total)
        const nextIndex = Math.max(0, Math.min(total - 1, index - 1))
        state[NOTES_PAGE_INDEX_UI_STATE_KEY] = nextIndex
        await applyWhiteboardBackgroundForPage(env, state, nextIndex, total)
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'nextPage') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const { index, total } = coercePageIndexTotal(state)
        ensurePageTotalInState(state, total)
        const modeRaw = state[APP_MODE_UI_STATE_KEY]
        const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'

        if (mode === 'whiteboard' && index >= total - 1) {
          const nextTotal = Math.min(2000, total + 1)
          const nextIndex = nextTotal - 1
          state[NOTES_PAGE_TOTAL_UI_STATE_KEY] = nextTotal
          state[NOTES_PAGE_INDEX_UI_STATE_KEY] = nextIndex
          await applyWhiteboardBackgroundForPage(env, state, nextIndex, nextTotal)
          await syncUiState(env, state)
          return { ok: true }
        }

        const nextIndex = Math.max(0, Math.min(total - 1, index + 1))
        state[NOTES_PAGE_INDEX_UI_STATE_KEY] = nextIndex
        await applyWhiteboardBackgroundForPage(env, state, nextIndex, total)
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'newPage') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const { total } = coercePageIndexTotal(state)
        const modeRaw = state[APP_MODE_UI_STATE_KEY]
        const mode = isAppMode(modeRaw) ? modeRaw : 'toolbar'

        if (mode === 'video-show') {
          const rev = Date.now()
          const baseTotal = Math.max(1, total)
          const nextTotal = Math.min(2000, baseTotal + 1)
          const nextIndex = nextTotal - 1
          state[NOTES_PAGE_TOTAL_UI_STATE_KEY] = nextTotal
          state[NOTES_PAGE_INDEX_UI_STATE_KEY] = nextIndex

          const photoTotal = Math.max(0, nextTotal - 1)
          const photoIndex = Math.max(0, nextIndex - 1)
          const name = videoShowPhotoPageName(nextIndex)
          const book = await ensureVideoShowPageBookPersisted(env, { photoTotal })
          book.pages[photoIndex] = { name, imageUrl: '', createdAt: rev }
          await putKv(env, VIDEO_SHOW_PAGES_KV_KEY, book)
          await addEvent(env, 'KV_PUT', { key: VIDEO_SHOW_PAGES_KV_KEY })

          const capture = { rev, index: nextIndex, total: nextTotal, name }
          state[VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY] = capture
          await syncUiState(env, state)
          return { ok: true }
        }

        const nextTotal = Math.min(2000, total + 1)
        const nextIndex = nextTotal - 1
        state[NOTES_PAGE_TOTAL_UI_STATE_KEY] = nextTotal
        state[NOTES_PAGE_INDEX_UI_STATE_KEY] = nextIndex
        await applyWhiteboardBackgroundForPage(env, state, nextIndex, nextTotal)
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setPageIndex') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const { total } = coercePageIndexTotal(state)
        ensurePageTotalInState(state, total)
        const desired = coerceInt((payload as any)?.index, 0)
        const nextIndex = Math.max(0, Math.min(total - 1, desired))
        state[NOTES_PAGE_INDEX_UI_STATE_KEY] = nextIndex
        await applyWhiteboardBackgroundForPage(env, state, nextIndex, total)
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'togglePageThumbnailsMenu') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const next = !Boolean(state[WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY])
        state[WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY] = next
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setWritingFramework') {
        const frameworkRaw = coerceString((payload as any)?.framework)
        const framework = isWritingFramework(frameworkRaw) ? frameworkRaw : undefined
        if (!framework) return { ok: false, error: 'BAD_WRITING_FRAMEWORK' }
        await putKv(env, WRITING_FRAMEWORK_KV_KEY, framework)
        await addEvent(env, 'KV_PUT', { key: WRITING_FRAMEWORK_KV_KEY })
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[WRITING_FRAMEWORK_UI_STATE_KEY] = framework
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'openSettingsWindow') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[WEB_SETTINGS_VISIBLE_UI_STATE_KEY] = true
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'closeSettingsWindow') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[WEB_SETTINGS_VISIBLE_UI_STATE_KEY] = false
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'minimizeSettingsWindow' || action === 'windowControl' || action === 'setAnnotationInput') {
        return { ok: true }
      }

      return { ok: false, error: 'UNKNOWN_COMMAND' }
    }

    if (scope === 'notes') {
      if (action === 'setPageIndex') {
        const index = Number((payload as any)?.index)
        const total = Number((payload as any)?.total)
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[NOTES_PAGE_INDEX_UI_STATE_KEY] = index
        state[NOTES_PAGE_TOTAL_UI_STATE_KEY] = total
        await syncUiState(env, state)
        return { ok: true }
      }
    }

    if (scope === 'video') {
      if (action === 'setCaptureRev') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state[VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY] = ((state[VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY] as number) || 0) + 1
        await syncUiState(env, state)
        return { ok: true }
      }

      if (action === 'setPages') {
        const pages = (payload as any)?.pages
        await putKv(env, VIDEO_SHOW_PAGES_KV_KEY, pages)
        await addEvent(env, 'KV_PUT', { key: VIDEO_SHOW_PAGES_KV_KEY })
        return { ok: true }
      }
    }

    if (scope === 'qt' || scope === 'fs' || scope === 'img') {
      return { ok: true }
    }

    return { ok: false, error: 'UNKNOWN_COMMAND' }
  }

  if (command === 'quit' || command === 'create-window' || command === 'set-appearance') {
    return { ok: true }
  }

  if (command === 'toggle-subwindow') {
    const kind = coerceString((payload as any)?.kind)
    const placementRaw = coerceString((payload as any)?.placement)
    const placement = placementRaw === 'top' ? 'top' : placementRaw === 'bottom' ? 'bottom' : undefined
    if (!kind || !placement) return { ok: false, error: 'BAD_SUBWINDOW' }
    const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
    const currentKind = coerceString(state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY])
    if (currentKind === kind) {
      delete state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY]
      delete state[WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY]
    } else {
      state[WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY] = kind
      state[WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY] = placement
    }
    await syncUiState(env, state)
    return { ok: true }
  }

  if (command === 'set-subwindow-height' || command === 'set-subwindow-bounds' || command === 'set-toolbar-bounds' || command === 'set-mut-page-bounds' || command === 'set-app-window-bounds') {
    return { ok: true }
  }

  return { ok: false, error: 'UNKNOWN_COMMAND' }
}

export async function handleGetKv(env: Env, key: string) {
  try {
    const value = await getKv(env, key)
    await addEvent(env, 'KV_GET', { key })
    return { ok: true, value }
  } catch (e: any) {
    if (e.code === 'LEVEL_NOT_FOUND') {
      return { ok: false, error: 'kv_not_found' }
    }
    return { ok: false, error: String(e) }
  }
}

export async function handlePutKv(env: Env, key: string, value: unknown) {
  await putKv(env, key, value)
  await addEvent(env, 'KV_PUT', { key })
  return { ok: true }
}

export async function handleDeleteKv(env: Env, key: string) {
  await deleteKv(env, key)
  await addEvent(env, 'KV_DELETE', { key })
  return { ok: true }
}

export async function handleGetUiState(env: Env, windowId: string) {
  const state = await getUiState(env, windowId)
  await addEvent(env, 'UI_STATE_GET', { windowId })
  return { ok: true, state }
}

export async function handlePutUiState(env: Env, windowId: string, key: string, value: unknown) {
  await putUiStateKey(env, windowId, key, value)
  await addEvent(env, 'UI_STATE_PUT', { windowId, key, value })
  return { ok: true }
}

export async function handleDeleteUiState(env: Env, windowId: string, key: string) {
  await deleteUiStateKey(env, windowId, key)
  await addEvent(env, 'UI_STATE_DEL', { windowId, key })
  return { ok: true }
}

export async function handleGetEvents(env: Env, since: number) {
  const result = await getEvents(env, since)
  return { ok: true, ...result }
}

export async function handleGetCunoxFile(env: Env, path: string) {
  const data = await getCunoxFile(env, path)
  if (!data) {
    return { ok: false, error: 'file_not_found' }
  }
  return new Response(data, {
    headers: { 'Content-Type': 'application/octet-stream' }
  })
}

export async function handlePutCunoxFile(env: Env, path: string, data: ArrayBuffer, contentType: string) {
  await putCunoxFile(env, path, data, contentType)
  return { ok: true }
}

export async function handleDeleteCunoxFile(env: Env, path: string) {
  await deleteCunoxFile(env, path)
  return { ok: true }
}
