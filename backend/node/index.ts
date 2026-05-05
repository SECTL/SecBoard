import { Elysia } from 'elysia/node'
import { createCoreApp } from '../core/app'
import { NodeStorageAdapter } from '../adapters/nodeStorage'
import { NodeEventAdapter } from '../adapters/nodeEvents'
import { NodeFilesystemAdapter } from '../adapters/nodeFilesystem'

const storage = new NodeStorageAdapter()
const events = new NodeEventAdapter()
const filesystem = new NodeFilesystemAdapter()

const app = createCoreApp({ storage, events, filesystem })

const port = Number(process.env.LANSTART_BACKEND_PORT ?? 3131)
const host = String(process.env.LANSTART_BACKEND_HOST ?? '127.0.0.1')

app.listen({ port, host }, ({ port }) => {
  console.log(`Elysia server running on http://${host}:${port}`)
})
