export interface StorageAdapter {
  get<K extends string>(key: K): Promise<unknown>
  put<K extends string>(key: K, value: unknown): Promise<void>
  delete<K extends string>(key: K): Promise<void>
  list<K extends string>(prefix?: string): Promise<K[]>
  deleteByPrefix(prefix: string): Promise<void>
}

export interface EventAdapter {
  emit(type: string, payload?: unknown): void
  subscribe(callback: (event: EventItem) => void): () => void
  getEvents(since: number): { items: EventItem[]; latest: number }
}

export interface FilesystemAdapter {
  readFile(path: string): Promise<Buffer>
  writeFile(path: string, data: Buffer | string): Promise<void>
  exists(path: string): Promise<boolean>
  deleteFile(path: string): Promise<void>
  listFiles(dir: string): Promise<string[]>
}

export type EventItem = {
  id: number
  type: string
  payload?: unknown
  ts: number
}

export interface PlatformAdapters {
  storage: StorageAdapter
  events: EventAdapter
  filesystem?: FilesystemAdapter
}
