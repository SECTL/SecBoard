export interface Env {
  DB: D1Database
  R2_BUCKET: R2Bucket
}

export interface KvRow {
  key: string
  value: string
}

export interface UiStateRow {
  window_id: string
  key: string
  value: string
}

export interface EventRow {
  id: number
  type: string
  payload: string | null
  ts: number
}

export interface EventItem {
  id: number
  type: string
  payload?: unknown
  ts: number
}

export interface CunoxFileRow {
  path: string
  content_type: string
  size: number
  created_at: number
  updated_at: number
}

export interface EventsResponse {
  items: EventItem[]
  latest: number
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  error?: string
  value?: T
}
