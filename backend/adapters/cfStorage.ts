import type { StorageAdapter } from '../core/adapters'

export interface CfEnv {
  DB: D1Database
  // Optional: the deployed `secboard-cf` Worker only binds D1 (and R2), not
  // KV. The standalone `backend/cf` adapter bundle still expects KV, so it
  // is declared as optional here. Pass `undefined` when the binding is not
  // available at runtime; calls to KV-backed methods will then throw a
  // descriptive error.
  KV?: KVNamespace
}

export class CfStorageAdapter implements StorageAdapter {
  private db: D1Database
  private kv: KVNamespace | undefined

  constructor(env: CfEnv) {
    this.db = env.DB
    this.kv = env.KV
  }

  private requireKv(): KVNamespace {
    if (!this.kv) {
      throw new Error('KV binding is not configured for this deployment')
    }
    return this.kv
  }

  async get<K extends string>(key: K): Promise<unknown> {
    const result = await this.requireKv().get(key)
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
    await this.requireKv().put(key, serialized)
  }

  async delete<K extends string>(key: K): Promise<void> {
    await this.requireKv().delete(key)
  }

  async list<K extends string>(prefix?: string): Promise<K[]> {
    const keys = await this.requireKv().list({ prefix })
    return keys.keys.map(k => k.name) as K[]
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const kv = this.requireKv()
    const keys = await kv.list({ prefix })
    await Promise.all(keys.keys.map(k => kv.delete(k.name)))
  }
}
