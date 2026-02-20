/**
 * FW-CONFIG-001/002/003: Bootstrap — createDataEngine() factory
 */

import { SchemaRegistry, ConfigError, createSilentLogger } from '@data-engine/schema';
import type { Logger } from '@data-engine/schema';
import type { DatabaseAdapter } from '@data-engine/adapter';
import { KnexAdapter } from '@data-engine/adapter-knex';
import { DataEngine } from './engine.js';
import { ApiRouter } from '@data-engine/api';
import { MigrationManager } from '@data-engine/migration';
import type { EngineOptions } from './types.js';

// ─── Config Types ────────────────────────────────────────────────────

export interface DataEngineConfig {
  database: {
    client: string;
    connection: Record<string, unknown>;
    primaryKey?: 'uuid' | 'auto-increment';
  };
  options?: {
    defaultLimit?: number;
    logger?: Logger;
  };
}

export interface DataEngineInstance {
  engine: DataEngine;
  registry: SchemaRegistry;
  adapter: DatabaseAdapter;
  apiRouter: ApiRouter;
  migrationManager: MigrationManager;
  destroy: () => Promise<void>;
}

// ─── Adapter Factory ─────────────────────────────────────────────────

const SUPPORTED_CLIENTS = ['better-sqlite3', 'sqlite3', 'pg', 'mysql2'];

function createAdapter(config: DataEngineConfig, logger?: Logger): DatabaseAdapter {
  const { client } = config.database;

  if (!SUPPORTED_CLIENTS.includes(client)) {
    throw new ConfigError(
      `Unsupported database client "${client}". Supported: ${SUPPORTED_CLIENTS.join(', ')}`,
      { client, supported: SUPPORTED_CLIENTS },
    );
  }

  const isSQLite = client === 'better-sqlite3' || client === 'sqlite3';

  return new KnexAdapter({
    client: client as 'better-sqlite3' | 'sqlite3' | 'pg' | 'mysql2',
    database: isSQLite
      ? (config.database.connection['filename'] as string) ?? ':memory:'
      : (config.database.connection['database'] as string) ?? '',
    host: config.database.connection['host'] as string | undefined,
    port: config.database.connection['port'] as number | undefined,
    user: config.database.connection['user'] as string | undefined,
    password: config.database.connection['password'] as string | undefined,
    primaryKey: config.database.primaryKey ?? 'uuid',
    logger,
  });
}

// ─── Bootstrap ───────────────────────────────────────────────────────

let destroyed = false;

export async function createDataEngine(config: DataEngineConfig): Promise<DataEngineInstance> {
  const logger = config.options?.logger;

  // 1. Create adapter
  const adapter = createAdapter(config, logger);

  // 2. Connect
  await adapter.connect();

  // 3. Create components
  const registry = new SchemaRegistry();
  const engineOptions: EngineOptions = {
    defaultLimit: config.options?.defaultLimit,
    logger,
  };
  const engine = new DataEngine(registry, adapter, engineOptions);
  const apiRouter = new ApiRouter(engine, registry);
  const migrationManager = new MigrationManager(registry, adapter, logger);

  // 4. Init migration tracking tables
  await migrationManager.init();

  // 5. Destroy function
  let isDestroyed = false;

  const instance: DataEngineInstance = {
    engine,
    registry,
    adapter,
    apiRouter,
    migrationManager,
    destroy: async () => {
      if (isDestroyed) return; // idempotent
      isDestroyed = true;
      await adapter.disconnect();
    },
  };

  return instance;
}
