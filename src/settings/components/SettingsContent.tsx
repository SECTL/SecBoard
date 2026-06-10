import {
  Cursor20Regular,
  Edit20Regular,
  Eraser20Regular,
  Whiteboard20Regular,
  Video20Regular,
  ArrowUndo20Regular,
  ArrowRedo20Regular,
  Clock20Regular,
  GridKanban20Regular,
  AlertOn20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  Add20Regular,
  Delete20Regular,
  Note20Regular,
  Database20Regular,
  Settings20Regular,
  ArrowExit20Regular,
  SlideText20Regular,
  Grid20Regular,
} from '@fluentui/react-icons'
import React from 'react'
import { Box, Select, Switch } from '@mantine/core'
import { motion, useReducedMotion } from '../../Framer_Motion'
import {
  APP_MODE_UI_STATE_KEY,
  LEAFER_SETTINGS_KV_KEY,
  LEAFER_SETTINGS_UI_STATE_KEY,
  TOOLBAR_STATE_KEY,
  TOOLBAR_STATE_UI_STATE_KEY,
  UI_STATE_APP_WINDOW_ID,
  VIDEO_SHOW_MERGE_LAYERS_KV_KEY,
  VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY,
  WHITEBOARD_BG_COLOR_KV_KEY,
  WHITEBOARD_BG_COLOR_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY,
  WHITEBOARD_BG_IMAGE_URL_KV_KEY,
  WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY,
  isFileOrDataUrl,
  isHexColor,
  isLeaferSettings,
  postCommand,
  putKv,
  putUiStateKey,
  readImageFileUrlAsDataUrl,
  selectImageFile,
  type LeaferSettings,
  useAppAppearance,
  usePersistedState,
  useUiStateBus
} from '../../status'
import {
  Button,
  APP_BUTTON_DEFINITIONS,
  getToolbarDefaultAllowedSecondaryButtonIds,
  getToolbarDefaultSecondaryOrder,
  getAppButtonLabel,
  getToolbarPrimaryButtonIds,
  getToolbarSecondaryButtonIds,
  isToolbarPrimaryButtonId,
  isToolbarSecondaryButtonId,
  type ToolbarPrimaryButtonId,
  type ToolbarSecondaryButtonId
} from '../../button'
import { getAppButtonVisibility, type AppButtonId } from '../../toolbar/utils/constants'
import type { SettingsTab } from '../types'
import { AccentColorPicker } from './AccentColorPicker'
import { TransitionSettings } from './TransitionSettings'
import { useAppearanceSettings } from '../hooks/useAppearanceSettings'
import { DatabaseIcon, EventsIcon, QuitIcon, SettingsIcon } from '../../toolbar/components/ToolbarIcons'
import './SettingsContent.css'

const notebookIconSvg = ''

interface SettingsContentProps {
  activeTab: SettingsTab
}

// 外观设置
function AppearanceSettings() {
  const { appearance, setAppearance } = useAppAppearance()
  const {
    accentColor,
    setAccentColor,
    toolbarButtonHintsEnabled,
    setToolbarButtonHintsEnabled,
    transitionPreset,
    setTransitionPreset,
    backgroundTransition,
    setBackgroundTransition,
  } = useAppearanceSettings()

  return (
    <div className="settingsContentSection">
      <h2 className="settingsContentTitle">外观</h2>
      <p className="settingsContentDescription">选择您喜欢的主题外观</p>

      {/* 主题模式 */}
      <div className="settingsAppearanceOptions">
        <Button
          kind="custom"
          appRegion="no-drag"
          ariaLabel="浅色主题"
          title="浅色主题"
          className={`settingsAppearanceCard ${appearance === 'light' ? 'settingsAppearanceCard--active' : ''}`}
          onClick={() => setAppearance('light')}
        >
          <div className="settingsAppearancePreview settingsAppearancePreview--light">
            <div className="settingsAppearancePreviewHeader" />
            <div className="settingsAppearancePreviewContent">
              <div className="settingsAppearancePreviewSidebar" />
              <div className="settingsAppearancePreviewMain" />
            </div>
          </div>
          <span className="settingsAppearanceLabel">浅色</span>
        </Button>

        <Button
          kind="custom"
          appRegion="no-drag"
          ariaLabel="深色主题"
          title="深色主题"
          className={`settingsAppearanceCard ${appearance === 'dark' ? 'settingsAppearanceCard--active' : ''}`}
          onClick={() => setAppearance('dark')}
        >
          <div className="settingsAppearancePreview settingsAppearancePreview--dark">
            <div className="settingsAppearancePreviewHeader" />
            <div className="settingsAppearancePreviewContent">
              <div className="settingsAppearancePreviewSidebar" />
              <div className="settingsAppearancePreviewMain" />
            </div>
          </div>
          <span className="settingsAppearanceLabel">深色</span>
        </Button>
      </div>

      <div className="settingsSubSection">
        <h3 className="settingsSubTitle">浮动工具栏</h3>
        <p className="settingsSubDescription">开启后，浮动工具栏按钮下方会显示文字提示</p>
        <Switch
          checked={toolbarButtonHintsEnabled}
          onChange={(e) => setToolbarButtonHintsEnabled(e.currentTarget.checked)}
          label="显示按钮文字提示"
          size="md"
        />
      </div>

      {/* 强调色设置 */}
      <div className="settingsSubSection">
        <h3 className="settingsSubTitle">
          强调色
          <span className="settingsSubTitleHint">（{appearance === 'dark' ? '深色' : '浅色'}模式独立设置）</span>
        </h3>
        <p className="settingsSubDescription">选择应用的主题强调色</p>
        <AccentColorPicker value={accentColor.value} onChange={setAccentColor} />
      </div>

      {/* 过渡效果设置 */}
      <div className="settingsSubSection">
        <h3 className="settingsSubTitle">过渡效果</h3>
        <p className="settingsSubDescription">调整界面动效和背景过渡效果</p>
        <TransitionSettings
          transitionPreset={transitionPreset.value}
          onTransitionChange={setTransitionPreset}
          backgroundTransition={backgroundTransition.value}
          onBackgroundTransitionChange={setBackgroundTransition}
        />
      </div>
    </div>
  )
}

// 浮动工具栏设置
function ToolbarSettings() {
  type PrimaryButtonId = ToolbarPrimaryButtonId
  type SecondaryButtonId = ToolbarSecondaryButtonId
  type SelectedButton =
    | { group: 'primary'; id: PrimaryButtonId }
    | { group: 'pinned'; id: SecondaryButtonId }
    | { group: 'secondary'; id: SecondaryButtonId }

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

  const DEFAULT_PRIMARY: PrimaryButtonId[] = getToolbarPrimaryButtonIds()
  const DEFAULT_SECONDARY: SecondaryButtonId[] = getToolbarDefaultAllowedSecondaryButtonIds()
  const ALL_SECONDARY: SecondaryButtonId[] = getToolbarSecondaryButtonIds()
  const DEFAULT_SECONDARY_ORDER: SecondaryButtonId[] = getToolbarDefaultSecondaryOrder()

  function normalizeAllowedPrimaryButtons(input: unknown): PrimaryButtonId[] {
    if (!Array.isArray(input)) return DEFAULT_PRIMARY
    const allowed = new Set(getToolbarPrimaryButtonIds())
    const unique: PrimaryButtonId[] = []
    for (const item of input) {
      if (!isToolbarPrimaryButtonId(item)) continue
      if (!allowed.has(item)) continue
      if (unique.includes(item)) continue
      unique.push(item)
    }
    return unique.length ? unique : DEFAULT_PRIMARY
  }

  function normalizeAllowedSecondaryButtons(input: unknown): SecondaryButtonId[] {
    if (!Array.isArray(input)) return DEFAULT_SECONDARY
    const allowed = new Set(getToolbarSecondaryButtonIds())
    const unique: SecondaryButtonId[] = []
    for (const item of input) {
      if (!isToolbarSecondaryButtonId(item)) continue
      if (!allowed.has(item)) continue
      if (unique.includes(item)) continue
      unique.push(item)
    }
    return unique.length ? unique : DEFAULT_SECONDARY
  }

  function normalizePrimaryButtonsOrder(input: unknown, allowedButtons: readonly PrimaryButtonId[]): PrimaryButtonId[] {
    const allowed = new Set(allowedButtons)
    const unique: PrimaryButtonId[] = []
    if (Array.isArray(input)) {
      for (const item of input) {
        if (!isToolbarPrimaryButtonId(item)) continue
        if (!allowed.has(item)) continue
        if (unique.includes(item)) continue
        unique.push(item)
      }
    }
    for (const item of DEFAULT_PRIMARY) if (allowed.has(item) && !unique.includes(item)) unique.push(item)
    for (const item of allowedButtons) if (!unique.includes(item)) unique.push(item)
    return unique
  }

  function normalizePinnedSecondaryButtonsOrder(input: unknown, allowedButtons: readonly SecondaryButtonId[]): SecondaryButtonId[] {
    const allowed = new Set(allowedButtons)
    const unique: SecondaryButtonId[] = []
    if (Array.isArray(input)) {
      for (const item of input) {
        if (!isToolbarSecondaryButtonId(item)) continue
        if (!allowed.has(item)) continue
        if (unique.includes(item)) continue
        unique.push(item)
      }
    }
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
        if (!isToolbarSecondaryButtonId(item)) continue
        if (!allowed.has(item)) continue
        if (pinned.has(item)) continue
        if (unique.includes(item)) continue
        unique.push(item)
      }
    }
    for (const item of DEFAULT_SECONDARY_ORDER) {
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

  const isToolbarState = (value: unknown): value is ToolbarState => {
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

  const stripToolbarTool = (value: ToolbarState): ToolbarState => {
    const { tool: _drop, ...rest } = value as any
    return rest as ToolbarState
  }

  const [toolbarState, setToolbarState] = usePersistedState<ToolbarState>(
    TOOLBAR_STATE_KEY,
    {
      collapsed: false,
      uiWidth: 360,
      uiButtonSize: 'sm',
      expanded: true,
      allowedPrimaryButtons: DEFAULT_PRIMARY,
      allowedSecondaryButtons: DEFAULT_SECONDARY,
      primaryButtonsOrder: DEFAULT_PRIMARY,
      pinnedSecondaryButtonsOrder: [],
      secondaryButtonsOrder: DEFAULT_SECONDARY,
    },
    { validate: isToolbarState, mapLoad: stripToolbarTool, mapSave: stripToolbarTool }
  )

  const allowedPrimaryButtons = normalizeAllowedPrimaryButtons((toolbarState as any).allowedPrimaryButtons)
  const allowedSecondaryButtons = normalizeAllowedSecondaryButtons((toolbarState as any).allowedSecondaryButtons)

  const primaryButtonsOrder = normalizePrimaryButtonsOrder(toolbarState.primaryButtonsOrder, allowedPrimaryButtons)
  const pinnedSecondaryButtonsOrder = normalizePinnedSecondaryButtonsOrder(
    (toolbarState as any).pinnedSecondaryButtonsOrder,
    allowedSecondaryButtons
  )
  const secondaryButtonsOrder = normalizeSecondaryButtonsOrder(toolbarState.secondaryButtonsOrder, allowedSecondaryButtons, pinnedSecondaryButtonsOrder)

  const labelForButton = (id: PrimaryButtonId | SecondaryButtonId) => {
    return getAppButtonLabel(id)
  }

  function ToolbarToolIcon(props: { kind: PrimaryButtonId }) {
    const icons: Record<PrimaryButtonId, React.ReactNode> = {
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

  function ClockIcon() {
    return <Clock20Regular />
  }

  function FeaturePanelIcon() {
    return <GridKanban20Regular />
  }

  function EventsIcon() {
    return <AlertOn20Regular />
  }

  function ChevronLeftIcon() {
    return <ChevronLeft20Regular />
  }

  function ChevronRightIcon() {
    return <ChevronRight20Regular />
  }

  function PlusIcon() {
    return <Add20Regular />
  }

  function TrashIcon() {
    return <Delete20Regular />
  }

  const iconForButton = (id: PrimaryButtonId | SecondaryButtonId) => {
    if (id === 'mouse') return <ToolbarToolIcon kind="mouse" />
    if (id === 'pen') return <ToolbarToolIcon kind="pen" />
    if (id === 'eraser') return <ToolbarToolIcon kind="eraser" />
    if (id === 'whiteboard') return <ToolbarToolIcon kind="whiteboard" />
    if (id === 'video-show') return <ToolbarToolIcon kind="video-show" />
    if (id === 'undo') return <UndoIcon />
    if (id === 'redo') return <RedoIcon />
    if (id === 'clock') return <ClockIcon />
    if (id === 'events') return <EventsIcon />
    return <FeaturePanelIcon />
  }

  const descriptionForButton = (id: PrimaryButtonId | SecondaryButtonId) => {
    if (id === 'mouse') return '切换到鼠标工具'
    if (id === 'pen') return '切换到画笔工具（再次点击可打开设置）'
    if (id === 'eraser') return '切换到橡皮擦工具'
    if (id === 'whiteboard') return '进入/退出白板模式'
    if (id === 'video-show') return '进入/退出视频展台模式'
    if (id === 'undo') return '撤销上一步操作'
    if (id === 'redo') return '重做上一步操作'
    if (id === 'clock') return '打开时钟窗口'
    if (id === 'events') return '打开事件列表窗口'
    return '打开功能面板'
  }

  const moveItem = <T,>(list: readonly T[], fromIndex: number, toIndex: number): T[] => {
    if (fromIndex === toIndex) return [...list]
    const next = [...list]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    return next
  }

  function SelectableToolbarButtonItem(props: {
    group: SelectedButton['group']
    id: PrimaryButtonId | SecondaryButtonId
    selected: boolean
    onSelect: () => void
  }) {
    const label = labelForButton(props.id)
    const icon = iconForButton(props.id)

    return (
      <div className="settingsToolbarReorderItem">
        <Button
          size="sm"
          variant={props.selected ? 'light' : undefined}
          title={label}
          ariaLabel={label}
          appRegion="no-drag"
          onClick={props.onSelect}
          onPointerDown={() => props.onSelect()}
        >
          {icon}
        </Button>
      </div>
    )
  }

  const [selectedButton, setSelectedButton] = React.useState<SelectedButton>({ group: 'primary', id: 'mouse' })

  React.useEffect(() => {
    if (selectedButton.group === 'primary') {
      if (!primaryButtonsOrder.includes(selectedButton.id)) {
        setSelectedButton({ group: 'primary', id: primaryButtonsOrder[0] ?? 'mouse' })
      }
      return
    }
    if (selectedButton.group === 'pinned') {
      if (!pinnedSecondaryButtonsOrder.length) {
        if (secondaryButtonsOrder.length) setSelectedButton({ group: 'secondary', id: secondaryButtonsOrder[0] ?? 'undo' })
        else setSelectedButton({ group: 'primary', id: primaryButtonsOrder[0] ?? 'mouse' })
        return
      }
      if (!pinnedSecondaryButtonsOrder.includes(selectedButton.id)) {
        setSelectedButton({ group: 'pinned', id: pinnedSecondaryButtonsOrder[0] ?? 'undo' })
      }
      return
    }
    if (!secondaryButtonsOrder.length) {
      if (pinnedSecondaryButtonsOrder.length) setSelectedButton({ group: 'pinned', id: pinnedSecondaryButtonsOrder[0] ?? 'undo' })
      else setSelectedButton({ group: 'primary', id: primaryButtonsOrder[0] ?? 'mouse' })
      return
    }
    if (!secondaryButtonsOrder.includes(selectedButton.id)) {
      setSelectedButton({ group: 'secondary', id: secondaryButtonsOrder[0] ?? 'undo' })
    }
  }, [pinnedSecondaryButtonsOrder, primaryButtonsOrder, secondaryButtonsOrder, selectedButton.group, selectedButton.id])

  const selectedLabel = labelForButton(selectedButton.id)
  const selectedIcon = iconForButton(selectedButton.id)
  const selectedIndex =
    selectedButton.group === 'primary'
      ? primaryButtonsOrder.indexOf(selectedButton.id)
      : selectedButton.group === 'pinned'
        ? pinnedSecondaryButtonsOrder.indexOf(selectedButton.id)
        : secondaryButtonsOrder.indexOf(selectedButton.id)
  const selectedCount =
    selectedButton.group === 'primary'
      ? primaryButtonsOrder.length
      : selectedButton.group === 'pinned'
        ? pinnedSecondaryButtonsOrder.length
        : secondaryButtonsOrder.length
  const canMovePrev = selectedIndex > 0
  const canMoveNext = selectedIndex >= 0 && selectedIndex < selectedCount - 1

  const persistToolbarState = (next: ToolbarState) => {
    const persisted = stripToolbarTool(next)
    setToolbarState(persisted)
    void (async () => {
      try {
        await putKv(TOOLBAR_STATE_KEY, persisted)
      } catch {
        return
      }
      try {
        await putUiStateKey(UI_STATE_APP_WINDOW_ID, TOOLBAR_STATE_UI_STATE_KEY, Date.now())
      } catch {
        return
      }
    })()
  }

  const moveSelected = (delta: -1 | 1) => {
    if (selectedButton.group === 'primary') {
      const order = primaryButtonsOrder
      const index = order.indexOf(selectedButton.id)
      if (index < 0) return
      const nextIndex = index + delta
      if (nextIndex < 0 || nextIndex >= order.length) return
      const nextOrder = moveItem(order, index, nextIndex)
      persistToolbarState({
        ...toolbarState,
        allowedPrimaryButtons,
        allowedSecondaryButtons,
        primaryButtonsOrder: nextOrder,
        pinnedSecondaryButtonsOrder,
        secondaryButtonsOrder,
      })
      return
    }

    if (selectedButton.group === 'pinned') {
      const order = pinnedSecondaryButtonsOrder
      const index = order.indexOf(selectedButton.id)
      if (index < 0) return
      const nextIndex = index + delta
      if (nextIndex < 0 || nextIndex >= order.length) return
      const nextOrder = moveItem(order, index, nextIndex)
      persistToolbarState({
        ...toolbarState,
        allowedPrimaryButtons,
        allowedSecondaryButtons,
        primaryButtonsOrder,
        pinnedSecondaryButtonsOrder: nextOrder,
        secondaryButtonsOrder,
      })
      return
    }

    const order = secondaryButtonsOrder
    const index = order.indexOf(selectedButton.id)
    if (index < 0) return
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= order.length) return
    const nextOrder = moveItem(order, index, nextIndex)
    persistToolbarState({
      ...toolbarState,
      allowedPrimaryButtons,
      allowedSecondaryButtons,
      primaryButtonsOrder,
      pinnedSecondaryButtonsOrder,
      secondaryButtonsOrder: nextOrder,
    })
  }

  const addButtonToToolbar = (placement: 'primary' | 'pinned' | 'secondary', id: PrimaryButtonId | SecondaryButtonId) => {
    if (placement === 'primary') {
      const nextId = id as PrimaryButtonId
      if (allowedPrimaryButtons.includes(nextId)) return
      const nextAllowed = [...allowedPrimaryButtons, nextId]
      const nextOrder = normalizePrimaryButtonsOrder([...primaryButtonsOrder, nextId], nextAllowed)
      persistToolbarState({
        ...toolbarState,
        allowedPrimaryButtons: nextAllowed,
        allowedSecondaryButtons,
        primaryButtonsOrder: nextOrder,
        pinnedSecondaryButtonsOrder,
        secondaryButtonsOrder,
      })
      return
    }

    const nextId = id as SecondaryButtonId
    const nextAllowed = allowedSecondaryButtons.includes(nextId) ? allowedSecondaryButtons : [...allowedSecondaryButtons, nextId]

    if (placement === 'pinned') {
      const nextPinned = normalizePinnedSecondaryButtonsOrder([...pinnedSecondaryButtonsOrder, nextId], nextAllowed)
      const nextSecondary = normalizeSecondaryButtonsOrder(
        secondaryButtonsOrder.filter((x) => x !== nextId),
        nextAllowed,
        nextPinned
      )
      persistToolbarState({
        ...toolbarState,
        allowedPrimaryButtons,
        allowedSecondaryButtons: nextAllowed,
        primaryButtonsOrder,
        pinnedSecondaryButtonsOrder: nextPinned,
        secondaryButtonsOrder: nextSecondary,
      })
      return
    }

    const nextPinned = normalizePinnedSecondaryButtonsOrder(
      pinnedSecondaryButtonsOrder.filter((x) => x !== nextId),
      nextAllowed
    )
    const nextSecondary = normalizeSecondaryButtonsOrder([...secondaryButtonsOrder, nextId], nextAllowed, nextPinned)
    persistToolbarState({
      ...toolbarState,
      allowedPrimaryButtons,
      allowedSecondaryButtons: nextAllowed,
      primaryButtonsOrder,
      pinnedSecondaryButtonsOrder: nextPinned,
      secondaryButtonsOrder: nextSecondary,
    })
  }

  const canDeleteSelected =
    selectedButton.group === 'primary'
      ? allowedPrimaryButtons.length > 1
      : allowedSecondaryButtons.includes(selectedButton.id as SecondaryButtonId)

  const deleteSelected = () => {
    if (selectedButton.group === 'primary') {
      const target = selectedButton.id
      if (!allowedPrimaryButtons.includes(target)) return
      const nextAllowed = allowedPrimaryButtons.filter((x) => x !== target)
      if (!nextAllowed.length) return
      const nextOrder = normalizePrimaryButtonsOrder(primaryButtonsOrder.filter((x) => x !== target), nextAllowed)
      persistToolbarState({
        ...toolbarState,
        allowedPrimaryButtons: nextAllowed,
        allowedSecondaryButtons,
        primaryButtonsOrder: nextOrder,
        pinnedSecondaryButtonsOrder,
        secondaryButtonsOrder,
      })
      return
    }

    const target = selectedButton.id as SecondaryButtonId
    const nextAllowed = allowedSecondaryButtons.filter((x) => x !== target)
    const nextPinned = normalizePinnedSecondaryButtonsOrder(
      pinnedSecondaryButtonsOrder.filter((x) => x !== target),
      nextAllowed
    )
    const nextSecondary = normalizeSecondaryButtonsOrder(
      secondaryButtonsOrder.filter((x) => x !== target),
      nextAllowed,
      nextPinned
    )
    persistToolbarState({
      ...toolbarState,
      allowedPrimaryButtons,
      allowedSecondaryButtons: nextAllowed,
      primaryButtonsOrder,
      pinnedSecondaryButtonsOrder: nextPinned,
      secondaryButtonsOrder: nextSecondary,
    })
  }

  const [pendingAdd, setPendingAdd] = React.useState<null | { id: PrimaryButtonId | SecondaryButtonId }>(null)

  const allAddableButtons: Array<{ group: SelectedButton['group']; id: PrimaryButtonId | SecondaryButtonId }> = [
    ...DEFAULT_PRIMARY.map((id) => ({ group: 'primary' as const, id })),
    ...ALL_SECONDARY.map((id) => ({ group: 'secondary' as const, id })),
  ]

  return (
    <div className="settingsContentSection">
      <h2 className="settingsContentTitle">浮动工具栏</h2>
      <p className="settingsContentDescription">配置浮动工具栏的外观和行为</p>

        <div className="settingsToolbarPreview">
          <div className="settingsToolbarPreviewTitle">按钮顺序预览</div>
          <div className="settingsToolbarPreviewHint">点击按钮查看信息，并用下方按钮调整前后顺序</div>

        <div className="settingsToolbarPreviewToolbarShell">
          <Box className="settingsToolbarPreviewToolbarDragArea">
            <Box className="settingsToolbarPreviewToolbarLayout">
              <Box className="settingsToolbarPreviewToolbarBarRow">
                <Box className="settingsToolbarReorderGroup flex flex-nowrap items-center gap-2">
                  {primaryButtonsOrder.map((id) => (
                    <SelectableToolbarButtonItem
                      key={id}
                      group="primary"
                      id={id}
                      selected={selectedButton.group === 'primary' && selectedButton.id === id}
                      onSelect={() => setSelectedButton({ group: 'primary', id })}
                    />
                  ))}
                  {pinnedSecondaryButtonsOrder.map((id) => (
                    <SelectableToolbarButtonItem
                      key={`pinned:${id}`}
                      group="pinned"
                      id={id}
                      selected={selectedButton.group === 'pinned' && selectedButton.id === id}
                      onSelect={() => setSelectedButton({ group: 'pinned', id })}
                    />
                  ))}
                </Box>
              </Box>

              <Box className="settingsToolbarPreviewToolbarBarRow">
                <Button
                  size="sm"
                  variant="light"
                  className="settingsToolbarPreviewToggleButton"
                  title="折叠/展开（预览）"
                  ariaLabel="折叠/展开（预览）"
                  appRegion="no-drag"
                >
                  <ChevronLeftIcon />
                </Button>
              </Box>

              <Box className="settingsToolbarPreviewToolbarBarRow">
                <Box className="settingsToolbarReorderGroup flex flex-nowrap items-center gap-2">
                  {secondaryButtonsOrder.map((id) => (
                    <SelectableToolbarButtonItem
                      key={id}
                      group="secondary"
                      id={id}
                      selected={selectedButton.group === 'secondary' && selectedButton.id === id}
                      onSelect={() => setSelectedButton({ group: 'secondary', id })}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </div>

        <div className="settingsToolbarSelectionPanel">
          <div className="settingsToolbarSelectionHeader">
            <div className="settingsToolbarSelectionTitle">按钮信息</div>
            <div className="settingsToolbarSelectionMeta">
              第 {selectedIndex + 1} / {selectedCount} 项
            </div>
          </div>

          <div className="settingsToolbarSelectionBody">
            <div className="settingsToolbarSelectionIcon">{selectedIcon}</div>
            <div className="settingsToolbarSelectionName">{selectedLabel}</div>
          </div>

          <div className="settingsToolbarSelectionActions">
            <Button
              size="sm"
              variant="light"
              title="向前调整"
              ariaLabel="向前调整"
              appRegion="no-drag"
              disabled={!canMovePrev}
              onClick={() => moveSelected(-1)}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              size="sm"
              variant="light"
              title="向后调整"
              ariaLabel="向后调整"
              appRegion="no-drag"
              disabled={!canMoveNext}
              onClick={() => moveSelected(1)}
            >
              <ChevronRightIcon />
            </Button>
            <Button
              size="sm"
              variant="danger"
              title="删除"
              ariaLabel="删除"
              appRegion="no-drag"
              disabled={!canDeleteSelected}
              onClick={deleteSelected}
            >
              <TrashIcon />
            </Button>
          </div>
        </div>

        <div className="settingsToolbarAddPanel">
          <div className="settingsToolbarAddHeader">
            <div className="settingsToolbarAddTitle">添加按钮</div>
            <div className="settingsToolbarAddMeta">点击右侧加号，选择添加到折叠或非折叠区域</div>
          </div>

          <div className="settingsToolbarAddList">
            {allAddableButtons.map((item) => {
              const label = labelForButton(item.id)
              const icon = iconForButton(item.id)
              const desc = descriptionForButton(item.id)
              const isAdded =
                item.group === 'primary'
                  ? allowedPrimaryButtons.includes(item.id as PrimaryButtonId)
                  : allowedSecondaryButtons.includes(item.id as SecondaryButtonId)

              return (
                <div key={`${item.group}:${item.id}`} className="settingsToolbarAddRow">
                  <div className="settingsToolbarAddLeft">
                    <Button size="sm" variant="light" title={label} ariaLabel={label} appRegion="no-drag">
                      {icon}
                    </Button>
                  </div>

                  <div className="settingsToolbarAddMiddle">
                    <div className="settingsToolbarAddName">
                      {label}
                    </div>
                    <div className="settingsToolbarAddDesc">{desc}</div>
                  </div>

                  <div className="settingsToolbarAddRight">
                    <Button
                      size="sm"
                      variant="light"
                      title={isAdded ? '已添加' : '添加到浮动工具栏'}
                      ariaLabel={isAdded ? '已添加' : '添加到浮动工具栏'}
                      appRegion="no-drag"
                      disabled={isAdded}
                      onClick={() => {
                        if (isAdded) return
                        setPendingAdd((prev) => (prev?.id === item.id ? null : { id: item.id }))
                      }}
                    >
                      <PlusIcon />
                    </Button>
                    {pendingAdd?.id === item.id ? (
                      <div className="settingsToolbarAddSubmenu">
                        <Button
                          size="sm"
                          variant="light"
                          className="settingsToolbarAddSubmenuItem"
                          title="添加到非折叠区域"
                          ariaLabel="添加到非折叠区域"
                          appRegion="no-drag"
                          onClick={() => {
                            const placement =
                              item.group === 'primary'
                                ? ('primary' as const)
                                : ('pinned' as const)
                            addButtonToToolbar(placement, item.id)
                            setPendingAdd(null)
                          }}
                        >
                          非折叠区域
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          className="settingsToolbarAddSubmenuItem"
                          title={item.group === 'primary' ? '该按钮只能添加到非折叠区域' : '添加到折叠区域'}
                          ariaLabel="添加到折叠区域"
                          appRegion="no-drag"
                          disabled={item.group === 'primary'}
                          onClick={() => {
                            addButtonToToolbar('secondary', item.id)
                            setPendingAdd(null)
                          }}
                        >
                          折叠区域
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturePanelSettings() {
  type GridIconKind = 'grid' | 'plus' | 'gear' | 'doc' | 'notebook' | 'db' | 'events' | 'clock' | 'quit'
  const reduceMotion = useReducedMotion()
  const pagerViewportRef = React.useRef<HTMLDivElement | null>(null)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pagerViewportWidth, setPagerViewportWidth] = React.useState(0)
  const [draggingId, setDraggingId] = React.useState<AppButtonId | null>(null)

  const definitionById = React.useMemo(() => {
    const m = new Map<AppButtonId, { label: string }>()
    for (const d of APP_BUTTON_DEFINITIONS) {
      m.set(d.id, { label: d.label })
    }
    return m
  }, [])

  const [buttonOrder, setButtonOrder] = React.useState<AppButtonId[]>(() => {
    return APP_BUTTON_DEFINITIONS.filter((d) => getAppButtonVisibility(d.id).showInFeaturePanel).map((d) => d.id)
  })

  React.useEffect(() => {
    const viewport = pagerViewportRef.current
    if (!viewport) return
    if (typeof ResizeObserver === 'undefined') return

    let rafId = 0
    let lastWidth = 0

    const send = () => {
      rafId = 0
      const rect = viewport.getBoundingClientRect()
      const nextWidth = Math.max(1, Math.round(rect.width))
      if (nextWidth === lastWidth) return
      lastWidth = nextWidth
      setPagerViewportWidth(nextWidth)
    }

    const schedule = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(send)
    }

    const ro = new ResizeObserver(schedule)
    ro.observe(viewport)
    schedule()

    return () => {
      ro.disconnect()
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [])

  const iconFor = React.useCallback((id: AppButtonId): GridIconKind => {
    if (id === 'db') return 'db'
    if (id === 'events') return 'events'
    if (id === 'clock') return 'clock'
    if (id === 'settings') return 'gear'
    if (id === 'notes') return 'notebook'
    if (id === 'quit') return 'quit'
    return 'grid'
  }, [])

  function GridIcon(props: { kind: GridIconKind }) {
    if (props.kind === 'grid') return <GridKanban20Regular />
    if (props.kind === 'plus') return <Add20Regular />
    if (props.kind === 'db') return <Database20Regular />
    if (props.kind === 'events') return <AlertOn20Regular />
    if (props.kind === 'gear') return <Settings20Regular />
    if (props.kind === 'quit') return <ArrowExit20Regular />
    if (props.kind === 'clock') return <Clock20Regular />
    if (props.kind === 'doc') return <SlideText20Regular />
    if (props.kind === 'notebook') return <Note20Regular />
    return <Grid20Regular />
  }

  const items = React.useMemo(() => {
    return buttonOrder
      .map((id) => ({ id, title: definitionById.get(id)?.label ?? id, icon: iconFor(id) }))
      .filter((it) => getAppButtonVisibility(it.id).showInFeaturePanel)
  }, [buttonOrder, definitionById, iconFor])

  const pages = React.useMemo(() => {
    const pageSize = 16
    const result: Array<Array<{ id: AppButtonId; title: string; icon: GridIconKind }>> = []
    for (let i = 0; i < items.length; i += pageSize) {
      result.push(items.slice(i, i + pageSize))
    }
    return result
  }, [items])

  const pageCount = pages.length
  const effectivePageIndex = Math.max(0, Math.min(pageCount - 1, pageIndex))
  const swipeThreshold = 40
  const pageWidth = pagerViewportWidth || 184
  const leftLimit = -Math.max(0, (pageCount - 1) * pageWidth)

  React.useEffect(() => {
    if (pageIndex !== effectivePageIndex) setPageIndex(effectivePageIndex)
  }, [effectivePageIndex, pageIndex])

  const moveInOrder = React.useCallback((fromId: AppButtonId, toId: AppButtonId) => {
    setButtonOrder((prev) => {
      const from = prev.indexOf(fromId)
      const to = prev.indexOf(toId)
      if (from < 0 || to < 0 || from === to) return prev
      const next = prev.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  return (
    <div className="settingsContentSection">
      <h2 className="settingsContentTitle">功能面板</h2>
      <p className="settingsContentDescription">在这里预览功能面板布局（点击无效，可拖动调整按钮位置）</p>

      <div className="settingsFeaturePanelPreview">
        <div className="settingsFeaturePanelTitle">
          <span>功能面板</span>
          <span className="settingsFeaturePanelMeta">{items.length}</span>
        </div>

        <div className="settingsFeaturePanelPager">
          <div ref={pagerViewportRef} className="settingsFeaturePanelPagerViewport">
            <motion.div
              className="settingsFeaturePanelPagerTrack"
              drag={draggingId || pageCount <= 1 ? false : 'x'}
              dragConstraints={{ left: leftLimit, right: 0 }}
              dragElastic={0.06}
              animate={{ x: -(effectivePageIndex * pageWidth) }}
              transition={reduceMotion ? undefined : { type: 'spring', stiffness: 360, damping: 38 }}
              onDragEnd={(_e, info: { offset: { x: number }; velocity: { x: number } }) => {
                const offsetX = info.offset.x
                const velocityX = info.velocity.x
                const swipePower = offsetX + velocityX * 0.12
                if (swipePower <= -swipeThreshold && effectivePageIndex < pageCount - 1) {
                  setPageIndex(effectivePageIndex + 1)
                  return
                }
                if (swipePower >= swipeThreshold && effectivePageIndex > 0) {
                  setPageIndex(effectivePageIndex - 1)
                }
              }}
            >
              {pages.map((pageItems, idx) => (
                <div key={idx} className="settingsFeaturePanelPagerPage">
                  <div className="settingsFeaturePanelIconGrid">
                    {pageItems.map((item) => (
                      <div
                        key={item.id}
                        className={draggingId === item.id ? 'settingsFeaturePanelDragItem settingsFeaturePanelDragItem--dragging' : 'settingsFeaturePanelDragItem'}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(item.id)
                          try {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', item.id)
                          } catch {}
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          try {
                            e.dataTransfer.dropEffect = 'move'
                          } catch {}
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          let from = draggingId
                          if (!from) {
                            try {
                              const raw = e.dataTransfer.getData('text/plain')
                              from = raw as AppButtonId
                            } catch {}
                          }
                          if (!from) return
                          setDraggingId(null)
                          moveInOrder(from, item.id)
                        }}
                      >
                        <Button
                          size="sm"
                          ariaLabel={item.title}
                          title={item.title}
                          showInToolbar={getAppButtonVisibility(item.id).showInToolbar}
                          showInFeaturePanel={getAppButtonVisibility(item.id).showInFeaturePanel}
                          onClick={() => undefined}
                        >
                          <GridIcon kind={item.icon} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {pageCount > 1 ? (
            <div className="settingsFeaturePanelPagerDots">
              {pages.map((_, idx) => (
                <span
                  key={idx}
                  className={idx === effectivePageIndex ? 'settingsFeaturePanelPagerDot settingsFeaturePanelPagerDot--active' : 'settingsFeaturePanelPagerDot'}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AnnotationSettings() {
  const [writingSystem, setWritingSystem] = React.useState<'leafer' | 'inkcanvas' | 'winui'>('leafer')
  const writingSystemLabel =
    writingSystem === 'inkcanvas' ? 'inkcanvas' : writingSystem === 'winui' ? 'winui' : 'leafer.js'

  const [leaferSettings, setLeaferSettings] = usePersistedState<LeaferSettings>(
    LEAFER_SETTINGS_KV_KEY,
    {
      multiTouch: false,
      inkSmoothing: true,
      bezierSmoothing: false,
      showInkWhenPassthrough: true,
      freezeScreen: false,
      rendererEngine: 'canvas2d',
      nibMode: 'off',
      postBakeOptimize: false,
      postBakeOptimizeOnce: false
    },
    { validate: isLeaferSettings }
  )

  const nibPreviewRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const canvas = nibPreviewRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const cssW = Math.max(1, Math.floor(rect.width))
    const cssH = Math.max(1, Math.floor(rect.height))
    const dpr = Math.max(1, Math.floor((globalThis.devicePixelRatio as number) || 1))

    const targetW = cssW * dpr
    const targetH = cssH * dpr
    if (canvas.width !== targetW) canvas.width = targetW
    if (canvas.height !== targetH) canvas.height = targetH

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
      return t * t * (3 - 2 * t)
    }

    const points: Array<{ x: number; y: number }> = []
    const padX = 10
    const padY = 12
    const w = cssW - padX * 2
    const h = cssH - padY * 2
    for (let i = 0; i <= 64; i++) {
      const t = i / 64
      const x = padX + w * t
      const y = padY + h * (0.55 + 0.18 * Math.sin(t * Math.PI * 2.2) + 0.05 * Math.sin(t * Math.PI * 6.2))
      points.push({ x, y })
    }

    const totalLen = (() => {
      let len = 0
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x
        const dy = points[i].y - points[i - 1].y
        len += Math.hypot(dx, dy)
      }
      return Math.max(1e-6, len)
    })()

    const nibMode = leaferSettings.nibMode ?? 'off'
    const baseWidth = 12
    const widths: number[] = new Array(points.length).fill(baseWidth)

    if (nibMode === 'dynamic') {
      let acc = 0
      for (let i = 0; i < points.length; i++) {
        if (i > 0) {
          const dx = points[i].x - points[i - 1].x
          const dy = points[i].y - points[i - 1].y
          acc += Math.hypot(dx, dy)
        }
        const t = acc / totalLen
        const start = smoothstep(0, 0.16, t)
        const end = smoothstep(0, 0.16, 1 - t)
        const taper = Math.min(start, end)

        const dist = i > 0 ? Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) : 0
        const speedFactor = clamp(1.15 - dist * 0.12, 0.55, 1.15)
        const w = baseWidth * (0.35 + 0.65 * taper) * speedFactor
        widths[i] = clamp(w, 2, 40)
      }
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.85)'

    if (nibMode !== 'dynamic') {
      ctx.lineWidth = baseWidth
      ctx.beginPath()
      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
      return
    }

    for (let i = 1; i < points.length; i++) {
      const w0 = widths[i - 1]
      const w1 = widths[i]
      ctx.lineWidth = (w0 + w1) / 2
      ctx.beginPath()
      ctx.moveTo(points[i - 1].x, points[i - 1].y)
      ctx.lineTo(points[i].x, points[i].y)
      ctx.stroke()
    }
  }, [leaferSettings.nibMode])

  const persistLeaferSettings = (next: LeaferSettings) => {
    setLeaferSettings(next)
    void (async () => {
      try {
        await putKv(LEAFER_SETTINGS_KV_KEY, next)
      } catch {
        return
      }
      try {
        await putUiStateKey(UI_STATE_APP_WINDOW_ID, LEAFER_SETTINGS_UI_STATE_KEY, Date.now())
      } catch {
        return
      }
    })()
  }

  return (
    <div className="settingsContentSection">
      <h2 className="settingsContentTitle">批注系统</h2>
      <p className="settingsContentDescription">配置批注工具和笔刷设置</p>

      <div className="settingsFormCard">
        <div className="settingsFormTitle">书写系统</div>
        <div className="settingsFormDescription">切换不同书写系统的启用与设置（占位）</div>
        <Select
          value={writingSystem}
          data={[
            { value: 'leafer', label: 'leafer.js' },
            { value: 'inkcanvas', label: 'inkcanvas' },
            { value: 'winui', label: 'winui' }
          ]}
          allowDeselect={false}
          onChange={(value) => {
            if (value === 'leafer' || value === 'inkcanvas' || value === 'winui') setWritingSystem(value)
          }}
        />
      </div>

      {writingSystem === 'leafer' ? (
        <div className="settingsFormCard">
          <div className="settingsFormTitle">Leafer.js</div>
          <div className="settingsFormDescription">配置 Leafer.js 书写体验</div>
          <div className="settingsFormGroup">
            <div className="settingsFormTitle">笔迹渲染引擎</div>
            <div className="settingsFormDescription">Canvas2D 默认低延迟；WebGPU 为实验特性</div>
            <Select
              value={leaferSettings.rendererEngine ?? 'canvas2d'}
              data={[
                { value: 'canvas2d', label: 'Canvas2D（低延迟，默认）' },
                { value: 'svg', label: 'SVG（矢量）' },
                { value: 'webgl', label: 'WebGL' },
                { value: 'webgpu', label: 'WebGPU（实验性）' }
              ]}
              allowDeselect={false}
              onChange={(value) => {
                if (value !== 'canvas2d' && value !== 'svg' && value !== 'webgl' && value !== 'webgpu') return
                persistLeaferSettings({ ...leaferSettings, rendererEngine: value })
              }}
            />
          </div>
          <div className="settingsFormGroup">
            <div className="settingsFormTitle">笔锋</div>
            <div className="settingsFormDescription">基于分段烘干模拟笔锋（静态模式暂未加入）</div>
            <Select
              value={leaferSettings.nibMode ?? 'off'}
              data={[
                { value: 'off', label: '关闭' },
                { value: 'dynamic', label: '动态笔锋' },
                { value: 'static', label: '静态笔锋（暂未加入）' }
              ]}
              allowDeselect={false}
              onChange={(value) => {
                if (value !== 'off' && value !== 'dynamic' && value !== 'static') return
                persistLeaferSettings({ ...leaferSettings, nibMode: value })
              }}
            />
            <div className="settingsNibPreview">
              <div className="settingsNibPreviewTitle">效果预览</div>
              <canvas ref={nibPreviewRef} className="settingsNibPreviewCanvas" />
            </div>
          </div>
          <div className="settingsSwitchList">
            <Switch
              checked={leaferSettings.multiTouch}
              onChange={(e) => persistLeaferSettings({ ...leaferSettings, multiTouch: e.currentTarget.checked })}
              label="多指书写"
              size="md"
            />
            <Switch
              checked={leaferSettings.inkSmoothing}
              onChange={(e) => persistLeaferSettings({ ...leaferSettings, inkSmoothing: e.currentTarget.checked })}
              label="墨迹平滑"
              size="md"
            />
            <Switch
              checked={leaferSettings.bezierSmoothing ?? false}
              onChange={(e) => persistLeaferSettings({ ...leaferSettings, bezierSmoothing: e.currentTarget.checked })}
              label="贝塞尔平滑"
              size="md"
            />
            <Switch
              checked={leaferSettings.postBakeOptimize ?? false}
              onChange={(e) => {
                const checked = e.currentTarget.checked
                persistLeaferSettings({ ...leaferSettings, postBakeOptimize: checked, postBakeOptimizeOnce: checked ? false : leaferSettings.postBakeOptimizeOnce })
              }}
              label="烘干后处理优化"
              size="md"
            />
            <Switch
              checked={leaferSettings.postBakeOptimizeOnce ?? false}
              onChange={(e) => {
                const checked = e.currentTarget.checked
                persistLeaferSettings({ ...leaferSettings, postBakeOptimizeOnce: checked, postBakeOptimize: checked ? false : leaferSettings.postBakeOptimize })
              }}
              label="笔迹单次烘干"
              size="md"
            />
            <Switch
              checked={leaferSettings.showInkWhenPassthrough}
              onChange={(e) =>
                persistLeaferSettings({ ...leaferSettings, showInkWhenPassthrough: e.currentTarget.checked })
              }
              label="操作穿透时显示笔迹"
              size="md"
            />
            <Switch
              checked={leaferSettings.freezeScreen}
              onChange={(e) => persistLeaferSettings({ ...leaferSettings, freezeScreen: e.currentTarget.checked })}
              label="屏幕内容冻结批注"
              size="md"
            />
          </div>
        </div>
      ) : (
        <div className="settingsContentPlaceholder">
          <div className="settingsContentPlaceholderIcon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            </svg>
          </div>
          <p className="settingsContentPlaceholderText">{writingSystemLabel} 的启用与设置即将推出</p>
        </div>
      )}
    </div>
  )
}

function LanStartBarSettings() {
  return (
    <div className="settingsContentSection">
      <h2 className="settingsContentTitle">LanStartBar</h2>
      <p className="settingsContentDescription">配置 LanStartBar 的显示和行为</p>
      
      <div className="settingsContentPlaceholder">
        <div className="settingsContentPlaceholderIcon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <line x1="6" y1="10" x2="6" y2="14" />
            <line x1="10" y1="10" x2="10" y2="14" />
            <line x1="14" y1="10" x2="14" y2="14" />
            <line x1="18" y1="10" x2="18" y2="14" />
          </svg>
        </div>
        <p className="settingsContentPlaceholderText">LanStartBar 设置即将推出</p>
      </div>
    </div>
  )
}

function WhiteboardSettings() {
  const presets = [
    { label: '浅绿', value: '#95C459' },
    { label: '浅灰', value: '#333333' },
    { label: '深灰', value: '#2E2F33' },
    { label: '墨绿', value: '#0F261E' },
    { label: '深绿', value: '#172A25' },
    { label: '纯白', value: '#FFFFFF' },
  ] as const

  const bus = useUiStateBus(UI_STATE_APP_WINDOW_ID)
  const uiBg = bus.state[WHITEBOARD_BG_COLOR_UI_STATE_KEY]
  const bgColor = isHexColor(uiBg) ? uiBg : '#ffffff'
  const uiBgImageUrl = bus.state[WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY]
  const bgImageUrl = isFileOrDataUrl(uiBgImageUrl) ? uiBgImageUrl : ''
  const uiOpacity = bus.state[WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY]
  const bgImageOpacity =
    typeof uiOpacity === 'number'
      ? Math.max(0, Math.min(1, uiOpacity))
      : typeof uiOpacity === 'string' && Number.isFinite(Number(uiOpacity))
        ? Math.max(0, Math.min(1, Number(uiOpacity)))
        : 0.5

  const onPickBgImage = async () => {
    try {
      const res = await selectImageFile()
      const url = typeof res?.fileUrl === 'string' ? res.fileUrl : ''
      if (!url) return
      const converted = await readImageFileUrlAsDataUrl(url)
      const dataUrl = typeof converted?.dataUrl === 'string' ? converted.dataUrl : ''
      if (!dataUrl) return
      bus.setKey(WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY, dataUrl).catch(() => undefined)
      postCommand('settings.setWhiteboardBackground', { bgImageUrl: dataUrl }).catch(() => undefined)
    } catch (e) {
      window.alert(`导入背景图片失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="settingsContentSection">
      <h2 className="settingsContentTitle">白板</h2>
      <p className="settingsContentDescription">选择白板背景颜色</p>

      <div className="settingsWhiteboardColorGrid">
        {presets.map((preset) => (
          <div key={preset.label} className="settingsWhiteboardColorItem">
            <Button
              kind="custom"
              appRegion="no-drag"
              ariaLabel={preset.label}
              title={`${preset.label} ${preset.value}`}
              className={`settingsWhiteboardColorSwatch ${bgColor === preset.value ? 'settingsWhiteboardColorSwatch--active' : ''}`}
              onClick={() => {
                bus.setKey(WHITEBOARD_BG_COLOR_UI_STATE_KEY, preset.value).catch(() => undefined)
                postCommand('settings.setWhiteboardBackground', { bgColor: preset.value }).catch(() => undefined)
              }}
              style={{ background: preset.value }}
            >
              <span className="settingsWhiteboardColorSwatchInner" />
            </Button>
            <div className="settingsWhiteboardColorLabel">{preset.label}</div>
          </div>
        ))}
      </div>

      <div className="settingsSubSection">
        <h3 className="settingsSubTitle">背景图片</h3>
        <p className="settingsSubDescription">选择一张图片作为白板背景</p>
        <Button kind="text" size="md" appRegion="no-drag" ariaLabel="添加图片背景" onClick={onPickBgImage}>
          添加图片背景
        </Button>
        {bgImageUrl ? (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                width: 240,
                maxWidth: '100%',
                aspectRatio: '16 / 10',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'rgba(255,255,255,0.06)'
              }}
            >
              <img
                src={bgImageUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block',
                  opacity: bgImageOpacity
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.9, minWidth: 60 }}>透明度</div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(bgImageOpacity * 100)}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  const next = Number.isFinite(v) ? Math.max(0, Math.min(1, v / 100)) : 0.5
                  bus.setKey(WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY, next).catch(() => undefined)
                  postCommand('settings.setWhiteboardBackground', { bgImageOpacity: next }).catch(() => undefined)
                }}
                style={{ flex: 1 }}
              />
              <div style={{ fontSize: 12, opacity: 0.9, minWidth: 44, textAlign: 'right' }}>{Math.round(bgImageOpacity * 100)}%</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                kind="text"
                size="md"
                appRegion="no-drag"
                ariaLabel="删除背景图片"
                onClick={() => {
                  bus.setKey(WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY, '').catch(() => undefined)
                  postCommand('settings.setWhiteboardBackground', { bgImageUrl: '' }).catch(() => undefined)
                }}
              >
                删除背景图片
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function AboutSettings() {
  return (
    <div className="settingsContentSection">
      <h2 className="settingsContentTitle">关于</h2>
      <p className="settingsContentDescription">应用信息和版本详情</p>
      
      <div className="settingsAboutCard">
        <div className="settingsAboutLogo">
          <Settings20Regular style={{ fontSize: 64 }} />
        </div>
        <h3 className="settingsAboutAppName">SecBoard</h3>
        <p className="settingsAboutVersion">
          版本 {__APP_VERSION__} · 代号 {__APP_CODENAME__}
        </p>
        <p className="settingsAboutDescription">
          一款现代化的屏幕批注和演示工具，
          <br />
          帮助您更高效地进行屏幕标注和演示。
        </p>
        
        <div className="settingsAboutLinks">
          <a href="#" className="settingsAboutLink">官方网站</a>
          <a href="#" className="settingsAboutLink">GitHub</a>
          <a href="#" className="settingsAboutLink">反馈问题</a>
        </div>
      </div>
      
      <div className="settingsAboutCredits">
        <h4 className="settingsAboutCreditsTitle">技术栈</h4>
        <div className="settingsAboutCreditsList">
          <span className="settingsAboutCredit">Vite</span>
          <span className="settingsAboutCredit">React</span>
          <span className="settingsAboutCredit">TypeScript</span>
          <span className="settingsAboutCredit">Framer Motion</span>
        </div>
      </div>
    </div>
  )
}

function VideoShowSettings() {
  const bus = useUiStateBus(UI_STATE_APP_WINDOW_ID)
  const mode = bus.state[APP_MODE_UI_STATE_KEY]

  const [mergeLayers, setMergeLayers] = usePersistedState<boolean>(VIDEO_SHOW_MERGE_LAYERS_KV_KEY, true, {
    validate: (v): v is boolean => typeof v === 'boolean'
  })

  const persistMergeLayers = (next: boolean) => {
    setMergeLayers(next)
    void (async () => {
      try {
        await putKv(VIDEO_SHOW_MERGE_LAYERS_KV_KEY, next)
      } catch {
        return
      }
      try {
        await putUiStateKey(UI_STATE_APP_WINDOW_ID, VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY, next)
      } catch {
        return
      }
    })()
  }

  const disabled = mode !== 'video-show'

  return (
    <div className="settingsContentSection">
      <h2 className="settingsContentTitle">视频展台</h2>
      <p className="settingsContentDescription">配置视频展台模式下的画面与批注设置</p>

      <div className="settingsFormCard">
        <div className="settingsFormTitle">图像与批注层</div>
        <div className="settingsFormDescription">仅在进入视频展台模式后生效</div>
        <Switch
          checked={mergeLayers}
          onChange={(e) => persistMergeLayers(e.currentTarget.checked)}
          label="合并图像与批注层"
          size="md"
          disabled={disabled}
        />
      </div>
    </div>
  )
}

const contentComponents: Record<SettingsTab, React.FC> = {
  appearance: AppearanceSettings,
  toolbar: ToolbarSettings,
  'feature-panel': FeaturePanelSettings,
  annotation: AnnotationSettings,
  whiteboard: WhiteboardSettings,
  'video-show': VideoShowSettings,
  'lanstart-bar': LanStartBarSettings,
  about: AboutSettings,
}

export function SettingsContent({ activeTab }: SettingsContentProps) {
  const ContentComponent = contentComponents[activeTab]
  
  return (
    <div className="settingsContent">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="settingsContentInner"
      >
        <ContentComponent />
      </motion.div>
    </div>
  )
}

