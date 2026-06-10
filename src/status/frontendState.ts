import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import {
  type AppMode,
  type PenType,
  type EraserType,
  TOOL_UI_STATE_KEY,
  PEN_TYPE_UI_STATE_KEY,
  PEN_COLOR_UI_STATE_KEY,
  PEN_THICKNESS_UI_STATE_KEY,
  ERASER_TYPE_UI_STATE_KEY,
  ERASER_THICKNESS_UI_STATE_KEY,
  APP_MODE_UI_STATE_KEY,
  NOTES_PAGE_INDEX_UI_STATE_KEY,
  NOTES_PAGE_TOTAL_UI_STATE_KEY,
  UNDO_REV_UI_STATE_KEY,
  REDO_REV_UI_STATE_KEY,
  CLEAR_PAGE_REV_UI_STATE_KEY,
  WHITEBOARD_BG_COLOR_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY
} from './keys'

export type Tool = 'pen' | 'eraser' | 'mouse'

export interface FrontendState {
  tool: Tool
  penType: PenType
  penColor: string
  penThickness: number
  eraserType: EraserType
  eraserThickness: number
  appMode: AppMode
  notesPageIndex: number
  notesPageTotal: number
  undoRev: number
  redoRev: number
  clearRev: number
  whiteboardBgColor: string
  whiteboardBgImageUrl: string
  whiteboardBgImageOpacity: number
}

const initialState: FrontendState = {
  tool: 'pen',
  penType: 'writing',
  penColor: '#333333',
  penThickness: 6,
  eraserType: 'stroke',
  eraserThickness: 18,
  appMode: 'whiteboard',
  notesPageIndex: 0,
  notesPageTotal: 1,
  undoRev: 0,
  redoRev: 0,
  clearRev: 0,
  whiteboardBgColor: '#ffffff',
  whiteboardBgImageUrl: '',
  whiteboardBgImageOpacity: 1
}

type FrontendAction =
  | { type: 'SET_TOOL'; payload: Tool }
  | { type: 'SET_PEN_SETTINGS'; payload: { type?: PenType; color?: string; thickness?: number } }
  | { type: 'SET_ERASER_SETTINGS'; payload: { type?: EraserType; thickness?: number } }
  | { type: 'CLEAR_PAGE' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'NEXT_PAGE' }
  | { type: 'PREV_PAGE' }
  | { type: 'NEW_PAGE' }
  | { type: 'SET_PAGE_INDEX'; payload: number }
  | { type: 'SET_WHITEBOARD_BACKGROUND'; payload: { bgColor?: string; bgImageUrl?: string; bgImageOpacity?: number } }
  | { type: 'SET_APP_MODE'; payload: AppMode }
  | { type: 'SET_NOTES_PAGE_TOTAL'; payload: number }
  | { type: 'HYDRATE'; payload: Partial<FrontendState> }

function frontendReducer(state: FrontendState, action: FrontendAction): FrontendState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, tool: action.payload }

    case 'SET_PEN_SETTINGS':
      return {
        ...state,
        penType: action.payload.type ?? state.penType,
        penColor: action.payload.color ?? state.penColor,
        penThickness: action.payload.thickness ?? state.penThickness
      }

    case 'SET_ERASER_SETTINGS':
      return {
        ...state,
        eraserType: action.payload.type ?? state.eraserType,
        eraserThickness: action.payload.thickness ?? state.eraserThickness
      }

    case 'CLEAR_PAGE':
      return { ...state, clearRev: state.clearRev + 1 }

    case 'UNDO':
      return { ...state, undoRev: state.undoRev + 1 }

    case 'REDO':
      return { ...state, redoRev: state.redoRev + 1 }

    case 'NEXT_PAGE':
      return {
        ...state,
        notesPageIndex: Math.min(state.notesPageIndex + 1, state.notesPageTotal - 1)
      }

    case 'PREV_PAGE':
      return {
        ...state,
        notesPageIndex: Math.max(state.notesPageIndex - 1, 0)
      }

    case 'NEW_PAGE':
      return {
        ...state,
        notesPageTotal: state.notesPageTotal + 1,
        notesPageIndex: state.notesPageTotal
      }

    case 'SET_PAGE_INDEX':
      return {
        ...state,
        notesPageIndex: Math.max(0, Math.min(action.payload, state.notesPageTotal - 1))
      }

    case 'SET_WHITEBOARD_BACKGROUND':
      return {
        ...state,
        whiteboardBgColor: action.payload.bgColor ?? state.whiteboardBgColor,
        whiteboardBgImageUrl: action.payload.bgImageUrl ?? state.whiteboardBgImageUrl,
        whiteboardBgImageOpacity: action.payload.bgImageOpacity ?? state.whiteboardBgImageOpacity
      }

    case 'SET_APP_MODE':
      return { ...state, appMode: action.payload }

    case 'SET_NOTES_PAGE_TOTAL':
      return {
        ...state,
        notesPageTotal: Math.max(1, action.payload),
        notesPageIndex: Math.min(state.notesPageIndex, Math.max(0, action.payload - 1))
      }

    case 'HYDRATE':
      return { ...state, ...action.payload }

    default:
      return state
  }
}

export interface FrontendStateContextValue {
  state: FrontendState
  dispatch: React.Dispatch<FrontendAction>
  setTool: (tool: Tool) => void
  setPenSettings: (type?: PenType, color?: string, thickness?: number) => void
  setEraserSettings: (type?: EraserType, thickness?: number) => void
  clearPage: () => void
  undo: () => void
  redo: () => void
  nextPage: () => void
  prevPage: () => void
  newPage: () => void
  setPageIndex: (index: number) => void
  setWhiteboardBackground: (bgColor?: string, bgImageUrl?: string, bgImageOpacity?: number) => void
  setAppMode: (mode: AppMode) => void
  setNotesPageTotal: (total: number) => void
  hydrate: (partial: Partial<FrontendState>) => void
}

export const FrontendStateContext = createContext<FrontendStateContextValue | null>(null)

export interface FrontendStateProviderProps {
  children: ReactNode
  initialState?: Partial<FrontendState>
}

export function FrontendStateProvider({ children, initialState: initialOverride }: FrontendStateProviderProps) {
  const [state, dispatch] = useReducer(frontendReducer, {
    ...initialState,
    ...initialOverride
  })

  const setTool = useCallback((tool: Tool) => {
    dispatch({ type: 'SET_TOOL', payload: tool })
  }, [])

  const setPenSettings = useCallback((type?: PenType, color?: string, thickness?: number) => {
    dispatch({ type: 'SET_PEN_SETTINGS', payload: { type, color, thickness } })
  }, [])

  const setEraserSettings = useCallback((type?: EraserType, thickness?: number) => {
    dispatch({ type: 'SET_ERASER_SETTINGS', payload: { type, thickness } })
  }, [])

  const clearPage = useCallback(() => {
    dispatch({ type: 'CLEAR_PAGE' })
  }, [])

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  const nextPage = useCallback(() => {
    dispatch({ type: 'NEXT_PAGE' })
  }, [])

  const prevPage = useCallback(() => {
    dispatch({ type: 'PREV_PAGE' })
  }, [])

  const newPage = useCallback(() => {
    dispatch({ type: 'NEW_PAGE' })
  }, [])

  const setPageIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_PAGE_INDEX', payload: index })
  }, [])

  const setWhiteboardBackground = useCallback((bgColor?: string, bgImageUrl?: string, bgImageOpacity?: number) => {
    dispatch({ type: 'SET_WHITEBOARD_BACKGROUND', payload: { bgColor, bgImageUrl, bgImageOpacity } })
  }, [])

  const setAppMode = useCallback((mode: AppMode) => {
    dispatch({ type: 'SET_APP_MODE', payload: mode })
  }, [])

  const setNotesPageTotal = useCallback((total: number) => {
    dispatch({ type: 'SET_NOTES_PAGE_TOTAL', payload: total })
  }, [])

  const hydrate = useCallback((partial: Partial<FrontendState>) => {
    dispatch({ type: 'HYDRATE', payload: partial })
  }, [])

  const value: FrontendStateContextValue = {
    state,
    dispatch,
    setTool,
    setPenSettings,
    setEraserSettings,
    clearPage,
    undo,
    redo,
    nextPage,
    prevPage,
    newPage,
    setPageIndex,
    setWhiteboardBackground,
    setAppMode,
    setNotesPageTotal,
    hydrate
  }

  return React.createElement(FrontendStateContext.Provider, { value }, children)
}

export function useFrontendState(): FrontendStateContextValue {
  const context = useContext(FrontendStateContext)
  if (!context) {
    throw new Error('useFrontendState must be used within a FrontendStateProvider')
  }
  return context
}

export function useOptionalFrontendState(): FrontendStateContextValue | null {
  return useContext(FrontendStateContext)
}

export function useFrontendStateValue(): FrontendState {
  const { state } = useFrontendState()
  return state
}

export function useTool(): Tool {
  const { state } = useFrontendState()
  return state.tool
}

export function usePenSettings(): { penType: PenType; penColor: string; penThickness: number } {
  const { state } = useFrontendState()
  return {
    penType: state.penType,
    penColor: state.penColor,
    penThickness: state.penThickness
  }
}

export function useEraserSettings(): { eraserType: EraserType; eraserThickness: number } {
  const { state } = useFrontendState()
  return {
    eraserType: state.eraserType,
    eraserThickness: state.eraserThickness
  }
}

export function useAppModeState(): AppMode {
  const { state } = useFrontendState()
  return state.appMode
}

export function useNotesPage(): { pageIndex: number; pageTotal: number } {
  const { state } = useFrontendState()
  return {
    pageIndex: state.notesPageIndex,
    pageTotal: state.notesPageTotal
  }
}

export function useRevision(): { undoRev: number; redoRev: number; clearRev: number } {
  const { state } = useFrontendState()
  return {
    undoRev: state.undoRev,
    redoRev: state.redoRev,
    clearRev: state.clearRev
  }
}

export function useWhiteboardBackground(): {
  bgColor: string
  bgImageUrl: string
  bgImageOpacity: number
} {
  const { state } = useFrontendState()
  return {
    bgColor: state.whiteboardBgColor,
    bgImageUrl: state.whiteboardBgImageUrl,
    bgImageOpacity: state.whiteboardBgImageOpacity
  }
}

export function toUiStateSnapshot(state: FrontendState): Record<string, unknown> {
  return {
    [TOOL_UI_STATE_KEY]: state.tool,
    [PEN_TYPE_UI_STATE_KEY]: state.penType,
    [PEN_COLOR_UI_STATE_KEY]: state.penColor,
    [PEN_THICKNESS_UI_STATE_KEY]: state.penThickness,
    [ERASER_TYPE_UI_STATE_KEY]: state.eraserType,
    [ERASER_THICKNESS_UI_STATE_KEY]: state.eraserThickness,
    [APP_MODE_UI_STATE_KEY]: state.appMode,
    [NOTES_PAGE_INDEX_UI_STATE_KEY]: state.notesPageIndex,
    [NOTES_PAGE_TOTAL_UI_STATE_KEY]: state.notesPageTotal,
    [UNDO_REV_UI_STATE_KEY]: state.undoRev,
    [REDO_REV_UI_STATE_KEY]: state.redoRev,
    [CLEAR_PAGE_REV_UI_STATE_KEY]: state.clearRev,
    [WHITEBOARD_BG_COLOR_UI_STATE_KEY]: state.whiteboardBgColor,
    [WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY]: state.whiteboardBgImageUrl,
    [WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY]: state.whiteboardBgImageOpacity
  }
}

export function fromUiStateSnapshot(snapshot: Record<string, unknown>): Partial<FrontendState> {
  const result: Partial<FrontendState> = {}

  const tool = snapshot[TOOL_UI_STATE_KEY]
  if (tool === 'pen' || tool === 'eraser' || tool === 'mouse') {
    result.tool = tool
  }

  const penType = snapshot[PEN_TYPE_UI_STATE_KEY]
  if (penType === 'writing' || penType === 'highlighter' || penType === 'laser') {
    result.penType = penType
  }

  const penColor = snapshot[PEN_COLOR_UI_STATE_KEY]
  if (typeof penColor === 'string') {
    result.penColor = penColor
  }

  const penThickness = snapshot[PEN_THICKNESS_UI_STATE_KEY]
  if (typeof penThickness === 'number') {
    result.penThickness = penThickness
  }

  const eraserType = snapshot[ERASER_TYPE_UI_STATE_KEY]
  if (eraserType === 'stroke' || eraserType === 'pixel') {
    result.eraserType = eraserType
  }

  const eraserThickness = snapshot[ERASER_THICKNESS_UI_STATE_KEY]
  if (typeof eraserThickness === 'number') {
    result.eraserThickness = eraserThickness
  }

  const appMode = snapshot[APP_MODE_UI_STATE_KEY]
  if (appMode === 'toolbar' || appMode === 'whiteboard' || appMode === 'video-show') {
    result.appMode = appMode
  }

  const notesPageIndex = snapshot[NOTES_PAGE_INDEX_UI_STATE_KEY]
  if (typeof notesPageIndex === 'number') {
    result.notesPageIndex = notesPageIndex
  }

  const notesPageTotal = snapshot[NOTES_PAGE_TOTAL_UI_STATE_KEY]
  if (typeof notesPageTotal === 'number') {
    result.notesPageTotal = notesPageTotal
  }

  const undoRev = snapshot[UNDO_REV_UI_STATE_KEY]
  if (typeof undoRev === 'number') {
    result.undoRev = undoRev
  }

  const redoRev = snapshot[REDO_REV_UI_STATE_KEY]
  if (typeof redoRev === 'number') {
    result.redoRev = redoRev
  }

  const clearRev = snapshot[CLEAR_PAGE_REV_UI_STATE_KEY]
  if (typeof clearRev === 'number') {
    result.clearRev = clearRev
  }

  const whiteboardBgColor = snapshot[WHITEBOARD_BG_COLOR_UI_STATE_KEY]
  if (typeof whiteboardBgColor === 'string') {
    result.whiteboardBgColor = whiteboardBgColor
  }

  const whiteboardBgImageUrl = snapshot[WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY]
  if (typeof whiteboardBgImageUrl === 'string') {
    result.whiteboardBgImageUrl = whiteboardBgImageUrl
  }

  const whiteboardBgImageOpacity = snapshot[WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY]
  if (typeof whiteboardBgImageOpacity === 'number') {
    result.whiteboardBgImageOpacity = whiteboardBgImageOpacity
  }

  return result
}

export { initialState }
export type { FrontendAction }
