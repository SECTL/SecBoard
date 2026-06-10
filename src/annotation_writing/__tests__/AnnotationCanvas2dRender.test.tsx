import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'

const CANVAS_LEAFER_SETTINGS = {
  multiTouch: false,
  inkSmoothing: true,
  showInkWhenPassthrough: true,
  freezeScreen: false,
  rendererEngine: 'canvas2d',
  nibMode: 'off',
  postBakeOptimize: false,
  postBakeOptimizeOnce: false
} as const

function installDomDrawingStubs() {
  ;(globalThis as any).CanvasRenderingContext2D ??= function CanvasRenderingContext2D() {}
  ;(globalThis as any).Path2D ??= function Path2D() {}
  ;(globalThis as any).PointerEvent ??= class PointerEvent extends MouseEvent {}
  ;(globalThis as any).DragEvent ??= class DragEvent extends MouseEvent {}
  ;(globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 0)
  ;(globalThis as any).cancelAnimationFrame ??= (id: number) => window.clearTimeout(id)
  ;(globalThis as any).ResizeObserver ??= class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn()
  })
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn()
  })
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1280,
      bottom: 720,
      width: 1280,
      height: 720,
      toJSON: () => ({})
    })
  })
}

function pointerEvent(type: string, x: number, y: number) {
  const ev = new PointerEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
    button: 0
  })
  Object.defineProperty(ev, 'pointerId', { configurable: true, value: 1 })
  Object.defineProperty(ev, 'pointerType', { configurable: true, value: 'mouse' })
  return ev
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('Annotation canvas2d rendering', () => {
  it('renders writing strokes through the canvas2d context', async () => {
    installDomDrawingStubs()

    const stroke = vi.fn()
    const lineTo = vi.fn()
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo,
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: 'source-over',
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    } as unknown as CanvasRenderingContext2D
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    ;(HTMLCanvasElement.prototype as any).getContext = function getContext(type: string) {
      if (type === '2d') return ctx
      return originalGetContext?.call(this, type) ?? null
    }

    const putCalls: Array<{ key: string; value: unknown }> = []
    window.lanstart = {
      postCommand: async () => null,
      getEvents: async () => ({ items: [], latest: 0 }),
      getKv: async (key: string) => {
        if (key === 'leafer-settings') return CANVAS_LEAFER_SETTINGS as any
        throw new Error('kv_not_found')
      },
      putKv: async (key: string, value: unknown) => {
        putCalls.push({ key, value })
        return null
      },
      getUiState: async () => ({
        mode: 'whiteboard',
        tool: 'pen',
        penType: 'writing',
        penColor: '#333333',
        penThickness: 6,
        eraserType: 'pixel',
        eraserThickness: 18
      }),
      putUiStateKey: async () => null,
      deleteUiStateKey: async () => null,
      apiRequest: async () => ({ status: 200, body: { ok: true } }),
      clipboardWriteText: async () => null,
      setZoomLevel: () => {},
      getZoomLevel: () => 1
    }

    const { AnnotationOverlayApp } = await import('../leaferjs')
    const app = render(<AnnotationOverlayApp />)

    await waitFor(() => {
      expect(putCalls.some((c) => c.key === 'annotation-notes-whiteboard')).toBe(true)
    })

    const view = app.container.firstElementChild as HTMLElement
    const canvas = view.querySelector('canvas') as HTMLCanvasElement
    canvas.dispatchEvent(pointerEvent('pointerdown', 120, 160))
    canvas.dispatchEvent(pointerEvent('pointermove', 220, 240))
    canvas.dispatchEvent(pointerEvent('pointerup', 300, 280))

    await waitFor(() => {
      expect(lineTo).toHaveBeenCalled()
      expect(stroke).toHaveBeenCalled()
    })
  })
})
