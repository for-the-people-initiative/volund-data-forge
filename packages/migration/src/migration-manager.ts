// MS-001 through MS-004: MigrationManager — forward-only orchestrator

import type { CollectionSchema, Logger } from '@data-engine/schema'
import { SchemaRegistry, diffSchemas } from '@data-engine/schema'
import type { DatabaseAdapter } from '@data-engine/adapter'
import type { SchemaVersion, Migration, MigrationResult, ApplySchemaOptions } from './types.js'
import { VersionTracker } from './version-tracker.js'
import {
  generateMigration,
  generateInverseMigration,
  MigrationError,
} from './migration-generator.js'
import { executeMigration } from './migration-executor.js'

export class MigrationManager {
  private versionTracker: VersionTracker
  private migrations = new Map<string, Migration[]>() // collection → migrations
  private logger?: Logger

  constructor(
    private registry: SchemaRegistry,
    private adapter: DatabaseAdapter,
    logger?: Logger,
  ) {
    this.versionTracker = new VersionTracker(adapter)
    this.logger = logger
  }

  /** Initialize internal tables */
  async init(): Promise<void> {
    await this.versionTracker.init()
  }

  /**
   * Run a callback with the adapter temporarily switched to a given schema.
   * Restores the previous schema afterwards (even on error).
   */
  private async withSchema<T>(schema: string | undefined, fn: () => Promise<T>): Promise<T> {
    if (!schema) return fn()

    const prev = this.adapter.getSchema()
    this.adapter.setSchema(schema)
    try {
      // Ensure version tracking table exists in this schema
      await this.versionTracker.init()
      return await fn()
    } finally {
      this.adapter.setSchema(prev)
    }
  }

  // ─── MS-001: Version Tracking ──────────────────────────────────

  async getHistory(collection: string, schema?: string): Promise<SchemaVersion[]> {
    return this.withSchema(schema, () => this.versionTracker.getHistory(collection))
  }

  async getVersion(collection: string, version: number, schema?: string): Promise<SchemaVersion | null> {
    return this.withSchema(schema, () => this.versionTracker.getVersion(collection, version))
  }

  // ─── MS-002 + MS-003: Apply Schema (generate + execute) ───────

  async applySchema(
    schema: CollectionSchema,
    options?: ApplySchemaOptions,
  ): Promise<MigrationResult> {
    return this.withSchema(schema.schema, () => this._applySchemaInner(schema, options))
  }

  private async _applySchemaInner(
    schema: CollectionSchema,
    options?: ApplySchemaOptions,
  ): Promise<MigrationResult> {
    const currentSnapshot = await this.versionTracker.getLatestSnapshot(schema.name)
    const currentVersion = await this.versionTracker.getLatestVersion(schema.name)

    // First version — no previous schema
    if (!currentSnapshot) {
      if (options?.dryRun) {
        return {
          success: true,
          collection: schema.name,
          fromVersion: 0,
          toVersion: 1,
          operationsExecuted: 0,
          plannedOperations: [
            {
              type: 'createCollection',
              collection: schema.name,
              definition: schema.fields,
              destructive: false,
            },
          ],
        }
      }

      this.logger?.info('Creating new collection', { collection: schema.name })
      this.logger?.debug('DDL: createCollection', {
        collection: schema.name,
        fieldCount: schema.fields.length,
      })
      await this.adapter.createCollection(schema.name, schema.fields)
      await this.registry.register(schema, { force: true })
      await this.versionTracker.recordVersion(schema.name, schema, null)

      return {
        success: true,
        collection: schema.name,
        fromVersion: 0,
        toVersion: 1,
        operationsExecuted: 1,
      }
    }

    // Diff against current
    const diff = diffSchemas(currentSnapshot, schema)

    // No changes — no-op (still register in case registry was cold-started)
    if (diff.changes.length === 0) {
      if (!this.registry.has(schema.name)) {
        await this.registry.register(schema, { force: true })
      }
      return {
        success: true,
        collection: schema.name,
        fromVersion: currentVersion,
        toVersion: currentVersion,
        operationsExecuted: 0,
      }
    }

    // Generate migration
    const nextVersion = currentVersion + 1
    this.logger?.info('Applying schema migration', {
      collection: schema.name,
      fromVersion: currentVersion,
      toVersion: nextVersion,
      changes: diff.changes.length,
    })
    const migration = generateMigration(diff, nextVersion, options)

    // Dry-run: return planned operations without executing
    if (options?.dryRun) {
      return {
        success: true,
        collection: schema.name,
        fromVersion: currentVersion,
        toVersion: nextVersion,
        operationsExecuted: 0,
        plannedOperations: migration.operations,
      }
    }

    // Execute migration
    this.logger?.debug('DDL: executeMigration', {
      collection: schema.name,
      operations: migration.operations.length,
    })
    const result = await executeMigration(this.adapter, migration)

    if (result.success) {
      await this.registry.register(schema, { force: true })
      await this.versionTracker.recordVersion(schema.name, schema, diff)

      // Store migration for potential undo (inverse generation)
      const collMigrations = this.migrations.get(schema.name) ?? []
      collMigrations.push(migration)
      this.migrations.set(schema.name, collMigrations)
    }

    return result
  }

  // ─── Undo via Inverse Migration ────────────────────────────────

  /**
   * Generate an inverse migration that undoes the given version.
   * This creates a NEW forward migration — no rollback.
   */
  generateUndo(collection: string, version: number): Migration {
    const collMigrations = this.migrations.get(collection) ?? []
    const migration = collMigrations.find((m) => m.version === version)
    if (!migration) {
      throw new MigrationError(
        `Migration v${version} for "${collection}" not found in memory. Cannot generate undo.`,
      )
    }

    const latestVersion = Math.max(...collMigrations.map((m) => m.version), 0)
    return generateInverseMigration(migration, latestVersion + 1)
  }

  // ─── MS-004: Export ────────────────────────────────────────────

  exportSchema(collection: string): CollectionSchema {
    const schema = this.registry.get(collection)
    if (!schema) {
      throw new MigrationError(`Collection "${collection}" not found in registry`)
    }
    return structuredClone(schema)
  }

  /** Get all persisted collection names from version tracker */
  async getPersistedCollectionNames(schema?: string): Promise<string[]> {
    return this.withSchema(schema, () => this.versionTracker.getAllCollectionNames())
  }

  /** Get latest persisted schema snapshot for a collection */
  async getPersistedSnapshot(collection: string): Promise<CollectionSchema | null> {
    return this.versionTracker.getLatestSnapshot(collection)
  }

  exportAll(): CollectionSchema[] {
    return this.registry.getAll().map((s) => structuredClone(s))
  }

  // ─── MS-004: Import ────────────────────────────────────────────

  async importSchema(schema: CollectionSchema): Promise<MigrationResult> {
    return this.withSchema(schema.schema, async () => {
      const existing = this.registry.get(schema.name)

      if (existing && JSON.stringify(existing) === JSON.stringify(schema)) {
        const version = await this.versionTracker.getLatestVersion(schema.name)
        return {
          success: true,
          collection: schema.name,
          fromVersion: version,
          toVersion: version,
          operationsExecuted: 0,
        }
      }

      return this._applySchemaInner(schema, { force: true })
    })
  }

  async importAll(schemas: CollectionSchema[]): Promise<MigrationResult[]> {
    const sorted = this.sortByDependencies(schemas)
    const results: MigrationResult[] = []

    for (const schema of sorted) {
      const result = await this.importSchema(schema)
      results.push(result)
    }

    return results
  }

  /** Sort schemas so that relation targets come before dependents */
  private sortByDependencies(schemas: CollectionSchema[]): CollectionSchema[] {
    const nameSet = new Set(schemas.map((s) => s.name))
    const noDeps: CollectionSchema[] = []
    const withDeps: CollectionSchema[] = []

    for (const schema of schemas) {
      const hasRelationDep = schema.fields.some(
        (f) => f.type === 'relation' && f.relation && nameSet.has(f.relation.target),
      )
      if (hasRelationDep) {
        withDeps.push(schema)
      } else {
        noDeps.push(schema)
      }
    }

    return [...noDeps, ...withDeps]
  }
}
