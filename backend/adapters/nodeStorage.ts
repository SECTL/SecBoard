import type { StorageAdapter } from '../core/adapters'

export class NodeStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>()

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
  }

  async delete<K extends string>(key: K): Promise<void> {
    this.store.delete(key)
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
  }
}
