import type { EventAdapter, EventItem } from '../core/adapters'

export class BunEventAdapter implements EventAdapter {
  private events: EventItem[] = []
  private nextId = 1
  private subscribers = new Set<(event: EventItem) => void>()
  private maxEvents = 200

  emit(type: string, payload?: unknown): void {
    const event: EventItem = {
      id: this.nextId++,
      type,
      payload,
      ts: Date.now()
    }
    this.events.push(event)
    while (this.events.length > this.maxEvents) {
      this.events.shift()
    }
    for (const cb of this.subscribers) {
      try {
        cb(event)
      } catch {}
    }
  }

  subscribe(callback: (event: EventItem) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  getEvents(since: number): { items: EventItem[]; latest: number } {
    const latest = this.events.length > 0 
      ? this.events[this.events.length - 1].id 
      : since
    if (since <= 0) {
      return { items: [...this.events], latest }
    }
    const idx = this.events.findIndex(e => e.id > since)
    if (idx === -1) {
      return { items: [], latest }
    }
    return { items: this.events.slice(idx), latest }
  }
}
