import { t, type Static } from 'elysia'

export const AppModeSchema = t.Union([
  t.Literal('toolbar'),
  t.Literal('whiteboard'),
  t.Literal('video-show')
])

export const LeaferSettingsSchema = t.Object({
  multiTouch: t.Boolean(),
  inkSmoothing: t.Boolean(),
  bezierSmoothing: t.Boolean(),
  showInkWhenPassthrough: t.Boolean(),
  freezeScreen: t.Boolean(),
  rendererEngine: t.Union([
    t.Literal('canvas2d'),
    t.Literal('svg'),
    t.Literal('webgl'),
    t.Literal('webgpu')
  ]),
  nibMode: t.Union([t.Literal('off'), t.Literal('dynamic'), t.Literal('static')]),
  postBakeOptimize: t.Boolean(),
  postBakeOptimizeOnce: t.Boolean()
})

export const SecBoardSettingsSchema = t.Object({
  version: t.Literal(1),
  appearance: t.Union([t.Literal('light'), t.Literal('dark')]),
  writingEngine: t.Literal('leafer'),
  leafer: LeaferSettingsSchema,
  whiteboard: t.Object({
    backgroundColor: t.String({ pattern: '^#[0-9a-fA-F]{6}$' }),
    backgroundImageUrl: t.String(),
    backgroundImageOpacity: t.Number({ minimum: 0, maximum: 1 })
  }),
  videoShow: t.Object({ mergeLayers: t.Boolean() })
})

export const SecBoardSettingsPatchSchema = t.Partial(
  t.Object({
    appearance: SecBoardSettingsSchema.properties.appearance,
    writingEngine: t.Literal('leafer'),
    leafer: t.Partial(LeaferSettingsSchema),
    whiteboard: t.Partial(SecBoardSettingsSchema.properties.whiteboard),
    videoShow: t.Partial(SecBoardSettingsSchema.properties.videoShow)
  })
)

export const AnnotationNodeSchema = t.Object({
  role: t.Union([t.Literal('stroke'), t.Literal('eraserPixel')]),
  groupId: t.Optional(t.Number()),
  strokeWidth: t.Number({ minimum: 0 }),
  points: t.Array(t.Number()),
  color: t.Optional(t.String()),
  opacity: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  pfh: t.Optional(t.Boolean())
})

export const AnnotationPageSchema = t.Object({
  version: t.Literal(1),
  nodes: t.Array(AnnotationNodeSchema)
})

export const AnnotationBookSchema = t.Object({
  version: t.Literal(2),
  currentPage: t.Integer({ minimum: 0 }),
  pages: t.Array(AnnotationPageSchema, { minItems: 1 })
})

export const SystemCommandSchema = t.Union([
  t.Object({ command: t.Literal('window.quit') }),
  t.Object({ command: t.Literal('window.set-annotation-input'), payload: t.Object({ enabled: t.Boolean() }) }),
  t.Object({ command: t.Literal('dialog.select-image-file') }),
  t.Object({ command: t.Literal('dialog.select-directory') })
])

export type AppMode = Static<typeof AppModeSchema>
export type SecBoardSettingsV1 = Static<typeof SecBoardSettingsSchema>
export type SecBoardSettingsPatch = Static<typeof SecBoardSettingsPatchSchema>
export type AnnotationNodeV1 = Static<typeof AnnotationNodeSchema>
export type AnnotationPageV1 = Static<typeof AnnotationPageSchema>
export type AnnotationBookV2 = Static<typeof AnnotationBookSchema>
export type SystemCommandRequest = Static<typeof SystemCommandSchema>

export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> }
export type ApiFailure = {
  ok: false
  error: { code: string; message: string; details?: unknown }
}
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export const DEFAULT_SECBOARD_SETTINGS: SecBoardSettingsV1 = {
  version: 1,
  appearance: 'light',
  writingEngine: 'leafer',
  leafer: {
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
  whiteboard: {
    backgroundColor: '#ffffff',
    backgroundImageUrl: '',
    backgroundImageOpacity: 0.5
  },
  videoShow: { mergeLayers: true }
}

export function annotationKeyForMode(mode: AppMode): string {
  return `annotation-notes-${mode}`
}
