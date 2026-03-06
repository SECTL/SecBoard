import type { Env, EventRow, EventItem, EventsResponse } from './types'

const MAX_EVENTS = 1000

export async function addEvent(env: Env, type: string, payload?: unknown): Promise<number> {
  const ts = Date.now()
  const payloadStr = payload ? JSON.stringify(payload) : null

  const result = await env.DB.prepare(
    'INSERT INTO events (type, payload, ts) VALUES (?, ?, ?)'
  ).bind(type, payloadStr, ts).run()

  await trimEvents(env)

  return result.meta.last_row_id as number
}

export async function getEvents(env: Env, since: number): Promise<EventsResponse> {
  const rows = await env.DB.prepare(
    'SELECT id, type, payload, ts FROM events WHERE id > ? ORDER BY id ASC'
  ).bind(since).all<EventRow>()

  const items: EventItem[] = rows.results?.map(row => ({
    id: row.id,
    type: row.type,
    payload: row.payload ? JSON.parse(row.payload) : undefined,
    ts: row.ts
  })) || []

  const latest = items.length > 0 ? items[items.length - 1].id : since

  return { items, latest }
}

export async function clearEvents(env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM events').run()
}

async function trimEvents(env: Env): Promise<void> {
  const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM events').first<{ count: number }>()
  const count = countResult?.count || 0

  if (count > MAX_EVENTS) {
    const deleteCount = count - MAX_EVENTS
    await env.DB.prepare(
      'DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY id ASC LIMIT ?)'
    ).bind(deleteCount).run()
  }
}
