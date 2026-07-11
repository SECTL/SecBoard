import { treaty } from '@elysiajs/eden'
import type { ApiV1App } from '../elysia/apiV1'
import type {
  AnnotationBookV2,
  AppMode,
  SecBoardSettingsPatch,
  SecBoardSettingsV1,
  SystemCommandRequest
} from './contracts'
import { DEFAULT_SECBOARD_SETTINGS } from './contracts'

function apiBaseUrl(): string {
  const configured = String((import.meta as any).env?.VITE_LANSTART_API_BASE ?? '').trim()
  return configured.replace(/\/$/, '') || window.location.origin
}

function authHeaders(): Record<string, string> {
  const token = String((import.meta as any).env?.VITE_LANSTART_API_TOKEN ?? '').trim()
  return token ? { authorization: `Bearer ${token}` } : {}
}

function client() {
  return treaty<ApiV1App>(apiBaseUrl(), { headers: authHeaders() })
}

function unwrap<T>(response: { data: unknown; error: unknown }): T {
  if (response.error) {
    const error = response.error as any
    const body = error?.value ?? error
    throw new Error(String(body?.error?.message ?? body?.error?.code ?? 'api_request_failed'))
  }
  const envelope = response.data as any
  if (!envelope?.ok) throw new Error(String(envelope?.error?.message ?? 'api_request_failed'))
  return envelope.data as T
}

async function readLocalSettings(): Promise<SecBoardSettingsV1> {
  const api = window.lanstart
  if (!api) return DEFAULT_SECBOARD_SETTINGS
  const read = async <T>(key: string, fallback: T): Promise<T> => {
    try {
      return ((await api.getKv(key)) ?? fallback) as T
    } catch {
      return fallback
    }
  }
  const unwrap = (value: unknown): unknown => value && typeof value === 'object' && 'value' in value
    ? (value as { value: unknown }).value
    : value
  const appearance = unwrap(await read('app-appearance', 'light'))
  const color = unwrap(await read('whiteboard-bg-color', '#ffffff'))
  const image = unwrap(await read('whiteboard-bg-image-url', ''))
  const opacity = Number(unwrap(await read('whiteboard-bg-image-opacity', 0.5)))
  const merge = unwrap(await read('video-show-merge-layers', true))
  return {
    version: 1,
    appearance: appearance === 'dark' ? 'dark' : 'light',
    writingEngine: 'leafer',
    leafer: { ...DEFAULT_SECBOARD_SETTINGS.leafer, ...(await read('leafer-settings', {})) },
    whiteboard: {
      backgroundColor: typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#ffffff',
      backgroundImageUrl: typeof image === 'string' ? image : '',
      backgroundImageOpacity: Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 0.5
    },
    videoShow: { mergeLayers: typeof merge === 'boolean' ? merge : true }
  }
}

async function patchLocalSettings(patch: SecBoardSettingsPatch): Promise<SecBoardSettingsV1> {
  const api = window.lanstart
  const current = await readLocalSettings()
  const next: SecBoardSettingsV1 = {
    ...current,
    ...patch,
    version: 1,
    writingEngine: 'leafer',
    leafer: { ...current.leafer, ...patch.leafer },
    whiteboard: { ...current.whiteboard, ...patch.whiteboard },
    videoShow: { ...current.videoShow, ...patch.videoShow }
  }
  if (!api) return next
  await Promise.all([
    api.putKv('app-appearance', next.appearance),
    api.putKv('writing-framework', 'leafer'),
    api.putKv('leafer-settings', next.leafer),
    api.putKv('whiteboard-bg-color', next.whiteboard.backgroundColor),
    api.putKv('whiteboard-bg-image-url', next.whiteboard.backgroundImageUrl),
    api.putKv('whiteboard-bg-image-opacity', next.whiteboard.backgroundImageOpacity),
    api.putKv('video-show-merge-layers', next.videoShow.mergeLayers)
  ])
  return next
}

export const secBoardApi = {
  async getSettings(): Promise<SecBoardSettingsV1> {
    try {
      return unwrap<SecBoardSettingsV1>(await client().api.v1.settings.get())
    } catch {
      return readLocalSettings()
    }
  },
  async patchSettings(patch: SecBoardSettingsPatch): Promise<SecBoardSettingsV1> {
    try {
      return unwrap<SecBoardSettingsV1>(await client().api.v1.settings.patch(patch))
    } catch {
      return patchLocalSettings(patch)
    }
  },
  async getAnnotations(mode: AppMode): Promise<AnnotationBookV2 | null> {
    const response = await client().api.v1.annotations({ mode }).get()
    if (response.error && (response.error as any)?.status === 404) return null
    return unwrap<AnnotationBookV2>(response)
  },
  async putAnnotations(mode: AppMode, book: AnnotationBookV2): Promise<AnnotationBookV2> {
    return unwrap<AnnotationBookV2>(await client().api.v1.annotations({ mode }).put(book))
  },
  async executeSystemCommand(command: SystemCommandRequest): Promise<unknown> {
    return unwrap<unknown>(await client().api.v1.system.commands.post(command))
  }
}
