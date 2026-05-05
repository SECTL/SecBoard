import type { StorageAdapter } from '../core/adapters'

export interface CfEnv {
  DB: D1Database
  KV: KVNamespace
}

export class CfStorageAdapter implements StorageAdapter {
  private db: D1Database
  private kv: KVNamespace

  constructor(env: CfEnv) {
    this.db = env.DB
    this.kv = env.KV
  }

  async get<K extends string>(key: K): Promise<unknown> {
    const result = await this.kv.get(key)
    if (result === null) {
      const err = new Error('NotFound')
      ;(err as any).code = 'LEVEL_NOT_FOUND'
      ;(err as any).notFound = true
      throw err
    }
    try {
      return JSON.parse(result)
    } catch {
      return result
    }
  }

  async put<K extends string>(key: K, value: unknown): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    await this.kv.put(key, serialized)
  }

  async delete<K extends string>(key: K): Promise<void> {
    await this.kv.delete(key)
  }

  async list<K extends string>(prefix?: string): Promise<K[]> {
    const keys = await this.kv.list({ prefix })
    return keys.keys.map(k => k.name) as K[]
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const keys = await this.kv.list({ prefix })
    await Promise.all(keys.keys.map(k => this.kv.delete(k.name)))
  }
}
