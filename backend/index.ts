export { createCoreApp } from './core/app'
export type { PlatformAdapters, StorageAdapter, EventAdapter, FilesystemAdapter, EventItem } from './core/adapters'

export { BunStorageAdapter } from './adapters/bunStorage'
export { BunEventAdapter } from './adapters/bunEvents'
export { BunFilesystemAdapter } from './adapters/bunFilesystem'

export { CfStorageAdapter } from './adapters/cfStorage'
export { CfEventAdapter } from './adapters/cfEvents'
export { CfFilesystemAdapter } from './adapters/cfFilesystem'

export { NodeStorageAdapter } from './adapters/nodeStorage'
export { NodeEventAdapter } from './adapters/nodeEvents'
export { NodeFilesystemAdapter } from './adapters/nodeFilesystem'
