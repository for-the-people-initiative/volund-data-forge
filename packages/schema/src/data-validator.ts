// SE-006: Declarative Validation Rules

import type { CollectionSchema, ValidationResult, SchemaError } from './types.js'
import { getType } from './type-system.js'

export interface ValidatorOptions {
  /** If true, validates only provided fields (for updates) */
  partial?: boolean
  /** 'strip' removes extra fields, 'flag' reports them as errors */
  extraFields?: 'strip' | 'flag'
}

export type CompiledValidator = (data: Record<string, unknown>) => ValidationResult

export function compileValidator(
  schema: CollectionSchema,
  options: ValidatorOptions = {},
): CompiledValidator {
  const fieldMap = new Map(schema.fields.map((f) => [f.name, f]))
  const { partial = false, extraFields = 'flag' } = options

  return (data: Record<string, unknown>): ValidationResult => {
    const errors: SchemaError[] = []
    const cleaned: Record<string, unknown> = {}

    // Check for extra fields
    for (const key of Object.keys(data)) {
      if (!fieldMap.has(key)) {
        if (extraFields === 'flag') {
          errors.push({ path: key, message: `Unknown field "${key}"` })
        }
        // strip: just don't include it
        continue
      }
      cleaned[key] = data[key]
    }

    // Validate defined fields
    for (const [name, field] of fieldMap) {
      // Skip virtual/computed fields (lookup)
      if (field.type === 'lookup') continue

      const value = data[name]
      const path = name

      // Required check
      if (field.required && (value === undefined || value === null)) {
        if (!partial) {
          errors.push({ path, message: `"${name}" is required` })
        }
        continue
      }

      // Skip if not provided (optional or partial)
      if (value === undefined || value === null) {
        if (value === undefined && field.default !== undefined) {
          cleaned[name] = field.default
        }
        continue
      }

      // Type validation
      try {
        const typeDef = getType(field.type)
        if (!typeDef.validate(value)) {
          errors.push({ path, message: `"${name}" must be of type ${field.type}` })
          continue
        }
      } catch {
        errors.push({ path, message: `Unknown type "${field.type}" for field "${name}"` })
        continue
      }

      // Field-level validations
      if (field.validations) {
        for (const v of field.validations) {
          const err = runValidation(name, value, v.rule, v.value, v.message)
          if (err) errors.push(err)
        }
      }

      // Select options check
      if (field.type === 'select' && field.options) {
        if (!field.options.includes(value as string)) {
          errors.push({ path, message: `"${name}" must be one of: ${field.options.join(', ')}` })
        }
      }

      cleaned[name] = value
    }

    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? cleaned : undefined,
    }
  }
}

function runValidation(
  field: string,
  value: unknown,
  rule: string,
  ruleValue: unknown,
  customMessage?: string,
): SchemaError | null {
  const path = field

  switch (rule) {
    case 'min':
      if (typeof value === 'number' && value < (ruleValue as number)) {
        return { path, message: customMessage ?? `"${field}" must be at least ${ruleValue}` }
      }
      if (typeof value === 'string' && value.length < (ruleValue as number)) {
        return {
          path,
          message: customMessage ?? `"${field}" must be at least ${ruleValue} characters`,
        }
      }
      break
    case 'max':
      if (typeof value === 'number' && value > (ruleValue as number)) {
        return { path, message: customMessage ?? `"${field}" must be at most ${ruleValue}` }
      }
      if (typeof value === 'string' && value.length > (ruleValue as number)) {
        return {
          path,
          message: customMessage ?? `"${field}" must be at most ${ruleValue} characters`,
        }
      }
      break
    case 'pattern':
      if (typeof value === 'string' && !new RegExp(ruleValue as string).test(value)) {
        return { path, message: customMessage ?? `"${field}" does not match pattern ${ruleValue}` }
      }
      break
  }
  return null
}
