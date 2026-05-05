import { createCoreApp } from '../core/app'
import { BunStorageAdapter } from '../adapters/bunStorage'
import { BunEventAdapter } from '../adapters/bunEvents'
import { BunFilesystemAdapter } from '../adapters/bunFilesystem'

const storage = new BunStorageAdapter()
const events = new BunEventAdapter()
const filesystem = new BunFilesystemAdapter()

const app = createCoreApp({ storage, events, filesystem })

const port = Number(process.env.LANSTART_BACKEND_PORT ?? 3131)
const host = String(process.env.LANSTART_BACKEND_HOST ?? '127.0.0.1')

app.listen({ port, host }, ({ port }) => {
  console.log(`Elysia server running on http://${host}:${port}`)
})
