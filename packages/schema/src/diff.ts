// SE-005: Schema Diffing

import type { CollectionSchema, FieldDefinition, FieldDiff, SchemaDiff } from './types.js'

export function diffSchemas(oldSchema: CollectionSchema, newSchema: CollectionSchema): SchemaDiff {
  const changes: FieldDiff[] = []
  const oldFields = new Map(oldSchema.fields.map((f) => [f.name, f]))
  const newFields = new Map(newSchema.fields.map((f) => [f.name, f]))

  // Removed fields
  for (const [name, field] of oldFields) {
    if (!newFields.has(name)) {
      // Check rename hint: same type exists in new but not in old
      const renameHint = findRenameCandidate(field, newFields, oldFields)
      changes.push({
        field: name,
        operation: 'removed',
        oldValue: field,
        destructive: true,
        ...(renameHint ? { renameHint } : {}),
      })
    }
  }

  // Added fields
  for (const [name, field] of newFields) {
    if (!oldFields.has(name)) {
      changes.push({
        field: name,
        operation: 'added',
        newValue: field,
      })
    }
  }

  // Changed fields
  for (const [name, newField] of newFields) {
    const oldField = oldFields.get(name)
    if (!oldField) continue

    const fieldChanges = compareFields(oldField, newField)
    if (fieldChanges) {
      const destructive = oldField.type !== newField.type
      changes.push({
        field: name,
        operation: 'changed',
        oldValue: oldField,
        newValue: newField,
        destructive,
      })
    }
  }

  return {
    collection: newSchema.name,
    changes,
    hasDestructiveChanges: changes.some((c) => c.destructive === true),
  }
}

function compareFields(a: FieldDefinition, b: FieldDefinition): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

function findRenameCandidate(
  removed: FieldDefinition,
  newFields: Map<string, FieldDefinition>,
  oldFields: Map<string, FieldDefinition>,
): string | undefined {
  for (const [name, field] of newFields) {
    if (!oldFields.has(name) && field.type === removed.type) {
      return name
    }
  }
  return undefined
}
