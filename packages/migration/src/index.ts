// @data-engine/migration — public API (forward-only)

export { MigrationManager } from './migration-manager.js';
export { VersionTracker } from './version-tracker.js';
export { generateMigration, generateInverseMigration, MigrationError } from './migration-generator.js';
export { executeMigration } from './migration-executor.js';

export type {
  SchemaVersion,
  MigrationStatus,
  MigrationOperation,
  Migration,
  MigrationMetadata,
  MigrationResult,
  ApplySchemaOptions,
} from './types.js';
