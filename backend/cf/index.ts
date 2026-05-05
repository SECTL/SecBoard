import { createCoreApp } from '../core/app'
import { CfStorageAdapter, type CfEnv } from '../adapters/cfStorage'
import { CfEventAdapter } from '../adapters/cfEvents'
import { CfFilesystemAdapter } from '../adapters/cfFilesystem'

type Env = CfEnv & {
  R2_BUCKET: R2Bucket
}

let app: ReturnType<typeof createCoreApp> | null = null

function getApp(env: Env) {
  if (!app) {
    const storage = new CfStorageAdapter(env)
    const events = new CfEventAdapter(env)
    const filesystem = new CfFilesystemAdapter(env)
    app = createCoreApp({ storage, events, filesystem })
  }
  return app
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const app = getApp(env)
    return await app.handle(request)
  }
}
