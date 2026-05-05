import type { StorageAdapter } from '../core/adapters'
import { openLeavelDb, getValue, putValue, deleteValue, deleteByPrefix, getAllKeys } from '../../src/LeavelDB'

export class BunStorageAdapter implements StorageAdapter {
  private db: ReturnType<typeof openLeavelDb>

  constructor(dbPath: string = './lanstart.sqlite') {
    this.db = openLeavelDb(dbPath)
  }

  async get<K extends string>(key: K): Promise<unknown> {
    return await getValue(this.db, key)
  }

  async put<K extends string>(key: K, value: unknown): Promise<void> {
    await putValue(this.db, key, value)
  }

  async delete<K extends string>(key: K): Promise<void> {
    await deleteValue(this.db, key)
  }

  async list<K extends string>(prefix?: string): Promise<K[]> {
    const allKeys = await getAllKeys(this.db) as K[]
    if (!prefix) return allKeys
    return allKeys.filter(k => k.startsWith(prefix))
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    await deleteByPrefix(this.db, prefix)
  }
}
