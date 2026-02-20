// SE-003: Schema Validator

import type { CollectionSchema, SchemaError } from './types.js'
import { RESERVED_FIELDS } from './types.js'
import { hasType } from './type-system.js'

const COLLECTION_NAME_PATTERN = /^[a-z][a-z0-9_-]*$/
const COLLECTION_NAME_MAX_LENGTH = 64

/** Check if a collection name is reserved for internal use (starts with _) */
export function isInternalCollection(name: string): boolean {
  return name.startsWith('_')
}

/** Validate a collection name format (without schema context) */
export function validateCollectionName(name: string): string | null {
  if (!name) return 'Collection name is required'
  if (name.length > COLLECTION_NAME_MAX_LENGTH)
    return `Collection name must be at most ${COLLECTION_NAME_MAX_LENGTH} characters`
  if (isInternalCollection(name))
    return 'Collection names starting with "_" are reserved for system use'
  if (!COLLECTION_NAME_PATTERN.test(name))
    return `Collection name "${name}" must be lowercase alphanumeric with underscores/hyphens, starting with a letter`
  return null
}

export function validateSchema(
  schema: CollectionSchema,
  knownCollections?: string[],
): SchemaError[] {
  const errors: SchemaError[] = []

  // Collection name format
  const nameError = validateCollectionName(schema.name)
  if (nameError) {
    errors.push({ path: 'name', message: nameError })
  }

  if (!schema.fields || !Array.isArray(schema.fields)) {
    errors.push({ path: 'fields', message: 'Fields must be an array' })
    return errors
  }

  // Field name uniqueness
  const fieldNames = new Set<string>()
  for (let i = 0; i < schema.fields.length; i++) {
    const field = schema.fields[i]
    const path = `fields[${i}]`

    if (!field.name) {
      errors.push({ path: `${path}.name`, message: 'Field name is required' })
      continue
    }

    // Reserved field check
    if ((RESERVED_FIELDS as readonly string[]).includes(field.name)) {
      errors.push({
        path: `${path}.name`,
        message: `"${field.name}" is a reserved system field`,
      })
    }

    // Uniqueness
    if (fieldNames.has(field.name)) {
      errors.push({
        path: `${path}.name`,
        message: `Duplicate field name "${field.name}"`,
      })
    }
    fieldNames.add(field.name)

    // Type validity
    if (!field.type) {
      errors.push({ path: `${path}.type`, message: 'Field type is required' })
    } else if (!hasType(field.type)) {
      errors.push({
        path: `${path}.type`,
        message: `Unknown type "${field.type}"`,
      })
    }

    // Relation validation
    if (field.type === 'relation') {
      if (!field.relation) {
        errors.push({
          path: `${path}.relation`,
          message: 'Relation field must have a relation definition',
        })
      } else if (
        knownCollections &&
        !knownCollections.includes(field.relation.target) &&
        field.relation.target !== schema.name
      ) {
        errors.push({
          path: `${path}.relation.target`,
          message: `Relation target "${field.relation.target}" does not exist`,
        })
      }
      // Self-referential is allowed (circular)
    }

    // Lookup validation
    if (field.type === 'lookup') {
      if (!field.lookup) {
        errors.push({
          path: `${path}.lookup`,
          message: 'Lookup field must have a lookup definition',
        })
      } else {
        // Verify the relation field exists in this schema
        const relField = schema.fields.find((f) => f.name === field.lookup!.relation)
        if (!relField || relField.type !== 'relation') {
          errors.push({
            path: `${path}.lookup.relation`,
            message: `Lookup relation "${field.lookup.relation}" is not a relation field in this collection`,
          })
        }
      }
    }

    // Select options
    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      errors.push({
        path: `${path}.options`,
        message: 'Select field must have at least one option',
      })
    }
  }

  return errors
}
