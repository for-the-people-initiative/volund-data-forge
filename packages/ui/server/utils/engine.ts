/**
 * Shared Data Engine instance for Nitro server routes.
 * Initialized by the data-engine plugin (server/plugins/data-engine.ts).
 */
import type { DataEngine } from '@data-engine/engine'
import type { SchemaRegistry } from '@data-engine/schema'
import type { DatabaseAdapter } from '@data-engine/adapter'
import type { ApiRouter } from '@data-engine/api'
import { MigrationManager } from '@data-engine/migration'

type MigrationManagerInstance = InstanceType<typeof MigrationManager>

let _engine: DataEngine | null = null
let _registry: SchemaRegistry | null = null
let _adapter: DatabaseAdapter | null = null
let _apiRouter: ApiRouter | null = null
let _migrationManager: MigrationManagerInstance | null = null

// Readiness gate: resolves when the engine is fully initialized
let _readyResolve: () => void
const _ready: Promise<void> = new Promise((resolve) => {
  _readyResolve = resolve
})

/**
 * Wait for the data engine to be fully initialized.
 * Call this at the top of API route handlers to avoid race conditions
 * where SSR requests arrive before the Nitro plugin finishes.
 */
export function waitForEngine(): Promise<void> {
  return _ready
}

export function setEngine(
  engine: DataEngine,
  registry: SchemaRegistry,
  adapter: DatabaseAdapter,
  apiRouter?: ApiRouter,
) {
  _engine = engine
  _registry = registry
  _adapter = adapter
  _apiRouter = apiRouter ?? null
  // Signal that engine is ready
  _readyResolve()
}

export function setMigrationManager(mm: MigrationManagerInstance) {
  _migrationManager = mm
}

export function getMigrationManager(): MigrationManagerInstance | null {
  return _migrationManager
}

export function getEngine(): DataEngine {
  if (!_engine) throw new Error('DataEngine not initialized')
  return _engine
}

export function getRegistry(): SchemaRegistry {
  if (!_registry) throw new Error('SchemaRegistry not initialized')
  return _registry
}

export function getAdapter(): DatabaseAdapter {
  if (!_adapter) throw new Error('DatabaseAdapter not initialized')
  return _adapter
}

export function getApiRouter(): ApiRouter {
  if (!_apiRouter) throw new Error('ApiRouter not initialized')
  return _apiRouter
}
