import type { FilesystemAdapter } from '../core/adapters'

export interface CfEnv {
  R2_BUCKET: R2Bucket
}

export class CfFilesystemAdapter implements FilesystemAdapter {
  private bucket: R2Bucket

  constructor(env: CfEnv) {
    this.bucket = env.R2_BUCKET
  }

  async readFile(path: string): Promise<Buffer> {
    const object = await this.bucket.get(path)
    if (!object) {
      throw new Error('File not found')
    }
    const arrayBuffer = await object.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async writeFile(path: string, data: Buffer | string): Promise<void> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data
    await this.bucket.put(path, buffer)
  }

  async exists(path: string): Promise<boolean> {
    const object = await this.bucket.head(path)
    return object !== null
  }

  async deleteFile(path: string): Promise<void> {
    await this.bucket.delete(path)
  }

  async listFiles(dir: string): Promise<string[]> {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`
    const listing = await this.bucket.list({ prefix })
    return listing.objects.map(o => o.key)
  }
}
