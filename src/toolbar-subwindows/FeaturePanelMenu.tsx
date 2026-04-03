import {
  GridKanban20Regular,
  Add20Regular,
  Clock20Regular,
  SlideText20Regular,
  Note20Regular,
} from '@fluentui/react-icons'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../button'
import { motion, useReducedMotion } from '../Framer_Motion'
import { markQuitting, postCommand } from '../toolbar/hooks/useBackend'
import { useZoomOnWheel } from '../toolbar/hooks/useZoomOnWheel'
import { getAppButtonVisibility, type AppButtonId } from '../toolbar/utils/constants'
import { APP_BUTTON_DEFINITIONS } from '../button'
import {
  NOTES_RELOAD_REV_UI_STATE_KEY,
  UI_STATE_APP_WINDOW_ID,
  VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY,
  putUiStateKey,
  selectCunoxExportFile,
  selectCunoxImportFile
} from '../status'
import {
  EventsIcon,
  SettingsIcon,
  QuitIcon,
  DatabaseIcon,
} from '../toolbar/components/ToolbarIcons'
import './styles/subwindow.css'

type GridIconKind = 'grid' | 'plus' | 'gear' | 'doc' | 'notebook' | 'db' | 'events' | 'clock' | 'quit'

function GridIcon(props: { kind: GridIconKind }) {
  if (props.kind === 'grid') return <GridKanban20Regular />
  if (props.kind === 'plus') return <Add20Regular />
  if (props.kind === 'db') return <DatabaseIcon />
  if (props.kind === 'events') return <EventsIcon />
  if (props.kind === 'clock') return <Clock20Regular />
  if (props.kind === 'gear') return <SettingsIcon />
  if (props.kind === 'doc') return <SlideText20Regular />
  if (props.kind === 'notebook') return <Note20Regular />
  if (props.kind === 'quit') return <QuitIcon />
  return <GridKanban20Regular />
}

export function FeaturePanelMenu(props: { kind: string }) {
  useZoomOnWheel()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const pagerViewportRef = useRef<HTMLDivElement | null>(null)
  const reduceMotion = useReducedMotion()
  const [pageIndex, setPageIndex] = useState(0)
  const [pagerViewportWidth, setPagerViewportWidth] = useState(0)
  const [busy, setBusy] = useState<null | { kind: 'export' | 'import'; title: string; startedAt: number }>(null)
  const isNotesMenu = props.kind === 'notes'

  useEffect(() => {
    const root = rootRef.current
    const card = cardRef.current
    const measure = measureRef.current
    if (!root) return
    if (typeof ResizeObserver === 'undefined') return

    let lastHeight = 0
    let lastWidth = 0
    let rafId = 0

    const send = () => {
      rafId = 0
      const measureRect = measure?.getBoundingClientRect()
      const contentWidth = Math.max(measureRect?.width ?? 0, 0)
      const contentHeight = Math.max(measure?.scrollHeight ?? 0, measureRect?.height ?? 0)
      const width = Math.max(220, Math.min(1600, Math.ceil(contentWidth) + 26))
      const height = Math.max(60, Math.min(900, Math.ceil(contentHeight) + 26))
      if (width === lastWidth && height === lastHeight) return
      lastWidth = width
      lastHeight = height
      postCommand('set-subwindow-bounds', { kind: props.kind, width, height }).catch(() => undefined)
    }

    const schedule = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(send)
    }

    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    if (card) ro.observe(card)
    if (measure) ro.observe(measure)
    schedule()

    return () => {
      ro.disconnect()
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [props.kind])

  useEffect(() => {
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

  const doCunoxExport = async () => {
    const { file } = await selectCunoxExportFile()
    if (!file) return
    setBusy({ kind: 'export', title: '正在生成 CUNOX…', startedAt: Date.now() })
    try {
      const res = (await window.lanstart?.apiRequest({ method: 'POST', path: '/cunox/export', body: { outFile: file } })) as any
      const ok = res && Number(res.status) >= 200 && Number(res.status) < 300 && res.body && res.body.ok === true
      const outFile = typeof res?.body?.outFile === 'string' ? res.body.outFile : ''
      if (!ok) throw new Error(String(res?.body?.error ?? 'export_failed'))
      if (outFile) {
        try {
          await window.lanstart?.clipboardWriteText(outFile)
        } catch {}
        window.alert(`导出完成：\n${outFile}\n\n路径已复制到剪贴板`)
      } else {
        window.alert('导出完成')
      }
    } catch (e) {
      window.alert(`导出失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  const doCunoxImport = async () => {
    if (!window.confirm('导入会覆盖当前数据，是否继续？')) return
    const { file } = await selectCunoxImportFile()
    if (!file) return
    setBusy({ kind: 'import', title: '正在导入 CUNOX…', startedAt: Date.now() })
    try {
      const res = (await window.lanstart?.apiRequest({ method: 'POST', path: '/cunox/import', body: { file } })) as any
      const ok = res && Number(res.status) >= 200 && Number(res.status) < 300 && res.body && res.body.ok === true
      if (!ok) throw new Error(String(res?.body?.error ?? 'import_failed'))
      await putUiStateKey(UI_STATE_APP_WINDOW_ID, NOTES_RELOAD_REV_UI_STATE_KEY, Date.now())
      await putUiStateKey(UI_STATE_APP_WINDOW_ID, VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY, { rev: Date.now(), index: 0, total: 1, name: '' })
      window.alert('导入完成')
    } catch (e) {
      window.alert(`导入失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  const items = useMemo(() => {
    if (isNotesMenu) {
      return [
        {
          key: 'cunox-export',
          title: '导出 CUNOX',
          icon: 'doc' as const,
          onClick: () => void doCunoxExport()
        },
        {
          key: 'cunox-import',
          title: '导入 CUNOX',
          icon: 'doc' as const,
          onClick: () => void doCunoxImport()
        }
      ]
    }

    const iconFor = (id: AppButtonId): GridIconKind => {
      if (id === 'db') return 'db'
      if (id === 'events') return 'events'
      if (id === 'clock') return 'clock'
      if (id === 'settings') return 'gear'
      if (id === 'notes') return 'notebook'
      if (id === 'quit') return 'quit'
      return 'grid'
    }

    const variantFor = (id: AppButtonId): 'default' | 'light' | 'danger' | undefined => {
      if (id === 'quit') return 'danger'
      return undefined
    }

    const onClickFor = (id: AppButtonId) => {
      if (id === 'db') return () => void postCommand('create-window')
      if (id === 'events') return () => void postCommand('toggle-subwindow', { kind: 'events', placement: 'bottom' })
      if (id === 'clock') return () => void postCommand('toggle-subwindow', { kind: 'clock', placement: 'bottom' })
      if (id === 'settings') return () => void postCommand('app.openSettingsWindow')
      if (id === 'notes') return () => void postCommand('toggle-subwindow', { kind: 'notes', placement: 'bottom' })
      if (id === 'quit')
        return () => {
          markQuitting()
          void postCommand('quit')
        }

      return () => void postCommand('toggle-subwindow', { kind: id, placement: 'bottom' })
    }

    return APP_BUTTON_DEFINITIONS
      .filter((d) => getAppButtonVisibility(d.id).showInFeaturePanel)
      .map((d) => ({
        key: d.id,
        buttonId: d.id,
        title: d.label,
        icon: iconFor(d.id),
        variant: variantFor(d.id),
        onClick: onClickFor(d.id)
      }))
  }, [doCunoxExport, doCunoxImport, isNotesMenu])

  const pages = useMemo(() => {
    const pageSize = 16
    const result: Array<
      Array<{
        key: string
        buttonId?: AppButtonId
        title: string
        icon: GridIconKind
        variant?: 'default' | 'light' | 'danger'
        onClick: () => void
      }>
    > = []
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

  return (
    <motion.div
      ref={rootRef}
      className="subwindowRoot"
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.99 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? undefined : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {busy ? (
        <div className="subwindowBusyOverlay">
          <div className="subwindowBusyCard">
            <div className="subwindowBusyTitle">{busy.title}</div>
            <div className="subwindowBusyBar">
              <div className="subwindowBusyBarInner" />
            </div>
            <div className="subwindowBusyHint">请保持窗口打开，生成完成后会提示导出路径</div>
          </div>
        </div>
      ) : null}
      <div ref={cardRef} className="subwindowCard animate-ls-pop-in">
        <div ref={measureRef} className="subwindowMeasure">
          <div className="subwindowTitle">
            <span>{isNotesMenu ? '笔记管理' : '功能面板'}</span>
            <span className="subwindowMeta">{items.length}</span>
          </div>

          <div className="subwindowPager">
            <div ref={pagerViewportRef} className="subwindowPagerViewport">
              <motion.div
                className="subwindowPagerTrack"
                drag={pageCount > 1 ? 'x' : false}
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
                  <div key={idx} className="subwindowPagerPage">
                    <div className="subwindowIconGrid">
                      {pageItems.map((item) => (
                        <Button
                          key={item.key}
                          size="sm"
                          ariaLabel={item.title}
                          title={item.title}
                          variant={item.variant}
                          showInToolbar={item.buttonId ? getAppButtonVisibility(item.buttonId).showInToolbar : undefined}
                          showInFeaturePanel={item.buttonId ? getAppButtonVisibility(item.buttonId).showInFeaturePanel : undefined}
                          onClick={item.onClick}
                        >
                          <GridIcon kind={item.icon} />
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {pageCount > 1 ? (
              <div className="subwindowPagerDots">
                {pages.map((_, idx) => (
                  <span
                    key={idx}
                    className={idx === effectivePageIndex ? 'subwindowPagerDot subwindowPagerDot--active' : 'subwindowPagerDot'}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
