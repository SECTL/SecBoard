import type { AppMode } from '../api/contracts'

export type FrontendWritingAction =
  | { type: 'tool.set'; tool: 'mouse' | 'pen' | 'eraser' }
  | { type: 'pen.set'; pen: { type: 'writing' | 'highlighter' | 'laser'; color: string; thickness: number } }
  | { type: 'eraser.set'; eraser: { type: 'pixel' | 'stroke'; thickness: number } }
  | { type: 'history.undo' }
  | { type: 'history.redo' }
  | { type: 'page.clear' }
  | { type: 'page.previous' }
  | { type: 'page.next' }
  | { type: 'page.add' }
  | { type: 'page.delete' }
  | { type: 'page.select'; index: number }
  | { type: 'mode.set'; mode: AppMode }

export function commandToWritingAction(command: string, payload?: unknown): FrontendWritingAction | null {
  const body = (payload ?? {}) as Record<string, unknown>
  switch (command) {
    case 'app.setTool':
      return { type: 'tool.set', tool: body.tool === 'pen' || body.tool === 'eraser' ? body.tool : 'mouse' }
    case 'app.setPenSettings':
      return {
        type: 'pen.set',
        pen: {
          type: body.type === 'highlighter' || body.type === 'laser' ? body.type : 'writing',
          color: typeof body.color === 'string' ? body.color : '#333333',
          thickness: Number.isFinite(Number(body.thickness)) ? Number(body.thickness) : 6
        }
      }
    case 'app.setEraserSettings':
      return {
        type: 'eraser.set',
        eraser: {
          type: body.type === 'stroke' ? 'stroke' : 'pixel',
          thickness: Number.isFinite(Number(body.thickness)) ? Number(body.thickness) : 18
        }
      }
    case 'app.undo': return { type: 'history.undo' }
    case 'app.redo': return { type: 'history.redo' }
    case 'app.clearPage': return { type: 'page.clear' }
    case 'app.prevPage': return { type: 'page.previous' }
    case 'app.nextPage': return { type: 'page.next' }
    case 'app.newPage': return { type: 'page.add' }
    case 'app.deletePage': return { type: 'page.delete' }
    case 'notes.setPageIndex': return { type: 'page.select', index: Number(body.index) || 0 }
    case 'settings.setAppMode':
      return body.mode === 'whiteboard' || body.mode === 'video-show' || body.mode === 'toolbar'
        ? { type: 'mode.set', mode: body.mode }
        : null
    default:
      return null
  }
}

export function isFrontendWritingCommand(command: string): boolean {
  return commandToWritingAction(command) !== null
}
