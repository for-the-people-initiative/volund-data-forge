/**
 * FW-CONFIG-001/002/003: Bootstrap — createDataEngine() factory
 */

import { SchemaRegistry, ConfigError } from '@data-engine/schema'
import type { Logger } from '@data-engine/schema'
import type { DatabaseAdapter } from '@data-engine/adapter'
import { DataEngine } from './engine.js'
import { ApiRouter } from '@data-engine/api'
import { MigrationManager } from '@data-engine/migration'
import type { EngineOptions } from './types.js'

// ─── Config Types ────────────────────────────────────────────────────

export interface DataEngineConfig {
  database: {
    client: string
    connection: Record<string, unknown>
    primaryKey?: 'uuid' | 'auto-increment'
  }
  /** Pre-constructed adapter — if provided, database config is ignored for adapter creation */
  adapter?: DatabaseAdapter
  /** Default database schema (namespace) to use, e.g. 'public' */
  schema?: string
  options?: {
    defaultLimit?: number
    logger?: Logger
  }
}

export interface DataEngineInstance {
  engine: DataEngine
  registry: SchemaRegistry
  adapter: DatabaseAdapter
  apiRouter: ApiRouter
  migrationManager: MigrationManager
  destroy: () => Promise<void>
  // Schema (namespace) operations
  setSchema: (name: string) => void
  getSchema: () => string
  createSchema: (name: string) => Promise<void>
  listSchemas: () => Promise<string[]>
  dropSchema: (name: string, cascade?: boolean) => Promise<void>
}

// ─── Adapter Factory ─────────────────────────────────────────────────

const SUPPORTED_CLIENTS = ['better-sqlite3', 'sqlite3', 'pg', 'mysql2']

async function createAdapter(config: DataEngineConfig, logger?: Logger): Promise<DatabaseAdapter> {
  const { client } = config.database

  if (!SUPPORTED_CLIENTS.includes(client)) {
    throw new ConfigError(
      `Unsupported database client "${client}". Supported: ${SUPPORTED_CLIENTS.join(', ')}`,
      { client, supported: SUPPORTED_CLIENTS },
    )
  }

  // Dynamic import to avoid hard dependency on @data-engine/adapter-knex
  const { KnexAdapter } = await import('@data-engine/adapter-knex')

  const isSQLite = client === 'better-sqlite3' || client === 'sqlite3'

  return new KnexAdapter({
    client: client as 'better-sqlite3' | 'sqlite3' | 'pg' | 'mysql2',
    database: isSQLite
      ? ((config.database.connection['filename'] as string) ?? ':memory:')
      : ((config.database.connection['database'] as string) ?? ''),
    host: config.database.connection['host'] as string | undefined,
    port: config.database.connection['port'] as number | undefined,
    user: config.database.connection['user'] as string | undefined,
    password: config.database.connection['password'] as string | undefined,
    primaryKey: config.database.primaryKey ?? 'uuid',
    logger,
  })
}

// ─── Bootstrap ───────────────────────────────────────────────────────

let _destroyed = false

export async function createDataEngine(config: DataEngineConfig): Promise<DataEngineInstance> {
  const logger = config.options?.logger

  // 1. Create adapter (use injected adapter or create via dynamic import)
  const adapter = config.adapter ?? (await createAdapter(config, logger))

  // 2. Connect
  await adapter.connect()

  // 2b. Set schema if configured
  if (config.schema) {
    adapter.setSchema(config.schema)
  }

  // 3. Create components
  const registry = new SchemaRegistry()
  const engineOptions: EngineOptions = {
    defaultLimit: config.options?.defaultLimit,
    logger,
  }
  const engine = new DataEngine(registry, adapter, engineOptions)
  const apiRouter = new ApiRouter(engine, registry, adapter)
  const migrationManager = new MigrationManager(registry, adapter, logger)

  // 4. Init migration tracking tables
  await migrationManager.init()

  // 5. Destroy function
  let isDestroyed = false

  const instance: DataEngineInstance = {
    engine,
    registry,
    adapter,
    apiRouter,
    migrationManager,
    destroy: async () => {
      if (isDestroyed) return // idempotent
      isDestroyed = true
      await adapter.disconnect()
    },
    setSchema: (name: string) => adapter.setSchema(name),
    getSchema: () => adapter.getSchema(),
    createSchema: (name: string) => adapter.createSchema(name),
    listSchemas: () => adapter.listSchemas(),
    dropSchema: (name: string, cascade?: boolean) => adapter.dropSchema(name, cascade),
  }

  return instance
}
