import type { Env, CunoxFileRow } from './types'

export async function getCunoxFile(env: Env, path: string): Promise<ArrayBuffer | null> {
  const obj = await env.R2_BUCKET.get(`cunox/${path}`)
  if (!obj) return null
  return await obj.arrayBuffer()
}

export async function putCunoxFile(env: Env, path: string, data: ArrayBuffer, contentType: string): Promise<void> {
  const now = Date.now()
  await env.R2_BUCKET.put(`cunox/${path}`, data, {
    httpMetadata: { contentType }
  })

  await env.DB.prepare(`
    INSERT INTO cunox_files (path, content_type, size, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET 
      content_type = excluded.content_type,
      size = excluded.size,
      updated_at = excluded.updated_at
  `).bind(path, contentType, data.byteLength, now, now).run()
}

export async function deleteCunoxFile(env: Env, path: string): Promise<void> {
  await env.R2_BUCKET.delete(`cunox/${path}`)
  await env.DB.prepare('DELETE FROM cunox_files WHERE path = ?').bind(path).run()
}

export async function listCunoxFiles(env: Env, prefix: string = ''): Promise<CunoxFileRow[]> {
  const rows = await env.DB.prepare(
    'SELECT path, content_type, size, created_at, updated_at FROM cunox_files WHERE path LIKE ? ORDER BY path'
  ).bind(`${prefix}%`).all<CunoxFileRow>()
  return rows.results || []
}

export async function getCunoxFileInfo(env: Env, path: string): Promise<CunoxFileRow | null> {
  const row = await env.DB.prepare(
    'SELECT path, content_type, size, created_at, updated_at FROM cunox_files WHERE path = ?'
  ).bind(path).first<CunoxFileRow>()
  return row || null
}

export async function getSignedUploadUrl(env: Env, key: string): Promise<string> {
  const url = await env.R2_BUCKET.createSignedUploadUrl(`cunox/${key}`, {
    expiration: 3600
  })
  return url
}

export async function getSignedDownloadUrl(env: Env, key: string): Promise<string> {
  const url = await env.R2_BUCKET.signGetObject(`cunox/${key}`, 3600)
  return url
}
