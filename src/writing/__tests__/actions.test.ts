import { describe, expect, it } from 'vitest'
import { commandToWritingAction, isFrontendWritingCommand } from '../actions'

describe('frontend writing action contract', () => {
  it('maps editing commands into typed frontend actions', () => {
    expect(commandToWritingAction('app.setTool', { tool: 'pen' })).toEqual({ type: 'tool.set', tool: 'pen' })
    expect(commandToWritingAction('app.undo')).toEqual({ type: 'history.undo' })
    expect(commandToWritingAction('notes.setPageIndex', { index: 3 })).toEqual({ type: 'page.select', index: 3 })
    expect(commandToWritingAction('settings.setAppMode', { mode: 'video-show' })).toEqual({ type: 'mode.set', mode: 'video-show' })
  })

  it('does not classify system commands as frontend writing', () => {
    expect(commandToWritingAction('win.quit')).toBeNull()
    expect(isFrontendWritingCommand('app.undo')).toBe(true)
    expect(isFrontendWritingCommand('win.setAnnotationInput')).toBe(false)
  })
})
