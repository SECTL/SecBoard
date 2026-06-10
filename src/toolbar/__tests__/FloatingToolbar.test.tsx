import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FloatingToolbarApp } from '../FloatingToolbar'
import { FeaturePanelMenu } from '../../toolbar-subwindows'

describe('FloatingToolbar', () => {
  it('posts create-window command on click', async () => {
    const user = userEvent.setup()
    const calls: Array<{ command: string; payload?: unknown }> = []
    window.lanstart = {
      postCommand: async (command, payload) => {
        calls.push({ command, payload })
        return null
      },
      getEvents: async () => ({ items: [], latest: 0 }),
      getKv: async () => {
        throw new Error('kv_not_found')
      },
      putKv: async () => null,
      getUiState: async () => ({}),
      putUiStateKey: async () => null,
      deleteUiStateKey: async () => null,
      apiRequest: async () => ({ status: 200, body: { ok: true } }),
      clipboardWriteText: async () => null,
      setZoomLevel: (level: number) => {},
      getZoomLevel: () => 1
    }

    render(<FeaturePanelMenu kind="feature-panel" />)
    await user.click(await screen.findByRole('button', { name: '数据库' }))

    expect(calls.length).toBeGreaterThan(0)
    expect(calls.map((c) => c.command)).toContain('create-window')
  })

  it('posts toggle-subwindow command on click', async () => {
    const user = userEvent.setup()
    const calls: Array<{ command: string; payload?: unknown }> = []
    window.lanstart = {
      postCommand: async (command, payload) => {
        calls.push({ command, payload })
        return null
      },
      getEvents: async () => ({ items: [], latest: 0 }),
      getKv: async () => {
        throw new Error('kv_not_found')
      },
      putKv: async () => null,
      getUiState: async () => ({}),
      putUiStateKey: async () => null,
      deleteUiStateKey: async () => null,
      apiRequest: async () => ({ status: 200, body: { ok: true } }),
      clipboardWriteText: async () => null,
      setZoomLevel: (level: number) => {},
      getZoomLevel: () => 1
    }

    render(<FeaturePanelMenu kind="feature-panel" />)
    await user.click(await screen.findByRole('button', { name: '事件' }))

    expect(calls.map((c) => c.command)).toContain('toggle-subwindow')
  })

  it('posts app mode command when entering video show', async () => {
    const user = userEvent.setup()
    const calls: Array<{ command: string; payload?: unknown }> = []
    window.lanstart = {
      postCommand: async (command, payload) => {
        calls.push({ command, payload })
        return null
      },
      getEvents: async () => ({ items: [], latest: 0 }),
      getKv: async () => {
        throw new Error('kv_not_found')
      },
      putKv: async () => null,
      getUiState: async () => ({ mode: 'whiteboard' }),
      putUiStateKey: async () => null,
      deleteUiStateKey: async () => null,
      apiRequest: async () => ({ status: 200, body: { ok: true } }),
      clipboardWriteText: async () => null,
      setZoomLevel: (level: number) => {},
      getZoomLevel: () => 1
    }

    render(<FloatingToolbarApp />)
    await user.click(await screen.findByRole('button', { name: '视频展台' }))

    expect(calls).toContainEqual({ command: 'settings.setAppMode', payload: { mode: 'video-show' } })
  })

  it('posts app mode command when returning to whiteboard', async () => {
    const user = userEvent.setup()
    const calls: Array<{ command: string; payload?: unknown }> = []
    window.lanstart = {
      postCommand: async (command, payload) => {
        calls.push({ command, payload })
        return null
      },
      getEvents: async () => ({ items: [], latest: 0 }),
      getKv: async () => {
        throw new Error('kv_not_found')
      },
      putKv: async () => null,
      getUiState: async () => ({ mode: 'video-show' }),
      putUiStateKey: async () => null,
      deleteUiStateKey: async () => null,
      apiRequest: async () => ({ status: 200, body: { ok: true } }),
      clipboardWriteText: async () => null,
      setZoomLevel: () => {},
      getZoomLevel: () => 1
    }

    render(<FloatingToolbarApp />)
    await new Promise((r) => setTimeout(r, 0))
    await user.click(await screen.findByRole('button', { name: '白板' }))

    expect(calls).toContainEqual({ command: 'settings.setAppMode', payload: { mode: 'whiteboard' } })
  })

  it('does not raise unhandled rejection on quit', async () => {
    const user = userEvent.setup()
    window.lanstart = {
      postCommand: async () => {
        throw new Error('command_failed')
      },
      getEvents: async () => ({ items: [], latest: 0 }),
      getKv: async () => {
        throw new Error('kv_not_found')
      },
      putKv: async () => null,
      getUiState: async () => ({}),
      putUiStateKey: async () => null,
      deleteUiStateKey: async () => null,
      apiRequest: async () => ({ status: 200, body: { ok: true } }),
      clipboardWriteText: async () => null,
      setZoomLevel: (level: number) => {},
      getZoomLevel: () => 1
    }

    const unhandled = vi.fn()
    window.addEventListener('unhandledrejection', unhandled as any)

    render(<FeaturePanelMenu kind="feature-panel" />)
    await user.click(await screen.findByRole('button', { name: '退出' }))
    await new Promise((r) => setTimeout(r, 0))

    expect(unhandled).toHaveBeenCalledTimes(0)
    window.removeEventListener('unhandledrejection', unhandled as any)
  })
})
