import type { FilesystemAdapter } from '../core/adapters'
import { readFile, writeFile, stat, unlink, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export class BunFilesystemAdapter implements FilesystemAdapter {
  private baseDir: string

  constructor(baseDir: string = './') {
    this.baseDir = baseDir
  }

  async readFile(path: string): Promise<Buffer> {
    return await readFile(join(this.baseDir, path))
  }

  async writeFile(path: string, data: Buffer | string): Promise<void> {
    await writeFile(join(this.baseDir, path), data)
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(join(this.baseDir, path))
      return true
    } catch {
      return false
    }
  }

  async deleteFile(path: string): Promise<void> {
    await unlink(join(this.baseDir, path))
  }

  async listFiles(dir: string): Promise<string[]> {
    return await readdir(join(this.baseDir, dir))
  }
}
