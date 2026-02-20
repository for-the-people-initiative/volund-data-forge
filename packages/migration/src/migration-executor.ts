// MS-003: Migration Execution (Forward-Only)

import type { DatabaseAdapter, FieldChanges } from '@data-engine/adapter';
import type { FieldDefinition } from '@data-engine/schema';
import type { Migration, MigrationOperation, MigrationResult } from './types.js';
import { MigrationError } from './migration-generator.js';

/**
 * Execute a migration's operations.
 */
export async function executeMigration(
  adapter: DatabaseAdapter,
  migration: Migration,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    collection: migration.collection,
    fromVersion: migration.version - 1,
    toVersion: migration.version,
    operationsExecuted: 0,
  };

  try {
    for (const op of migration.operations) {
      await executeOperation(adapter, op);
      result.operationsExecuted++;
    }

    migration.status = 'applied';
    result.success = true;
  } catch (err) {
    migration.status = 'pending';
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

async function executeOperation(
  adapter: DatabaseAdapter,
  op: MigrationOperation,
): Promise<void> {
  switch (op.type) {
    case 'addField':
    case 'addForeignKey':
      await adapter.addField(op.collection, op.definition as FieldDefinition);
      break;

    case 'removeField':
      if (!op.field) throw new MigrationError('removeField requires field name');
      await adapter.removeField(op.collection, op.field);
      break;

    case 'alterField':
      if (!op.field) throw new MigrationError('alterField requires field name');
      await adapter.alterField(op.collection, op.field, op.changes as FieldChanges);
      break;

    case 'createCollection':
      await adapter.createCollection(op.collection, op.definition as FieldDefinition[]);
      break;

    case 'dropCollection':
      // Drop collection by removing all fields — adapter doesn't have dropCollection
      // We use a raw approach: remove the table
      // For now, we throw if the adapter doesn't support it directly
      throw new MigrationError(`dropCollection not yet supported by adapter. Collection: ${op.collection}`);

    case 'createJunctionTable': {
      const def = op.definition as FieldDefinition;
      if (def.relation?.junctionTable) {
        await adapter.createCollection(def.relation.junctionTable, [
          { name: `${op.collection}_id`, type: 'relation', required: true },
          { name: `${def.relation.target}_id`, type: 'relation', required: true },
        ]);
      }
      break;
    }

    default:
      throw new MigrationError(`Unknown operation type: ${op.type}`);
  }
}
