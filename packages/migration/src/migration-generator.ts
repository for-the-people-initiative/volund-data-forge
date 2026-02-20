// MS-002: Migration Generation from Schema Diff (Forward-Only)

import type { FieldDiff, SchemaDiff, FieldDefinition } from '@data-engine/schema'
import { MigrationError } from '@data-engine/schema'
import type { FieldChanges } from '@data-engine/adapter'
import type { Migration, MigrationOperation, MigrationStatus, MigrationMetadata } from './types.js'

/**
 * Generate a forward-only migration from a schema diff.
 * Throws if destructive changes exist and force is not set.
 */
export function generateMigration(
  diff: SchemaDiff,
  version: number,
  options?: { force?: boolean },
): Migration {
  if (diff.hasDestructiveChanges && !options?.force) {
    throw new MigrationError(
      `Destructive changes detected in "${diff.collection}". Pass { force: true } to confirm.`,
    )
  }

  const operations: MigrationOperation[] = []

  for (const change of diff.changes) {
    operations.push(...generateOperationsForChange(diff.collection, change))
  }

  const now = new Date().toISOString()

  const metadata: MigrationMetadata = {
    description: generateDescription(diff),
    createdAt: now,
    parentVersion: version - 1 > 0 ? version - 1 : null,
    hasDestructiveOps: operations.some((op) => op.destructive),
  }

  return {
    version,
    collection: diff.collection,
    operations,
    status: 'pending' as MigrationStatus,
    diff,
    metadata,
    created_at: now,
  }
}

/**
 * Generate an inverse (undo) migration from an existing migration.
 * This creates a NEW forward migration that reverses the effects.
 */
export function generateInverseMigration(migration: Migration, newVersion: number): Migration {
  const inverseOps: MigrationOperation[] = []

  // Process in reverse order
  for (let i = migration.operations.length - 1; i >= 0; i--) {
    const op = migration.operations[i]!
    inverseOps.push(invertOperation(op))
  }

  const now = new Date().toISOString()
  const hasDestructiveOps = inverseOps.some((op) => op.destructive)

  const metadata: MigrationMetadata = {
    description: `Undo v${migration.version}: ${migration.metadata.description}`,
    createdAt: now,
    parentVersion: newVersion - 1 > 0 ? newVersion - 1 : null,
    hasDestructiveOps,
    inverseOf: migration.version,
  }

  return {
    version: newVersion,
    collection: migration.collection,
    operations: inverseOps,
    status: 'pending',
    diff: migration.diff, // keep original diff for reference
    metadata,
    created_at: now,
  }
}

/**
 * Invert a single migration operation.
 */
function invertOperation(op: MigrationOperation): MigrationOperation {
  switch (op.type) {
    case 'addField':
    case 'addForeignKey':
      return {
        type: 'removeField',
        collection: op.collection,
        field: op.field,
        definition: op.definition,
        destructive: true, // removing a field is destructive
      }

    case 'removeField':
      return {
        type: 'addField',
        collection: op.collection,
        field: op.field,
        definition: op.definition,
        destructive: false,
      }

    case 'createCollection':
      return {
        type: 'dropCollection',
        collection: op.collection,
        definition: op.definition,
        destructive: true, // dropping a collection is destructive
      }

    case 'dropCollection':
      return {
        type: 'createCollection',
        collection: op.collection,
        definition: op.definition,
        destructive: false,
      }

    case 'alterField': {
      const changes = op.changes as FieldChanges
      // For rename: swap direction
      if (changes.rename) {
        return {
          type: 'alterField',
          collection: op.collection,
          field: changes.rename,
          changes: { ...changes, rename: op.field } as unknown,
          destructive: op.destructive,
        }
      }
      // For other alter operations, we can't perfectly invert without the old values
      // but we preserve the operation structure
      return {
        type: 'alterField',
        collection: op.collection,
        field: op.field,
        changes: op.changes,
        destructive: op.destructive,
      }
    }

    case 'createJunctionTable':
      return {
        type: 'dropCollection',
        collection: op.collection,
        field: op.field,
        definition: op.definition,
        destructive: true,
      }

    default:
      throw new MigrationError(`Cannot invert unknown operation type: ${op.type}`)
  }
}

/**
 * Generate a human-readable description from a schema diff.
 */
function generateDescription(diff: SchemaDiff): string {
  const parts: string[] = []

  for (const change of diff.changes) {
    switch (change.operation) {
      case 'added':
        parts.push(`Add field '${change.field}' to '${diff.collection}'`)
        break
      case 'removed':
        parts.push(`Remove field '${change.field}' from '${diff.collection}'`)
        break
      case 'changed':
        parts.push(`Alter field '${change.field}' in '${diff.collection}'`)
        break
    }
  }

  if (parts.length === 0) return `No changes to '${diff.collection}'`
  if (parts.length === 1) return parts[0]!
  return `${parts.length} changes to '${diff.collection}': ${parts.join('; ')}`
}

function generateOperationsForChange(collection: string, change: FieldDiff): MigrationOperation[] {
  const ops: MigrationOperation[] = []

  switch (change.operation) {
    case 'added': {
      const def = change.newValue as FieldDefinition
      if (def.type === 'relation' && def.relation) {
        if (def.relation.type === 'manyToMany' && def.relation.junctionTable) {
          ops.push({
            type: 'createJunctionTable',
            collection,
            field: change.field,
            definition: def,
            destructive: false,
          })
        } else {
          ops.push({
            type: 'addForeignKey',
            collection,
            field: change.field,
            definition: def,
            destructive: false,
          })
        }
      } else {
        ops.push({
          type: 'addField',
          collection,
          field: change.field,
          definition: def,
          destructive: false,
        })
      }
      break
    }

    case 'removed': {
      const def = change.oldValue as FieldDefinition
      ops.push({
        type: 'removeField',
        collection,
        field: change.field,
        definition: def,
        destructive: true,
      })
      break
    }

    case 'changed': {
      const oldDef = change.oldValue as FieldDefinition
      const newDef = change.newValue as FieldDefinition
      const changes = buildFieldChanges(oldDef, newDef)

      ops.push({
        type: 'alterField',
        collection,
        field: change.field,
        changes,
        destructive: change.destructive ?? false,
      })
      break
    }
  }

  return ops
}

function buildFieldChanges(from: FieldDefinition, to: FieldDefinition): FieldChanges {
  const changes: FieldChanges = {}
  if (from.type !== to.type) changes.type = to.type as FieldChanges['type']
  if (from.required !== to.required) changes.required = to.required ?? false
  if (from.unique !== to.unique) changes.unique = to.unique ?? false
  if (JSON.stringify(from.default) !== JSON.stringify(to.default)) changes.default = to.default
  if (from.name !== to.name) changes.rename = to.name
  if (JSON.stringify(from.options) !== JSON.stringify(to.options)) changes.options = to.options
  return changes
}

export { MigrationError }
