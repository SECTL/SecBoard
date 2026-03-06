import type { Env, UiStateRow } from './types'

export async function getUiState(env: Env, windowId: string): Promise<Record<string, unknown>> {
  const rows = await env.DB.prepare(
    'SELECT key, value FROM ui_state WHERE window_id = ?'
  ).bind(windowId).all<UiStateRow>()

  const state: Record<string, unknown> = {}
  for (const row of rows.results || []) {
    state[row.key] = JSON.parse(row.value)
  }
  return state
}

export async function getUiStateKey(env: Env, windowId: string, key: string): Promise<unknown> {
  const row = await env.DB.prepare(
    'SELECT value FROM ui_state WHERE window_id = ? AND key = ?'
  ).bind(windowId, key).first<UiStateRow>()

  if (!row) {
    const error = new Error('NotFound')
    ;(error as any).code = 'LEVEL_NOT_FOUND'
    throw error
  }
  return JSON.parse(row.value)
}

export async function putUiStateKey(env: Env, windowId: string, key: string, value: unknown): Promise<void> {
  const encoded = JSON.stringify(value)
  await env.DB.prepare(
    'INSERT INTO ui_state (window_id, key, value) VALUES (?, ?, ?) ON CONFLICT(window_id, key) DO UPDATE SET value = excluded.value'
  ).bind(windowId, key, encoded).run()
}

export async function deleteUiStateKey(env: Env, windowId: string, key: string): Promise<void> {
  await env.DB.prepare(
    'DELETE FROM ui_state WHERE window_id = ? AND key = ?'
  ).bind(windowId, key).run()
}
