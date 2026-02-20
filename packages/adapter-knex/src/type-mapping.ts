/**
 * DA-004: Type Mapping — Maps universal field types to Knex column builders
 */

import type { Knex } from 'knex'
import { SchemaError } from '@data-engine/adapter'
import type { FieldType } from '@data-engine/adapter'
import type { FieldDefinition } from '@data-engine/schema'

// ─── Postgres Type Mapping ───────────────────────────────────────────

const NATIVE_TO_FIELD_TYPE: Record<string, FieldType> = {
  'character varying': 'text',
  varchar: 'text',
  text: 'text',
  integer: 'integer',
  int: 'integer',
  serial: 'integer',
  bigint: 'integer',
  bigserial: 'integer',
  smallint: 'integer',
  'double precision': 'float',
  real: 'float',
  numeric: 'float',
  decimal: 'float',
  boolean: 'boolean',
  bool: 'boolean',
  'timestamp with time zone': 'datetime',
  'timestamp without time zone': 'datetime',
  timestamptz: 'datetime',
  jsonb: 'json',
  json: 'json',
  uuid: 'text',
}

/**
 * Map a native Postgres type back to a universal FieldType.
 * Falls back to 'json' for unknown types.
 */
export function nativeTypeToFieldType(nativeType: string): FieldType {
  const lower = nativeType.toLowerCase()
  // Direct match
  if (NATIVE_TO_FIELD_TYPE[lower]) return NATIVE_TO_FIELD_TYPE[lower]
  // Strip size suffix: varchar(255) → varchar, etc.
  const base = lower.replace(/\([^)]*\)/, '').trim()
  return NATIVE_TO_FIELD_TYPE[base] ?? 'json'
}

/**
 * Apply a field definition to a Knex table builder (for CREATE TABLE or ADD COLUMN).
 */
export function applyFieldToTable(
  table: Knex.CreateTableBuilder,
  field: FieldDefinition,
): Knex.ColumnBuilder {
  const fieldType = field.type as FieldType
  let col: Knex.ColumnBuilder

  switch (fieldType) {
    case 'text': {
      const maxLen = getValidationValue<number>(field, 'maxLength')
      if (maxLen && maxLen > 0) {
        col = table.string(field.name, maxLen)
      } else {
        col = table.string(field.name, 255)
      }
      break
    }
    case 'integer':
      col = table.integer(field.name)
      break
    case 'float':
      col = table.double(field.name)
      break
    case 'boolean':
      col = table.boolean(field.name)
      break
    case 'datetime':
      col = table.timestamp(field.name, { useTz: true })
      break
    case 'json':
      col = table.jsonb(field.name)
      break
    case 'relation': {
      // Default to integer FK; could be uuid based on target config
      col = table.integer(field.name).unsigned()
      break
    }
    case 'select': {
      col = table.string(field.name, 255)
      break
    }
    case 'email':
      col = table.string(field.name, 255)
      break
    default:
      throw new SchemaError(`Unsupported field type: ${fieldType}`)
  }

  // Apply common modifiers
  if (field.required) {
    col = col.notNullable()
  } else {
    col = col.nullable()
  }

  if (field.unique) {
    col = col.unique()
  }

  if (field.default !== undefined) {
    col = col.defaultTo(field.default as Knex.Value)
  }

  return col
}

/**
 * Get the Knex column type string for ALTER operations.
 */
export function fieldTypeToColumnType(fieldType: FieldType): string {
  switch (fieldType) {
    case 'text':
      return 'varchar(255)'
    case 'integer':
      return 'integer'
    case 'float':
      return 'double precision'
    case 'boolean':
      return 'boolean'
    case 'datetime':
      return 'timestamptz'
    case 'json':
      return 'jsonb'
    case 'relation':
      return 'integer'
    case 'select':
      return 'varchar(255)'
    case 'email':
      return 'varchar(255)'
    default:
      throw new SchemaError(`Unsupported field type: ${fieldType}`)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getValidationValue<T>(field: FieldDefinition, rule: string): T | undefined {
  const v = field.validations?.find((v) => v.rule === rule)
  return v?.value as T | undefined
}
