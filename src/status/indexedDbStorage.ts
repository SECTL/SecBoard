const DB_NAME = 'secboard-db'
const STORE_NAME = 'kv-store'
const DB_VERSION = 1

type CacheEntry = { value: unknown; exists: boolean }

let dbInstance: IDBDatabase | null = null
const cache = new Map<string, CacheEntry>()
const pendingTransactions = new Set<IDBTransaction>()

function levelNotFoundError(): Error & { code: string; notFound: boolean } {
  const err = new Error('NotFound')
  ;(err as any).code = 'LEVEL_NOT_FOUND'
  ;(err as any).notFound = true
  return err as Error & { code: string; notFound: boolean }
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function promisifyTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(new Error('IndexedDB transaction aborted'))
  })
}

export async function openDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))

    request.onsuccess = () => {
      dbInstance = request.result
      dbInstance.onclose = () => {
        dbInstance = null
      }
      dbInstance.onerror = () => {
        dbInstance = null
      }
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

export async function getValue<T = unknown>(key: string): Promise<T> {
  const cached = cache.get(key)
  if (cached !== undefined) {
    if (!cached.exists) throw levelNotFoundError()
    return cached.value as T
  }

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const request = store.get(key)

  try {
    const result = await promisifyRequest<{ key: string; value: unknown } | undefined>(request)
    if (result === undefined) {
      cache.set(key, { value: undefined, exists: false })
      throw levelNotFoundError()
    }
    cache.set(key, { value: result.value, exists: true })
    return result.value as T
  } finally {
    pendingTransactions.delete(tx)
  }
}

export async function getValueOrUndefined<T = unknown>(key: string): Promise<T | undefined> {
  const cached = cache.get(key)
  if (cached !== undefined) {
    if (!cached.exists) return undefined
    return cached.value as T | undefined
  }

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const request = store.get(key)

  try {
    const result = await promisifyRequest<{ key: string; value: unknown } | undefined>(request)
    if (result === undefined) {
      cache.set(key, { value: undefined, exists: false })
      return undefined
    }
    cache.set(key, { value: result.value, exists: true })
    return result.value as T | undefined
  } finally {
    pendingTransactions.delete(tx)
  }
}

export async function putValue<T = unknown>(key: string, value: T): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const request = store.put({ key, value })

  pendingTransactions.add(tx)
  try {
    await promisifyRequest(request)
    await promisifyTransaction(tx)
    cache.set(key, { value, exists: true })
  } finally {
    pendingTransactions.delete(tx)
  }
}

export async function deleteValue(key: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const request = store.delete(key)

  pendingTransactions.add(tx)
  try {
    await promisifyRequest(request)
    await promisifyTransaction(tx)
    cache.delete(key)
  } finally {
    pendingTransactions.delete(tx)
  }
}

export async function deleteByPrefix(prefix: string): Promise<void> {
  const keys = await getAllKeys()
  const keysToDelete = keys.filter((k) => k.startsWith(prefix))

  if (keysToDelete.length === 0) return

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  pendingTransactions.add(tx)
  try {
    for (const key of keysToDelete) {
      store.delete(key)
    }
    await promisifyTransaction(tx)
    for (const key of keysToDelete) {
      cache.delete(key)
    }
  } finally {
    pendingTransactions.delete(tx)
  }
}

export async function getAllKeys(): Promise<string[]> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const request = store.getAllKeys()

  try {
    const keys = await promisifyRequest<IDBValidKey[]>(request)
    return keys.map((k) => String(k))
  } finally {
    pendingTransactions.delete(tx)
  }
}

export async function listEntriesByPrefix<T = unknown>(
  prefix: string,
  options?: { limit?: number }
): Promise<Array<{ key: string; value: T }>> {
  const limit = Math.max(1, Math.min(50_000, Math.floor(options?.limit ?? 1000)))
  const keys = await getAllKeys()
  const matchingKeys = keys.filter((k) => k.startsWith(prefix)).slice(0, limit)

  const entries: Array<{ key: string; value: T }> = []
  for (const key of matchingKeys) {
    const value = await getValueOrUndefined<T>(key)
    if (value !== undefined) {
      entries.push({ key, value })
    }
  }

  return entries
}

export async function listKeysByPrefix(prefix: string, options?: { limit?: number }): Promise<string[]> {
  const limit = Math.max(1, Math.min(50_000, Math.floor(options?.limit ?? 1000)))
  const keys = await getAllKeys()
  return keys.filter((k) => k.startsWith(prefix)).slice(0, limit)
}

export async function clearAll(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const request = store.clear()

  pendingTransactions.add(tx)
  try {
    await promisifyRequest(request)
    await promisifyTransaction(tx)
    cache.clear()
  } finally {
    pendingTransactions.delete(tx)
  }
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    cache.clear()
  }
}

export function clearCache(): void {
  cache.clear()
}

export function getCacheSize(): number {
  return cache.size
}
