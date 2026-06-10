export type EventItem = {
  id: number
  type: string
  payload?: unknown
  ts: number
}

export type EventPayloadMap = {
  KV_GET: { key: string }
  KV_PUT: { key: string }
  UI_STATE_PUT: { windowId: string; key: string; value: unknown }
  UI_STATE_DEL: { windowId: string; key: string }
  COMMAND: { command: string; payload: unknown }
  BACKEND_EVENT: { event: EventItem }
  BACKEND_FORWARD: { target: string; command: string; payload: unknown }
}

const MAX_EVENTS = 200

let nextId = 1
const events: EventItem[] = []
const subscribers = new Set<(event: EventItem) => void>()

function trimEvents() {
  while (events.length > MAX_EVENTS) {
    events.shift()
  }
}

export function subscribe(callback: (event: EventItem) => void): () => void {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function emit<T extends keyof EventPayloadMap>(type: T, payload?: EventPayloadMap[T]): void
export function emit(type: string, payload?: unknown): void
export function emit(type: string, payload?: unknown): void {
  const event: EventItem = {
    id: nextId++,
    type,
    payload,
    ts: Date.now()
  }
  events.push(event)
  trimEvents()
  for (const cb of subscribers) {
    try {
      cb(event)
    } catch {}
  }
}

export function getEvents(since: number): { items: EventItem[]; latest: number } {
  const latest = events.length > 0 ? events[events.length - 1].id : since
  if (since <= 0) {
    return { items: [...events], latest }
  }
  const idx = events.findIndex((e) => e.id > since)
  if (idx === -1) {
    return { items: [], latest }
  }
  return { items: events.slice(idx), latest }
}
