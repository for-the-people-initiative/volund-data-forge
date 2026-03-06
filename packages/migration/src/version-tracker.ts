// MS-001: Schema Version Tracking

import type { CollectionSchema, SchemaDiff } from '@data-engine/schema'
import type { DatabaseAdapter } from '@data-engine/adapter'
import type { SchemaVersion } from './types.js'
import { randomUUID } from 'node:crypto'

const VERSIONS_TABLE = '_schema_versions'

export class VersionTracker {
  constructor(private adapter: DatabaseAdapter) {}

  /** Ensure the schema_versions table exists */
  async init(): Promise<void> {
    try {
      await this.adapter.createCollection(VERSIONS_TABLE, [
        { name: 'collection_name', type: 'text', required: true },
        { name: 'version', type: 'integer', required: true },
        { name: 'schema_snapshot', type: 'json', required: true },
        { name: 'diff', type: 'json' },
      ])
    } catch {
      // Table may already exist — that's fine
    }
  }

  /** Record a new version */
  async recordVersion(
    collection: string,
    schema: CollectionSchema,
    diff: SchemaDiff | null,
  ): Promise<SchemaVersion> {
    const currentVersion = await this.getLatestVersion(collection)
    const nextVersion = currentVersion + 1
    const now = new Date().toISOString()

    const record = await this.adapter.create(VERSIONS_TABLE, {
      id: randomUUID(),
      collection_name: collection,
      version: nextVersion,
      schema_snapshot: JSON.stringify(schema),
      diff: diff ? JSON.stringify(diff) : null,
      created_at: now,
    })

    return this.toSchemaVersion(record)
  }

  /** Get full version history for a collection */
  async getHistory(collection: string): Promise<SchemaVersion[]> {
    const rows = await this.adapter.findMany(VERSIONS_TABLE, {
      filters: { and: [{ field: 'collection_name', operator: 'eq', value: collection }] },
      sort: [{ field: 'version', direction: 'asc' }],
    })
    return rows.map((r) => this.toSchemaVersion(r))
  }

  /** Get a specific version */
  async getVersion(collection: string, version: number): Promise<SchemaVersion | null> {
    const row = await this.adapter.findOne(VERSIONS_TABLE, {
      filters: {
        and: [
          { field: 'collection_name', operator: 'eq', value: collection },
          { field: 'version', operator: 'eq', value: version },
        ],
      },
    })
    return row ? this.toSchemaVersion(row) : null
  }

  /** Get all tracked collection names */
  async getAllCollectionNames(): Promise<string[]> {
    const rows = await this.adapter.findMany(VERSIONS_TABLE, {
      sort: [{ field: 'collection_name', direction: 'asc' }],
    })
    const names = new Set(rows.map((r) => String(r['collection_name'])))
    return [...names]
  }

  /** Get the latest version number (0 if none) */
  async getLatestVersion(collection: string): Promise<number> {
    const rows = await this.adapter.findMany(VERSIONS_TABLE, {
      filters: { and: [{ field: 'collection_name', operator: 'eq', value: collection }] },
      sort: [{ field: 'version', direction: 'desc' }],
      limit: 1,
    })
    if (rows.length === 0) return 0
    return rows[0]!['version'] as number
  }

  /** Get the latest schema snapshot */
  async getLatestSnapshot(collection: string): Promise<CollectionSchema | null> {
    const rows = await this.adapter.findMany(VERSIONS_TABLE, {
      filters: { and: [{ field: 'collection_name', operator: 'eq', value: collection }] },
      sort: [{ field: 'version', direction: 'desc' }],
      limit: 1,
    })
    if (rows.length === 0) return null
    
    const schema = this.parseJson(rows[0]!['schema_snapshot']) as CollectionSchema
    
    // Fix: Add default singularName for existing schemas that were created before it was required
    if (!schema.singularName) {
      schema.singularName = schema.name
    }
    
    return schema
  }

  private toSchemaVersion(row: Record<string, unknown>): SchemaVersion {
    const schema = this.parseJson(row['schema_snapshot']) as CollectionSchema
    
    // Fix: Add default singularName for existing schemas that were created before it was required
    if (!schema.singularName) {
      schema.singularName = schema.name
    }
    
    return {
      id: String(row['id'] ?? ''),
      collection_name: String(row['collection_name']),
      version: Number(row['version']),
      schema_snapshot: schema,
      diff: row['diff'] ? (this.parseJson(row['diff']) as SchemaDiff) : null,
      created_at: String(row['created_at']),
    }
  }

  private parseJson(value: unknown): unknown {
    if (typeof value === 'string') return JSON.parse(value)
    return value
  }
}
