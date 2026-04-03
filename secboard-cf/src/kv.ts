import type { Env, KvRow } from './types'

export async function getKv(env: Env, key: string): Promise<unknown> {
  const result = await env.DB.prepare(
    'SELECT value FROM kv WHERE key = ?'
  ).bind(key).first<KvRow>()

  if (!result) {
    const error = new Error('NotFound')
    ;(error as any).code = 'LEVEL_NOT_FOUND'
    throw error
  }
  return JSON.parse(result.value)
}

export async function getKvOrUndefined(env: Env, key: string): Promise<unknown | undefined> {
  const result = await env.DB.prepare(
    'SELECT value FROM kv WHERE key = ?'
  ).bind(key).first<KvRow>()

  if (!result) return undefined
  return JSON.parse(result.value)
}

export async function putKv(env: Env, key: string, value: unknown): Promise<void> {
  const encoded = JSON.stringify(value)
  await env.DB.prepare(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind(key, encoded).run()
}

export async function deleteKv(env: Env, key: string): Promise<void> {
  await env.DB.prepare('DELETE FROM kv WHERE key = ?').bind(key).run()
}

export async function deleteByPrefix(env: Env, prefix: string): Promise<void> {
  await env.DB.prepare('DELETE FROM kv WHERE key LIKE ?').bind(`${prefix}%`).run()
}

export async function getAllKv(env: Env): Promise<Record<string, unknown>> {
  const rows = await env.DB.prepare('SELECT key, value FROM kv').all<KvRow>()
  const result: Record<string, unknown> = {}
  for (const row of rows.results || []) {
    result[row.key] = JSON.parse(row.value)
  }
  return result
}
