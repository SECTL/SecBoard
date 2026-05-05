import type { EventAdapter, EventItem } from '../core/adapters'

export interface CfEnv {
  KV: KVNamespace
}

export class CfEventAdapter implements EventAdapter {
  private kv: KVNamespace
  private maxEvents = 200

  constructor(env: CfEnv) {
    this.kv = env.KV
  }

  async emit(type: string, payload?: unknown): void {
    const events = await this.getEventsArray()
    const event: EventItem = {
      id: events.length > 0 ? events[events.length - 1].id + 1 : 1,
      type,
      payload,
      ts: Date.now()
    }
    events.push(event)
    while (events.length > this.maxEvents) {
      events.shift()
    }
    await this.kv.put('events', JSON.stringify(events))
  }

  subscribe(callback: (event: EventItem) => void): () => void {
    return () => {}
  }

  getEvents(since: number): { items: EventItem[]; latest: number } {
    const events = this.getEventsArraySync()
    const latest = events.length > 0 
      ? events[events.length - 1].id 
      : since
    if (since <= 0) {
      return { items: [...events], latest }
    }
    const idx = events.findIndex(e => e.id > since)
    if (idx === -1) {
      return { items: [], latest }
    }
    return { items: events.slice(idx), latest }
  }

  private async getEventsArray(): Promise<EventItem[]> {
    try {
      const data = await this.kv.get('events')
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private getEventsArraySync(): EventItem[] {
    try {
      const data = this.kv.get('events') as unknown as string
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }
}
