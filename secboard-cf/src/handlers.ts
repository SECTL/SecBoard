import type { Env, EventItem } from './types'
import { getKv, putKv, deleteKv, getKvOrUndefined } from './kv'
import { getEvents, addEvent } from './events'
import { getUiState, getUiStateKey, putUiStateKey, deleteUiStateKey } from './ui'
import { getCunoxFile, putCunoxFile, deleteCunoxFile, getSignedDownloadUrl } from './storage'

const UI_STATE_APP_WINDOW_ID = 'app'

export async function handlePostCommand(env: Env, command: string, payload: unknown): Promise<{ ok: boolean; error?: string }> {
  await addEvent(env, 'COMMAND', { command, payload })

  const dot = command.indexOf('.')
  if (dot > 0) {
    const scope = command.slice(0, dot)
    const action = command.slice(dot + 1)

    if (scope === 'settings') {
      if (action === 'setAppearance') {
        const appearance = String((payload as any)?.appearance)
        await putKv(env, 'appearance', appearance)
        await addEvent(env, 'KV_PUT', { key: 'appearance' })
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['appearance'] = appearance
        return { ok: true }
      }

      if (action === 'setAppMode') {
        const mode = String((payload as any)?.mode)
        await putKv(env, 'appMode', mode)
        await addEvent(env, 'KV_PUT', { key: 'appMode' })
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['appMode'] = mode
        return { ok: true }
      }

      if (action === 'setVideoShowMergeLayers') {
        const enabled = Boolean((payload as any)?.enabled)
        await putKv(env, 'videoShowMergeLayers', enabled)
        await addEvent(env, 'KV_PUT', { key: 'videoShowMergeLayers' })
        return { ok: true }
      }

      if (action === 'setWhiteboardBackground') {
        const bgColor = (payload as any)?.bgColor
        const bgImageUrl = (payload as any)?.bgImageUrl
        const bgImageOpacity = (payload as any)?.bgImageOpacity

        if (bgColor !== undefined) {
          await putKv(env, 'whiteboardBgColor', bgColor)
          await addEvent(env, 'KV_PUT', { key: 'whiteboardBgColor' })
        }
        if (bgImageUrl !== undefined) {
          await putKv(env, 'whiteboardBgImageUrl', bgImageUrl)
          await addEvent(env, 'KV_PUT', { key: 'whiteboardBgImageUrl' })
        }
        if (bgImageOpacity !== undefined) {
          await putKv(env, 'whiteboardBgImageOpacity', bgImageOpacity)
          await addEvent(env, 'KV_PUT', { key: 'whiteboardBgImageOpacity' })
        }
        return { ok: true }
      }
    }

    if (scope === 'win') {
      if (action === 'toggleSubwindow') {
        const kind = String((payload as any)?.kind)
        const placement = String((payload as any)?.placement) === 'top' ? 'top' : 'bottom'
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        const currentKind = state['webActiveSubwindowKind']

        if (currentKind === kind) {
          delete state['webActiveSubwindowKind']
          delete state['webSubwindowPlacement']
        } else {
          state['webActiveSubwindowKind'] = kind
          state['webSubwindowPlacement'] = placement
        }

        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }

      if (action === 'setNoticeVisible') {
        const visible = Boolean((payload as any)?.visible)
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['noticeKind'] = visible ? String((payload as any)?.kind || 'notice') : ''
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }
    }

    if (scope === 'app') {
      if (action === 'setTool') {
        const tool = String((payload as any)?.tool)
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['tool'] = tool
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        await addEvent(env, 'UI_STATE_PUT', { windowId: UI_STATE_APP_WINDOW_ID, key: 'tool', value: tool })
        return { ok: true }
      }

      if (action === 'setPenSettings') {
        const type = String((payload as any)?.type)
        const color = String((payload as any)?.color)
        const thickness = Number((payload as any)?.thickness)
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['penType'] = type
        state['penColor'] = color
        state['penThickness'] = thickness
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }

      if (action === 'setEraserSettings') {
        const type = String((payload as any)?.type)
        const thickness = Number((payload as any)?.thickness)
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['eraserType'] = type
        state['eraserThickness'] = thickness
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }

      if (action === 'clearPage') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['clearPageRev'] = ((state['clearPageRev'] as number) || 0) + 1
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }

      if (action === 'undo') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['undoRev'] = ((state['undoRev'] as number) || 0) + 1
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }

      if (action === 'redo') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['redoRev'] = ((state['redoRev'] as number) || 0) + 1
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }
    }

    if (scope === 'notes') {
      if (action === 'setPageIndex') {
        const index = Number((payload as any)?.index)
        const total = Number((payload as any)?.total)
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['notesPageIndex'] = index
        state['notesPageTotal'] = total
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }
    }

    if (scope === 'video') {
      if (action === 'setCaptureRev') {
        const state = await getUiState(env, UI_STATE_APP_WINDOW_ID)
        state['videoCaptureRev'] = ((state['videoCaptureRev'] as number) || 0) + 1
        for (const [key, value] of Object.entries(state)) {
          await putUiStateKey(env, UI_STATE_APP_WINDOW_ID, key, value)
        }
        return { ok: true }
      }

      if (action === 'setPages') {
        const pages = (payload as any)?.pages
        await putKv(env, 'videoShowPages', pages)
        await addEvent(env, 'KV_PUT', { key: 'videoShowPages' })
        return { ok: true }
      }
    }
  }

  return { ok: true }
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
