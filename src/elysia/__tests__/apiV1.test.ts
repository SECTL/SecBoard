import { describe, expect, it, vi } from 'vitest'
import { createApiV1 } from '../apiV1'
import { DEFAULT_SECBOARD_SETTINGS, type AnnotationBookV2 } from '../../api/contracts'

function createServices() {
  let settings = structuredClone(DEFAULT_SECBOARD_SETTINGS)
  const annotations = new Map<string, AnnotationBookV2>()
  return {
    services: {
      readSettings: vi.fn(async () => settings),
      patchSettings: vi.fn(async (patch: any) => {
        settings = {
          ...settings,
          ...patch,
          version: 1,
          writingEngine: 'leafer',
          leafer: { ...settings.leafer, ...patch.leafer },
          whiteboard: { ...settings.whiteboard, ...patch.whiteboard },
          videoShow: { ...settings.videoShow, ...patch.videoShow }
        }
        return settings
      }),
      readAnnotations: vi.fn(async (mode: string) => annotations.get(mode) ?? null),
      writeAnnotations: vi.fn(async (mode: string, book: AnnotationBookV2) => { annotations.set(mode, book) }),
      readEvents: vi.fn(() => ({ items: [], latest: 0 })),
      executeSystemCommand: vi.fn(async () => ({ accepted: true }))
    },
    annotations
  }
}

describe('SecBoard API v1', () => {
  it('reads and patches the unified settings document', async () => {
    const fixture = createServices()
    const app = createApiV1(fixture.services)

    const patchResponse = await app.handle(new Request('http://localhost/api/v1/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appearance: 'dark', leafer: { rendererEngine: 'webgl' } })
    }))
    expect(patchResponse.status).toBe(200)
    expect(await patchResponse.json()).toMatchObject({
      ok: true,
      data: { appearance: 'dark', writingEngine: 'leafer', leafer: { rendererEngine: 'webgl' } }
    })

    const getResponse = await app.handle(new Request('http://localhost/api/v1/settings'))
    expect(await getResponse.json()).toMatchObject({ ok: true, data: { appearance: 'dark' } })
  })

  it('validates annotation documents and returns the unified error shape', async () => {
    const fixture = createServices()
    const app = createApiV1(fixture.services)
    const response = await app.handle(new Request('http://localhost/api/v1/annotations/whiteboard', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version: 2, currentPage: -1, pages: [] })
    }))
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: 'Request validation failed' }
    })
  })

  it('round-trips mode-partitioned annotation books', async () => {
    const fixture = createServices()
    const app = createApiV1(fixture.services)
    const book: AnnotationBookV2 = { version: 2, currentPage: 0, pages: [{ version: 1, nodes: [] }] }
    const put = await app.handle(new Request('http://localhost/api/v1/annotations/video-show', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(book)
    }))
    expect(put.status).toBe(200)
    const get = await app.handle(new Request('http://localhost/api/v1/annotations/video-show'))
    expect(await get.json()).toEqual({ ok: true, data: book })
  })
})
