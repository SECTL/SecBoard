import { Elysia, t } from 'elysia'
import {
  AnnotationBookSchema,
  AppModeSchema,
  SecBoardSettingsPatchSchema,
  SecBoardSettingsSchema,
  SystemCommandSchema,
  type AnnotationBookV2,
  type AppMode,
  type SecBoardSettingsPatch,
  type SecBoardSettingsV1,
  type SystemCommandRequest
} from '../api/contracts'

export type ApiEvent = { id: number; type: string; payload?: unknown; ts: number }

export type ApiV1Services = {
  readSettings(): Promise<SecBoardSettingsV1>
  patchSettings(patch: SecBoardSettingsPatch): Promise<SecBoardSettingsV1>
  readAnnotations(mode: AppMode): Promise<AnnotationBookV2 | null>
  writeAnnotations(mode: AppMode, book: AnnotationBookV2): Promise<void>
  readEvents(since: number): Promise<{ items: ApiEvent[]; latest: number }> | { items: ApiEvent[]; latest: number }
  executeSystemCommand(request: SystemCommandRequest): Promise<unknown>
}

const ErrorSchema = t.Object({
  ok: t.Literal(false),
  error: t.Object({
    code: t.String(),
    message: t.String(),
    details: t.Optional(t.Unknown())
  })
})

function failure(code: string, message: string, details?: unknown) {
  return { ok: false as const, error: { code, message, ...(details === undefined ? {} : { details }) } }
}

export function createApiV1(services: ApiV1Services) {
  return new Elysia({ name: 'secboard-api-v1', prefix: '/api/v1' })
    .model({
      SecBoardSettings: SecBoardSettingsSchema,
      AnnotationBook: AnnotationBookSchema,
      ApiError: ErrorSchema
    })
    .onError(({ code, error, set }) => {
      set.status = code === 'VALIDATION' ? 422 : 500
      return failure(
        code === 'VALIDATION' ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR',
        code === 'VALIDATION' ? 'Request validation failed' : 'The request could not be completed'
      )
    })
    .get(
      '/settings',
      async () => ({ ok: true as const, data: await services.readSettings() }),
      { response: { 200: t.Object({ ok: t.Literal(true), data: SecBoardSettingsSchema }) } }
    )
    .patch(
      '/settings',
      async ({ body }) => ({ ok: true as const, data: await services.patchSettings(body) }),
      {
        body: SecBoardSettingsPatchSchema,
        response: { 200: t.Object({ ok: t.Literal(true), data: SecBoardSettingsSchema }) }
      }
    )
    .get(
      '/annotations/:mode',
      async ({ params, set }) => {
        const book = await services.readAnnotations(params.mode)
        if (!book) {
          set.status = 404
          return failure('ANNOTATIONS_NOT_FOUND', 'No annotation document exists for this mode')
        }
        return { ok: true as const, data: book }
      },
      {
        params: t.Object({ mode: AppModeSchema }),
        response: {
          200: t.Object({ ok: t.Literal(true), data: AnnotationBookSchema }),
          404: ErrorSchema
        }
      }
    )
    .put(
      '/annotations/:mode',
      async ({ params, body }) => {
        await services.writeAnnotations(params.mode, body)
        return { ok: true as const, data: body }
      },
      {
        params: t.Object({ mode: AppModeSchema }),
        body: AnnotationBookSchema,
        response: { 200: t.Object({ ok: t.Literal(true), data: AnnotationBookSchema }) }
      }
    )
    .get(
      '/events',
      async ({ query }) => {
        const since = Math.max(0, Math.floor(query.since ?? 0))
        const result = await services.readEvents(since)
        return { ok: true as const, data: result.items, meta: { latest: result.latest } }
      },
      {
        query: t.Object({ since: t.Optional(t.Numeric({ minimum: 0 })) }),
        response: {
          200: t.Object({
            ok: t.Literal(true),
            data: t.Array(t.Object({ id: t.Number(), type: t.String(), payload: t.Optional(t.Unknown()), ts: t.Number() })),
            meta: t.Object({ latest: t.Number() })
          })
        }
      }
    )
    .post(
      '/system/commands',
      async ({ body }) => ({ ok: true as const, data: await services.executeSystemCommand(body) }),
      { body: SystemCommandSchema }
    )
}

export type ApiV1App = ReturnType<typeof createApiV1>
