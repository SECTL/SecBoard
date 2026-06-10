import type { StorageAdapter } from '../core/adapters'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export class NodeStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>()
  private persistPath: string | null

  constructor(persistPath?: string) {
    this.persistPath = persistPath ?? process.env.LANSTART_NODE_STORAGE_PATH ?? null
    if (this.persistPath && existsSync(this.persistPath)) {
      try {
        const data = JSON.parse(readFileSync(this.persistPath, 'utf-8'))
        if (data && typeof data === 'object') {
          for (const [k, v] of Object.entries(data)) this.store.set(k, v)
        }
      } catch (e) {
        // corrupted file — start fresh
      }
    }
  }

  private persist(): void {
    if (!this.persistPath) return
    try {
      const obj: Record<string, unknown> = {}
      for (const [k, v] of this.store) obj[k] = v
      writeFileSync(this.persistPath, JSON.stringify(obj), 'utf-8')
    } catch {}
  }

  async get<K extends string>(key: K): Promise<unknown> {
    if (!this.store.has(key)) {
      const err = new Error('NotFound')
      ;(err as any).code = 'LEVEL_NOT_FOUND'
      ;(err as any).notFound = true
      throw err
    }
    return this.store.get(key)
  }

  async put<K extends string>(key: K, value: unknown): Promise<void> {
    this.store.set(key, value)
    this.persist()
  }

  async delete<K extends string>(key: K): Promise<void> {
    this.store.delete(key)
    this.persist()
  }

  async list<K extends string>(prefix?: string): Promise<K[]> {
    const allKeys = Array.from(this.store.keys()) as K[]
    if (!prefix) return allKeys
    return allKeys.filter(k => k.startsWith(prefix))
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of this.list(prefix)) {
      this.store.delete(key)
    }
    this.persist()
  }
}
