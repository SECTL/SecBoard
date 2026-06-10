import { createRequire } from 'node:module'

// Runtime detection: prefer bun:sqlite when running under Bun, otherwise fall
// back to better-sqlite3. The two drivers expose a similar synchronous API
// (prepare / exec / close), so we wrap them behind a small uniform interface.
const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined'

// `createRequire` is available in both ESM and CJS contexts in Node, and is
// also supported by Bun. Using it lets us load either `bun:sqlite` (a Bun
// built-in) or `better-sqlite3` (a regular Node CJS addon) through the same
// `require`-shaped function without depending on `module` being a global.
const nodeRequire = createRequire(resolveRequireBase())

function resolveRequireBase(): string {
  // In CJS, __filename is defined by the module wrapper. In ESM, it isn't,
  // so we fall back to `import.meta.url`. The typeof check itself doesn't
  // throw a ReferenceError even if the identifier is undeclared.
  // @ts-ignore - __filename is not always defined in ESM.
  if (typeof __filename === 'string') return __filename
  // @ts-ignore - import.meta is only valid in ESM modules.
  return import.meta.url
}

type SqliteRow = Record<string, unknown>

type SqliteStatement = {
  run(...params: unknown[]): unknown
  get(...params: unknown[]): SqliteRow | undefined
  all(...params: unknown[]): SqliteRow[]
}

type SqliteDatabase = {
  prepare(sql: string): SqliteStatement
  exec(sql: string): void
  close(throwOnError?: boolean): void
}

type SqliteConstructor = new (path: string, options?: { create?: boolean }) => unknown

let SqliteCtor: SqliteConstructor
if (isBun) {
  // bun:sqlite is a Bun built-in module; nodeRequire returns `any` so no
  // type-suppression is required here.
  const bunSqlite = nodeRequire('bun:sqlite') as { Database: SqliteConstructor }
  SqliteCtor = bunSqlite.Database
} else {
  type BetterSqlite3Module = { default?: SqliteConstructor } & SqliteConstructor
  const mod = nodeRequire('better-sqlite3') as BetterSqlite3Module
  // better-sqlite3 is exported as `module.exports = Database`; with esModuleInterop
  // some loaders may also expose a `.default` property.
  SqliteCtor = (mod.default ?? mod) as SqliteConstructor
}

function wrapDatabase(raw: unknown): SqliteDatabase {
  const db = raw as {
    prepare?: (sql: string) => unknown
    exec?: (sql: string) => void
    query?: (sql: string) => { run?: (...args: unknown[]) => unknown; get?: (...args: unknown[]) => SqliteRow | undefined; all?: (...args: unknown[]) => SqliteRow[] }
    close?: (throwOnError?: boolean) => void
  }

  if (typeof db.prepare === 'function' && typeof db.exec === 'function' && typeof db.close === 'function') {
    // better-sqlite3-shaped driver
    const prepared = db as unknown as {
      prepare(sql: string): {
        run(...args: unknown[]): unknown
        get(...args: unknown[]): SqliteRow | undefined
        all(...args: unknown[]): SqliteRow[]
      }
      exec(sql: string): void
      close(throwOnError?: boolean): void
    }
    return {
      prepare: (sql) => prepared.prepare(sql),
      exec: (sql) => prepared.exec(sql),
      close: (throwOnError) => prepared.close(throwOnError)
    }
  }

  if (typeof db.query === 'function') {
    // bun:sqlite-shaped driver
    const bunDb = db as unknown as {
      query(sql: string): {
        run(...args: unknown[]): unknown
        get(...args: unknown[]): SqliteRow | undefined
        all(...args: unknown[]): SqliteRow[]
      }
      exec(sql: string): void
      close(throwOnError?: boolean): void
    }
    return {
      prepare: (sql) => bunDb.query(sql),
      exec: (sql) => bunDb.exec(sql),
      close: (throwOnError) => bunDb.close(throwOnError)
    }
  }

  throw new Error('Unsupported sqlite driver: missing prepare/exec or query/close')
}

export type LeavelDb = {
  raw: SqliteDatabase
  close: () => Promise<void>
}

function parseJsonValue<T>(raw: unknown): T {
  const text = typeof raw === 'string' ? raw : String(raw ?? '')
  return JSON.parse(text) as T
}

function levelNotFoundError(): Error & { code: string; notFound: boolean } {
  const err = new Error('NotFound')
  ;(err as any).code = 'LEVEL_NOT_FOUND'
  ;(err as any).notFound = true
  return err as Error & { code: string; notFound: boolean }
}

export function openLeavelDb(dbPath: string): LeavelDb {
  const options = isBun ? { create: true } : undefined
  const rawInstance = new SqliteCtor(dbPath, options)
  const db = wrapDatabase(rawInstance)
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `)

  return {
    raw: db,
    close: async () => {
      db.close()
    }
  }
}

export async function getValue<T = unknown>(db: LeavelDb, key: string): Promise<T> {
  const row = db.raw.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined
  if (!row) throw levelNotFoundError()
  return parseJsonValue<T>(row.value)
}

export async function getValueOrUndefined<T = unknown>(db: LeavelDb, key: string): Promise<T | undefined> {
  const row = db.raw.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined
  if (!row) return undefined
  return parseJsonValue<T>(row.value)
}

export async function putValue<T = unknown>(db: LeavelDb, key: string, value: T): Promise<void> {
  const encoded = JSON.stringify(value)
  db.raw.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, encoded)
}

export async function deleteValue(db: LeavelDb, key: string): Promise<void> {
  db.raw.prepare('DELETE FROM kv WHERE key = ?').run(key)
}

export async function listEntriesByPrefix<T = unknown>(
  db: LeavelDb,
  prefix: string,
  options?: { limit?: number }
): Promise<Array<{ key: string; value: T }>> {
  const limit = Math.max(1, Math.min(50_000, Math.floor(options?.limit ?? 1000)))
  const lt = `${prefix}\uffff`
  const rows = db.raw
    .prepare('SELECT key, value FROM kv WHERE key >= ? AND key < ? ORDER BY key ASC LIMIT ?')
    .all(prefix, lt, limit) as Array<{ key: string; value: string }>

  return rows.map((row) => ({ key: row.key, value: parseJsonValue<T>(row.value) }))
}

export async function listKeysByPrefix(db: LeavelDb, prefix: string, options?: { limit?: number }): Promise<string[]> {
  const limit = Math.max(1, Math.min(50_000, Math.floor(options?.limit ?? 1000)))
  const lt = `${prefix}\uffff`
  const rows = db.raw
    .prepare('SELECT key FROM kv WHERE key >= ? AND key < ? ORDER BY key ASC LIMIT ?')
    .all(prefix, lt, limit) as Array<{ key: string }>

  return rows.map((row) => row.key)
}

export async function getAllKeys(db: LeavelDb, options?: { limit?: number }): Promise<string[]> {
  const limit = Math.max(1, Math.min(500_000, Math.floor(options?.limit ?? 100_000)))
  const rows = db.raw
    .prepare('SELECT key FROM kv ORDER BY key ASC LIMIT ?')
    .all(limit) as Array<{ key: string }>

  return rows.map((row) => row.key)
}

export async function deleteByPrefix(db: LeavelDb, prefix: string, options?: { limit?: number }): Promise<number> {
  const limit = Math.max(1, Math.min(500_000, Math.floor(options?.limit ?? 100_000)))
  const keys = await listKeysByPrefix(db, prefix, { limit })
  if (!keys.length) return 0

  const del = db.raw.prepare('DELETE FROM kv WHERE key = ?')
  db.raw.exec('BEGIN')
  try {
    for (const key of keys) del.run(key)
    db.raw.exec('COMMIT')
  } catch (e) {
    db.raw.exec('ROLLBACK')
    throw e
  }
  return keys.length
}
