export const APPEARANCE_KV_KEY = 'app-appearance'
export const APP_MODE_KV_KEY = 'app-mode'
export const VIDEO_SHOW_MERGE_LAYERS_KV_KEY = 'video-show-merge-layers'
export const WHITEBOARD_BG_COLOR_KV_KEY = 'whiteboard-bg-color'
export const WHITEBOARD_BG_IMAGE_URL_KV_KEY = 'whiteboard-bg-image-url'
export const WHITEBOARD_BG_IMAGE_OPACITY_KV_KEY = 'whiteboard-bg-image-opacity'
export const WHITEBOARD_CANVAS_PAGES_KV_KEY = 'whiteboard-canvas-pages'
export const VIDEO_SHOW_PAGES_KV_KEY = 'video-show-pages'
export const WRITING_FRAMEWORK_KV_KEY = 'writing-framework'
export const PEN_SETTINGS_KV_KEY = 'pen-settings'
export const ERASER_SETTINGS_KV_KEY = 'eraser-settings'
export const LEAFER_SETTINGS_KV_KEY = 'leafer-settings'

export const UI_STATE_APP_WINDOW_ID = 'app'
export const APPEARANCE_UI_STATE_KEY = 'appearance'
export const APP_MODE_UI_STATE_KEY = 'mode'
export const WRITING_FRAMEWORK_UI_STATE_KEY = 'writingFramework'
export const EFFECTIVE_WRITING_BACKEND_UI_STATE_KEY = 'effectiveWritingBackend'
export const TOOL_UI_STATE_KEY = 'tool'
export const PEN_TYPE_UI_STATE_KEY = 'penType'
export const PEN_COLOR_UI_STATE_KEY = 'penColor'
export const PEN_THICKNESS_UI_STATE_KEY = 'penThickness'
export const ERASER_TYPE_UI_STATE_KEY = 'eraserType'
export const ERASER_THICKNESS_UI_STATE_KEY = 'eraserThickness'
export const CLEAR_PAGE_REV_UI_STATE_KEY = 'clearPageRev'
export const UNDO_REV_UI_STATE_KEY = 'undoRev'
export const REDO_REV_UI_STATE_KEY = 'redoRev'
export const NOTES_PAGE_INDEX_UI_STATE_KEY = 'notesPageIndex'
export const NOTES_PAGE_TOTAL_UI_STATE_KEY = 'notesPageTotal'
export const WHITEBOARD_BG_COLOR_UI_STATE_KEY = 'whiteboardBgColor'
export const WHITEBOARD_BG_IMAGE_URL_UI_STATE_KEY = 'whiteboardBgImageUrl'
export const WHITEBOARD_BG_IMAGE_OPACITY_UI_STATE_KEY = 'whiteboardBgImageOpacity'
export const VIDEO_SHOW_CAPTURE_REV_UI_STATE_KEY = 'videoShowCaptureRev'
export const VIDEO_SHOW_MERGE_LAYERS_UI_STATE_KEY = 'videoShowMergeLayers'
export const NOTICE_KIND_UI_STATE_KEY = 'noticeKind'
export const WEB_ACTIVE_SUBWINDOW_UI_STATE_KEY = 'webActiveSubwindowKind'
export const WEB_SUBWINDOW_PLACEMENT_UI_STATE_KEY = 'webSubwindowPlacement'
export const WEB_PAGE_THUMBNAILS_VISIBLE_UI_STATE_KEY = 'webPageThumbnailsVisible'
export const WEB_SETTINGS_VISIBLE_UI_STATE_KEY = 'webSettingsVisible'

export type AppMode = 'toolbar' | 'whiteboard' | 'video-show'
export type Appearance = 'light' | 'dark'
export type WritingFramework = 'konva' | 'qt' | 'leafer'

export function isAppearance(v: unknown): v is Appearance {
  return v === 'light' || v === 'dark'
}

export function isAppMode(v: unknown): v is AppMode {
  return v === 'toolbar' || v === 'whiteboard' || v === 'video-show'
}

export function isWritingFramework(v: unknown): v is WritingFramework {
  return v === 'konva' || v === 'qt' || v === 'leafer'
}

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
}

export function isFileOrDataUrl(v: unknown): v is string {
  if (typeof v !== 'string') return false
  if (!v) return true
  return v.startsWith('file:') || v.startsWith('data:')
}
