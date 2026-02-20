// MS-001 through MS-004: Migration System Types (Forward-Only)

import type { CollectionSchema, SchemaDiff } from '@data-engine/schema'

/** Schema version record (MS-001) */
export interface SchemaVersion {
  id: string
  collection_name: string
  version: number
  schema_snapshot: CollectionSchema
  diff: SchemaDiff | null
  created_at: string
}

/** Migration status (MS-003) — forward-only, no rolled_back */
export type MigrationStatus = 'pending' | 'applied'

/** A single DDL operation (MS-002) */
export interface MigrationOperation {
  type:
    | 'addField'
    | 'removeField'
    | 'alterField'
    | 'createCollection'
    | 'dropCollection'
    | 'addForeignKey'
    | 'createJunctionTable'
  collection: string
  field?: string
  definition?: unknown
  changes?: unknown
  destructive: boolean
}

/** Migration metadata */
export interface MigrationMetadata {
  /** Auto-generated human-readable description */
  description: string
  /** ISO timestamp when the migration was created */
  createdAt: string
  /** Version this migration was generated from (null for initial) */
  parentVersion: number | null
  /** Whether this migration contains destructive operations */
  hasDestructiveOps: boolean
  /** If this is an inverse migration, the version it inverts */
  inverseOf?: number
}

/** A forward-only migration (MS-002) */
export interface Migration {
  version: number
  collection: string
  operations: MigrationOperation[]
  status: MigrationStatus
  diff: SchemaDiff
  metadata: MigrationMetadata
  created_at: string
}

/** Result of a migration execution (MS-003) */
export interface MigrationResult {
  success: boolean
  collection: string
  fromVersion: number
  toVersion: number
  operationsExecuted: number
  /** Operations that would be executed (populated in dry-run mode) */
  plannedOperations?: MigrationOperation[]
  error?: string
}

/** Options for applying a schema */
export interface ApplySchemaOptions {
  /** Force destructive changes without confirmation */
  force?: boolean
  /** Dry-run: return operations without executing them */
  dryRun?: boolean
}
