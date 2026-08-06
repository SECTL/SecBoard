import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Button, ButtonGroup } from '../button'
import { motion, useReducedMotion } from '../Framer_Motion'
import {
  ArrowUndo20Regular,
  ArrowRedo20Regular,
  AlertOn20Regular,
  Clock20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  GridKanban20Regular,
  Cursor20Regular,
  Edit20Regular,
  Eraser20Regular,
  Whiteboard20Regular,
  Video20Regular,
} from '@fluentui/react-icons'
import {
  ERASER_SETTINGS_KV_KEY,
  PEN_SETTINGS_KV_KEY,
  TOOLBAR_STATE_KEY,
  TOOLBAR_STATE_UI_STATE_KEY,
  TOOL_UI_STATE_KEY,
  UI_STATE_APP_WINDOW_ID,
  getKv,
  putKv,
  isEraserSettings,
  isPenSettings,
  putUiStateKey,
  useAppMode,
  useUiStateBus
} from '../status'
import { usePersistedState } from './hooks/usePersistedState'
import { getToolbarNoticeKind, postCommand, setToolbarNoticeVisible } from './hooks/useBackend'
import { useEventsPoll } from './hooks/useEventsPoll'
import { useToolbarWindowAutoResize } from './hooks/useToolbarWindowAutoResize'
import { useZoomOnWheel } from './hooks/useZoomOnWheel'
import { useAppearanceSettings } from '../settings'
import { getAppButtonVisibility } from './utils/constants'
import './styles/toolbar.css'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        window.clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        window.clearTimeout(timer)
        reject(e)
      }
    )
  })
}

function ToolbarToolIcon(props: { kind: 'mouse' | 'pen' | 'eraser' | 'whiteboard' | 'video-show' }) {
  const icons = {
    'mouse': <Cursor20Regular />,
    'pen': <Edit20Regular />,
    'eraser': <Eraser20Regular />,
    'whiteboard': <Whiteboard20Regular />,
    'video-show': <Video20Regular />,
  }
  return icons[props.kind] ?? <Cursor20Regular />
}

function UndoIcon() {
  return <ArrowUndo20Regular />
}

function RedoIcon() {
  return <ArrowRedo20Regular />
}

function EventsIcon() {
  return <AlertOn20Regular />
}

function ClockIcon() {
  return <Clock20Regular />
}

function ChevronLeftIcon() {
  return <ChevronLeft20Regular />
}

function ChevronRightIcon() {
  return <ChevronRight20Regular />
}

type ToolbarState = {
  collapsed: boolean
  uiWidth?: number
  uiButtonSize?: 'sm' | 'md'
  tool?: 'mouse' | 'pen' | 'eraser'
  expanded?: boolean
  allowedPrimaryButtons?: PrimaryButtonId[]
  allowedSecondaryButtons?: SecondaryButtonId[]
  primaryButtonsOrder?: PrimaryButtonId[]
  pinnedSecondaryButtonsOrder?: SecondaryButtonId[]
  secondaryButtonsOrder?: SecondaryButtonId[]
}

type PrimaryButtonId = 'mouse' | 'pen' | 'eraser' | 'whiteboard' | 'video-show'
type SecondaryButtonId = 'undo' | 'redo' | 'clock' | 'feature-panel' | 'events'

const ALL_SECONDARY_BUTTONS: SecondaryButtonId[] = ['undo', 'redo', 'clock', 'feature-panel', 'events']
const DEFAULT_ALLOWED_PRIMARY_BUTTONS: PrimaryButtonId[] = ['mouse', 'pen', 'eraser', 'whiteboard', 'video-show']
const DEFAULT_ALLOWED_SECONDARY_BUTTONS: SecondaryButtonId[] = ['undo', 'redo', 'feature-panel']

const DEFAULT_PRIMARY_BUTTONS_ORDER: PrimaryButtonId[] = ['mouse', 'pen', 'eraser', 'whiteboard', 'video-show']
const DEFAULT_SECONDARY_BUTTONS_ORDER: SecondaryButtonId[] = ['undo', 'redo', 'feature-panel']

function normalizeAllowedPrimaryButtons(input: unknown): PrimaryButtonId[] {
  if (!Array.isArray(input)) return DEFAULT_ALLOWED_PRIMARY_BUTTONS
  const allowed = new Set(DEFAULT_ALLOWED_PRIMARY_BUTTONS)
  const unique: PrimaryButtonId[] = []
  for (const item of input) {
    if (item !== 'mouse' && item !== 'pen' && item !== 'eraser' && item !== 'whiteboard' && item !== 'video-show') continue
    if (!allowed.has(item)) continue
    if (unique.includes(item)) continue
    unique.push(item)
  }
  return unique.length ? unique : DEFAULT_ALLOWED_PRIMARY_BUTTONS
}

function normalizeAllowedSecondaryButtons(input: unknown): SecondaryButtonId[] {
  if (!Array.isArray(input)) return DEFAULT_ALLOWED_SECONDARY_BUTTONS
  const allowed = new Set(ALL_SECONDARY_BUTTONS)
  const unique: SecondaryButtonId[] = []
  for (const item of input) {
    if (item !== 'undo' && item !== 'redo' && item !== 'clock' && item !== 'feature-panel' && item !== 'events') continue
    if (!allowed.has(item)) continue
    if (unique.includes(item)) continue
    unique.push(item)
  }
  return unique.length ? unique : DEFAULT_ALLOWED_SECONDARY_BUTTONS
}

function normalizePinnedSecondaryButtonsOrder(input: unknown, allowedButtons: readonly SecondaryButtonId[]): SecondaryButtonId[] {
  const allowed = new Set(allowedButtons)
  const unique: SecondaryButtonId[] = []
  if (Array.isArray(input)) {
    for (const item of input) {
      if (item !== 'undo' && item !== 'redo' && item !== 'clock' && item !== 'feature-panel' && item !== 'events') continue
      if (!allowed.has(item)) continue
      if (unique.includes(item)) continue
      unique.push(item)
    }
  }
  return unique
}

function normalizePrimaryButtonsOrder(input: unknown, allowedButtons: readonly PrimaryButtonId[]): PrimaryButtonId[] {
  const allowed = new Set(allowedButtons)
  const unique: PrimaryButtonId[] = []
  if (Array.isArray(input)) {
    for (const item of input) {
      if (item !== 'mouse' && item !== 'pen' && item !== 'eraser' && item !== 'whiteboard' && item !== 'video-show') continue
      if (!allowed.has(item)) continue
      if (unique.includes(item)) continue
      unique.push(item)
    }
  }

  for (const item of DEFAULT_PRIMARY_BUTTONS_ORDER) if (allowed.has(item) && !unique.includes(item)) unique.push(item)
  for (const item of allowedButtons) if (!unique.includes(item)) unique.push(item)
  return unique
}

function normalizeSecondaryButtonsOrder(
  input: unknown,
  allowedButtons: readonly SecondaryButtonId[],
  pinnedButtons?: readonly SecondaryButtonId[]
): SecondaryButtonId[] {
  const allowed = new Set(allowedButtons)
  const pinned = new Set(pinnedButtons ?? [])
  const unique: SecondaryButtonId[] = []
  if (Array.isArray(input)) {
    for (const item of input) {
      if (item !== 'undo' && item !== 'redo' && item !== 'clock' && item !== 'feature-panel' && item !== 'events') continue
      if (!allowed.has(item)) continue
      if (pinned.has(item)) continue
      if (unique.includes(item)) continue
      unique.push(item)
    }
  }

  for (const item of DEFAULT_SECONDARY_BUTTONS_ORDER) {
    if (!allowed.has(item)) continue
    if (pinned.has(item)) continue
    if (!unique.includes(item)) unique.push(item)
  }
  for (const item of allowedButtons) {
    if (pinned.has(item)) continue
    if (!unique.includes(item)) unique.push(item)
  }
  return unique
}

function arraysEqual<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function stripToolbarTool(value: ToolbarState): ToolbarState {
  const { tool: _drop, ...rest } = value as any
  return rest as ToolbarState
}

function isToolbarState(value: unknown): value is ToolbarState {
  if (!value || typeof value !== 'object') return false
  const v = value as any
  if (typeof v.collapsed !== 'boolean') return false
  if (v.uiWidth !== undefined && typeof v.uiWidth !== 'number') return false
  if (v.uiButtonSize !== undefined && v.uiButtonSize !== 'sm' && v.uiButtonSize !== 'md') return false
  if (v.tool !== undefined && v.tool !== 'mouse' && v.tool !== 'pen' && v.tool !== 'eraser') return false
  if (v.expanded !== undefined && typeof v.expanded !== 'boolean') return false
  if (v.allowedPrimaryButtons !== undefined && !Array.isArray(v.allowedPrimaryButtons)) return false
  if (v.allowedSecondaryButtons !== undefined && !Array.isArray(v.allowedSecondaryButtons)) return false
  if (v.primaryButtonsOrder !== undefined && !Array.isArray(v.primaryButtonsOrder)) return false
  if (v.pinnedSecondaryButtonsOrder !== undefined && !Array.isArray(v.pinnedSecondaryButtonsOrder)) return false
  if (v.secondaryButtonsOrder !== undefined && !Array.isArray(v.secondaryButtonsOrder)) return false
  return true
}

type ToolbarContextValue = {
  state: ToolbarState
  setState: (next: ToolbarState) => void
}

const ToolbarContext = createContext<ToolbarContextValue | null>(null)

function useToolbar() {
  const ctx = useContext(ToolbarContext)
  if (!ctx) throw new Error('ToolbarProviderMissing')
  return ctx
}

function ToolbarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = usePersistedState<ToolbarState>(TOOLBAR_STATE_KEY, {
    collapsed: false,
    uiWidth: 360,
    uiButtonSize: 'sm',
    expanded: true,
    allowedPrimaryButtons: DEFAULT_ALLOWED_PRIMARY_BUTTONS,
    allowedSecondaryButtons: DEFAULT_ALLOWED_SECONDARY_BUTTONS,
    primaryButtonsOrder: DEFAULT_PRIMARY_BUTTONS_ORDER,
    pinnedSecondaryButtonsOrder: [],
    secondaryButtonsOrder: DEFAULT_SECONDARY_BUTTONS_ORDER
  }, { validate: isToolbarState, mapLoad: stripToolbarTool, mapSave: stripToolbarTool })

  const bus = useUiStateBus(UI_STATE_APP_WINDOW_ID)
  const revRaw = bus.state[TOOLBAR_STATE_UI_STATE_KEY]
  const rev = typeof revRaw === 'number' ? revRaw : typeof revRaw === 'string' ? Number(revRaw) : 0
  const lastRevRef = useRef(0)

  useEffect(() => {
    if (!rev) return
    if (rev === lastRevRef.current) return
    lastRevRef.current = rev
    let cancelled = false

    ;(async () => {
      try {
        const loaded = await getKv<unknown>(TOOLBAR_STATE_KEY)
        if (cancelled) return
        if (!isToolbarState(loaded)) return
        setState(stripToolbarTool(loaded))
      } catch {
        return
      }
    })()

    return () => {
      cancelled = true
    }
  }, [rev, setState])

  useEffect(() => {
    const normalizedAllowedPrimary = normalizeAllowedPrimaryButtons((state as any).allowedPrimaryButtons)
    const normalizedAllowedSecondary = normalizeAllowedSecondaryButtons((state as any).allowedSecondaryButtons)
    const normalizedPinnedSecondary = normalizePinnedSecondaryButtonsOrder((state as any).pinnedSecondaryButtonsOrder, normalizedAllowedSecondary)
    const normalizedPrimary = normalizePrimaryButtonsOrder((state as any).primaryButtonsOrder, normalizedAllowedPrimary)
    const normalizedSecondary = normalizeSecondaryButtonsOrder((state as any).secondaryButtonsOrder, normalizedAllowedSecondary, normalizedPinnedSecondary)
    const normalized: ToolbarState = {
      collapsed: Boolean(state.collapsed),
      uiWidth: typeof state.uiWidth === 'number' ? state.uiWidth : 360,
      uiButtonSize: state.uiButtonSize === 'md' ? 'md' : 'sm',
      tool: state.tool === 'pen' ? 'pen' : state.tool === 'eraser' ? 'eraser' : 'mouse',
      expanded: state.expanded !== false,
      allowedPrimaryButtons: normalizedAllowedPrimary,
      allowedSecondaryButtons: normalizedAllowedSecondary,
      primaryButtonsOrder: normalizedPrimary,
      pinnedSecondaryButtonsOrder: normalizedPinnedSecondary,
      secondaryButtonsOrder: normalizedSecondary
    }
    if (
      normalized.collapsed !== state.collapsed ||
      normalized.uiWidth !== state.uiWidth ||
      normalized.uiButtonSize !== state.uiButtonSize ||
      normalized.tool !== state.tool ||
      normalized.expanded !== state.expanded ||
      !arraysEqual(normalizedAllowedPrimary, state.allowedPrimaryButtons) ||
      !arraysEqual(normalizedAllowedSecondary, state.allowedSecondaryButtons) ||
      !arraysEqual(normalizedPrimary, state.primaryButtonsOrder) ||
      !arraysEqual(normalizedPinnedSecondary, state.pinnedSecondaryButtonsOrder) ||
      !arraysEqual(normalizedSecondary, state.secondaryButtonsOrder)
    ) {
      setState(normalized)
    }
  }, [setState, state])

  const value = useMemo<ToolbarContextValue>(() => ({ state, setState }), [state, setState])

  return <ToolbarContext.Provider value={value}>{children}</ToolbarContext.Provider>
}

function FloatingToolbarInner() {
  const { state, setState } = useToolbar()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const lastBackendOkRef = useRef<boolean | null>(null)
  const uiButtonSize = state.uiButtonSize || 'sm'
  const reduceMotion = useReducedMotion()
  const tool: 'mouse' | 'pen' | 'eraser' = state.tool === 'pen' ? 'pen' : state.tool === 'eraser' ? 'eraser' : 'mouse'
  const { appMode, setAppMode } = useAppMode()
  const whiteboardActive = appMode === 'whiteboard'
  const videoShowActive = appMode === 'video-show'
  const isExpanded = state.expanded !== false
  const backendEvents = useEventsPoll(800)
  const lastProcessedEventIdRef = useRef(0)

  const { toolbarButtonHintsEnabled } = useAppearanceSettings()

  useToolbarWindowAutoResize({ root: contentRef.current })
  useZoomOnWheel()

  useEffect(() => {
    postCommand('app.setTool', { tool: 'pen' }).catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      if (cancelled) return
      let ok = false
      try {
        if (!window.lanstart) throw new Error('lanstart_unavailable')
        const res = await withTimeout(window.lanstart.apiRequest({ method: 'GET', path: '/health' }), 2200)
        ok = Boolean((res as any)?.body?.ok)
      } catch {
        ok = false
      }
      if (cancelled) return

      if (lastBackendOkRef.current === null) {
        lastBackendOkRef.current = ok
        return
      }

      if (ok === lastBackendOkRef.current) return
      lastBackendOkRef.current = ok

      if (!ok) {
        setToolbarNoticeVisible({ visible: true, kind: 'backendUnavailable' }).catch(() => undefined)
        return
      }

      getToolbarNoticeKind()
        .then((kind) => {
          if (kind !== 'backendUnavailable') return
          setToolbarNoticeVisible({ visible: false }).catch(() => undefined)
        })
        .catch(() => undefined)
    }

    check()
    const id = window.setInterval(check, 3200)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (!backendEvents.length) return
    const next = backendEvents.filter((e) => e.id > lastProcessedEventIdRef.current)
    if (!next.length) return
    lastProcessedEventIdRef.current = next[next.length - 1]!.id
  }, [backendEvents])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const pen = await getKv<unknown>(PEN_SETTINGS_KV_KEY)
        if (cancelled) return
        if (isPenSettings(pen)) {
          postCommand('app.setPenSettings', pen).catch(() => undefined)
        }
      } catch {}

      try {
        const eraser = await getKv<unknown>(ERASER_SETTINGS_KV_KEY)
        if (cancelled) return
        if (isEraserSettings(eraser)) {
          postCommand('app.setEraserSettings', eraser).catch(() => undefined)
        }
      } catch {}
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const toggleExpanded = () => {
    setState({ ...state, expanded: !isExpanded })
  }

  const handlePenClick = () => {
    void putUiStateKey(UI_STATE_APP_WINDOW_ID, TOOL_UI_STATE_KEY, 'pen')
    void postCommand('app.setTool', { tool: 'pen' })
    if (tool === 'pen') {
      void postCommand('toggle-subwindow', { kind: 'pen', placement: 'bottom' })
    } else {
      setState({ ...state, tool: 'pen' })
      if (tool === 'eraser') void postCommand('toggle-subwindow', { kind: 'eraser', placement: 'bottom' })
    }
  }

  const handleEraserClick = () => {
    void putUiStateKey(UI_STATE_APP_WINDOW_ID, TOOL_UI_STATE_KEY, 'eraser')
    void postCommand('app.setTool', { tool: 'eraser' })
    if (tool === 'eraser') {
      void postCommand('toggle-subwindow', { kind: 'eraser', placement: 'bottom' })
    } else {
      setState({ ...state, tool: 'eraser' })
      if (tool === 'pen') void postCommand('toggle-subwindow', { kind: 'pen', placement: 'bottom' })
    }
  }

  const handleMouseClick = () => {
    setState({ ...state, tool: 'mouse' })
    void putUiStateKey(UI_STATE_APP_WINDOW_ID, TOOL_UI_STATE_KEY, 'mouse')
    void postCommand('app.setTool', { tool: 'mouse' })
    if (tool === 'pen') void postCommand('toggle-subwindow', { kind: 'pen', placement: 'bottom' })
    else if (tool === 'eraser') void postCommand('toggle-subwindow', { kind: 'eraser', placement: 'bottom' })
  }

  const handleUndo = () => {
    void postCommand('app.undo')
  }

  const handleRedo = () => {
    void postCommand('app.redo')
  }

  const primaryButtonsOrder = state.primaryButtonsOrder ?? DEFAULT_PRIMARY_BUTTONS_ORDER
  const pinnedSecondaryButtonsOrder = state.pinnedSecondaryButtonsOrder ?? []
  const secondaryButtonsOrder = state.secondaryButtonsOrder ?? DEFAULT_SECONDARY_BUTTONS_ORDER

  const withButtonHint = (icon: React.ReactNode, label: string) => {
    if (!toolbarButtonHintsEnabled) return icon
    return (
      <span className="toolbarButtonStack">
        <span className="toolbarButtonIcon">{icon}</span>
        <span className="toolbarButtonHint">{label}</span>
      </span>
    )
  }

  const renderPrimaryButton = (id: PrimaryButtonId) => {
    if (id === 'mouse') {
      const visibility = getAppButtonVisibility('mouse')
      const ariaLabel = '鼠标'
      return (
        <Button
          key="mouse"
          size={uiButtonSize}
          variant={tool === 'mouse' ? 'light' : 'default'}
          ariaLabel={ariaLabel}
          title={ariaLabel}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={handleMouseClick}
        >
          {withButtonHint(<ToolbarToolIcon kind="mouse" />, ariaLabel)}
        </Button>
      )
    }

    if (id === 'pen') {
      const visibility = getAppButtonVisibility('pen')
      const ariaLabel = '笔'
      return (
        <Button
          key="pen"
          size={uiButtonSize}
          variant={tool === 'pen' ? 'light' : 'default'}
          ariaLabel={ariaLabel}
          title={tool === 'pen' ? '笔（再次点击打开设置）' : '笔'}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={handlePenClick}
        >
          {withButtonHint(<ToolbarToolIcon kind="pen" />, ariaLabel)}
        </Button>
      )
    }

    if (id === 'eraser') {
      const visibility = getAppButtonVisibility('eraser')
      const ariaLabel = '橡皮'
      return (
        <Button
          key="eraser"
          size={uiButtonSize}
          variant={tool === 'eraser' ? 'light' : 'default'}
          ariaLabel={ariaLabel}
          title={tool === 'eraser' ? '橡皮（再次点击打开设置）' : '橡皮'}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={handleEraserClick}
        >
          {withButtonHint(<ToolbarToolIcon kind="eraser" />, ariaLabel)}
        </Button>
      )
    }

    if (id === 'whiteboard') {
      const visibility = getAppButtonVisibility('whiteboard')
      const ariaLabel = '白板'
      return (
        <Button
          key="whiteboard"
          size={uiButtonSize}
          variant={whiteboardActive ? 'light' : 'default'}
          ariaLabel={ariaLabel}
          title={ariaLabel}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={() => {
            if (!whiteboardActive) setAppMode('whiteboard')
          }}
        >
          {withButtonHint(<ToolbarToolIcon kind="whiteboard" />, ariaLabel)}
        </Button>
      )
    }

    if (id === 'video-show') {
      const visibility = getAppButtonVisibility('video-show')
      const ariaLabel = '视频展台'
      return (
        <Button
          key="video-show"
          size={uiButtonSize}
          variant={videoShowActive ? 'light' : 'default'}
          ariaLabel={ariaLabel}
          title={ariaLabel}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={() => {
            setAppMode(videoShowActive ? 'whiteboard' : 'video-show')
          }}
        >
          {withButtonHint(<ToolbarToolIcon kind="video-show" />, ariaLabel)}
        </Button>
      )
    }

    return null
  }

  const renderSecondaryButton = (id: SecondaryButtonId) => {
    if (id === 'undo') {
      const visibility = getAppButtonVisibility('undo')
      const ariaLabel = '撤销'
      return (
        <Button
          key="undo"
          size={uiButtonSize}
          ariaLabel={ariaLabel}
          title={ariaLabel}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={handleUndo}
        >
          {withButtonHint(<UndoIcon />, ariaLabel)}
        </Button>
      )
    }

    if (id === 'redo') {
      const visibility = getAppButtonVisibility('redo')
      const ariaLabel = '重做'
      return (
        <Button
          key="redo"
          size={uiButtonSize}
          ariaLabel={ariaLabel}
          title={ariaLabel}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={handleRedo}
        >
          {withButtonHint(<RedoIcon />, ariaLabel)}
        </Button>
      )
    }

    if (id === 'clock') {
      const visibility = getAppButtonVisibility('clock')
      const ariaLabel = '时钟'
      return (
        <Button
          key="clock"
          size={uiButtonSize}
          ariaLabel={ariaLabel}
          title={ariaLabel}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={() => {
            void postCommand('toggle-subwindow', { kind: 'clock', placement: 'bottom' })
          }}
        >
          {withButtonHint(<ClockIcon />, ariaLabel)}
        </Button>
      )
    }

    if (id === 'events') {
      const visibility = getAppButtonVisibility('events')
      const ariaLabel = '事件'
      return (
        <Button
          key="events"
          size={uiButtonSize}
          ariaLabel={ariaLabel}
          title={ariaLabel}
          showInToolbar={visibility.showInToolbar}
          showInFeaturePanel={visibility.showInFeaturePanel}
          onClick={() => {
            void postCommand('toggle-subwindow', { kind: 'events', placement: 'bottom' })
          }}
        >
          {withButtonHint(<EventsIcon />, ariaLabel)}
        </Button>
      )
    }
    const visibility = getAppButtonVisibility('feature-panel')
    const ariaLabel = '功能面板'
    return (
      <Button
        key="feature-panel"
        size={uiButtonSize}
        ariaLabel={ariaLabel}
        title={ariaLabel}
        showInToolbar={visibility.showInToolbar}
        showInFeaturePanel={visibility.showInFeaturePanel}
        onClick={() => {
          void postCommand('toggle-subwindow', { kind: 'feature-panel', placement: 'bottom' })
        }}
      >
        {withButtonHint(
          <GridKanban20Regular />,
          ariaLabel
        )}
      </Button>
    )
  }

  return (
    <motion.div
      ref={rootRef}
      className="toolbarRoot"
      data-toolbar-button-hints={toolbarButtonHintsEnabled ? 'true' : undefined}
      initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.985 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? undefined : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div ref={contentRef} className="toolbarDragArea">
        <div className="toolbarLayout">
          {/* 主要工具按钮区域 */}
          <div className="toolbarBarRow">
            <ButtonGroup>
              {primaryButtonsOrder.map(renderPrimaryButton)}
              {pinnedSecondaryButtonsOrder.map(renderSecondaryButton)}
            </ButtonGroup>
          </div>

          {/* 折叠/展开切换按钮 */}
          <div className="toolbarBarRow">
            {(() => {
              const visibility = getAppButtonVisibility('toggle-expanded')
              return (
            <Button
              size={uiButtonSize}
              variant="light"
              className="toolbarToggleButton"
              title={isExpanded ? '点击折叠工具栏' : '点击展开工具栏'}
              showInToolbar={visibility.showInToolbar}
              showInFeaturePanel={visibility.showInFeaturePanel}
              onClick={toggleExpanded}
            >
              {withButtonHint(isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />, isExpanded ? '折叠' : '展开')}
            </Button>
              )
            })()}
          </div>

          {/* 可折叠区域 */}
          <motion.div
            className="toolbarCollapsibleSection"
            initial={false}
            animate={{
              width: isExpanded ? 'auto' : 0,
              opacity: isExpanded ? 1 : 0
            }}
            transition={reduceMotion ? undefined : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="toolbarBarRow toolbarCollapsibleContent">
              <ButtonGroup>
                {secondaryButtonsOrder.map(renderSecondaryButton)}
              </ButtonGroup>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export function FloatingToolbarApp() {
  return (
    <ToolbarProvider>
      <FloatingToolbarInner />
    </ToolbarProvider>
  )
}

export function FloatingToolbarHandleApp(props?: {
  onDragHandlePointerDown?: (e: React.PointerEvent) => void
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const reduceMotion = useReducedMotion()
  const [dragging, setDragging] = useState(false)

  useAppearanceSettings()

  useEffect(() => {
    if (!dragging) return
    const reset = () => setDragging(false)
    window.addEventListener('pointerup', reset, { passive: true })
    window.addEventListener('pointercancel', reset, { passive: true })
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('pointerup', reset)
      window.removeEventListener('pointercancel', reset)
      window.removeEventListener('blur', reset)
    }
  }, [dragging])

  return (
    <motion.div
      ref={rootRef}
      className="toolbarRoot toolbarHandleRoot"
      initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.985 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? undefined : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="toolbarHandleContent">
        <Button
          appRegion="drag"
          className={dragging ? 'toolbarDragHandleButton toolbarDragHandleButton--dragging' : 'toolbarDragHandleButton'}
          title="浮动工具栏拖动把手"
          onPointerDown={(e) => {
            setDragging(true)
            props?.onDragHandlePointerDown?.(e)
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <svg
            className="toolbarDragHandleIcon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
          >
            <path
              fill="currentColor"
              d={
                dragging
                  ? 'M8.25 17.25a.75.75 0 0 0 1.5 0V2.75a.75.75 0 0 0-1.5 0zm2 0a.75.75 0 0 0 1.5 0V2.75a.75.75 0 0 0-1.5 0z'
                  : 'M8.5 17.5a.5.5 0 0 0 1 0v-15a.5.5 0 0 0-1 0zm2 0a.5.5 0 0 0 1 0v-15a.5.5 0 0 0-1 0z'
              }
            />
          </svg>
        </Button>
      </div>
    </motion.div>
  )
}
