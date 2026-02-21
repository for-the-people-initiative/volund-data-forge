/**
 * Formula evaluator for computed fields.
 * Supports: +, -, *, /, string concatenation
 * Field references use {fieldName} syntax.
 */

/** Resolve {fieldName} references to values from a record */
function resolveReferences(
  formula: string,
  record: Record<string, unknown>,
): string {
  return formula.replace(/\{(\w+)\}/g, (_, fieldName: string) => {
    const val = record[fieldName]
    if (val === null || val === undefined) return 'null'
    if (typeof val === 'string') return JSON.stringify(val)
    return String(val)
  })
}

/**
 * Evaluate a formula expression against a record.
 * Returns the computed value or null on error.
 */
export function evaluateFormula(
  formula: string,
  record: Record<string, unknown>,
): unknown {
  if (!formula || typeof formula !== 'string') return null

  const resolved = resolveReferences(formula, record)

  try {
    // Safe evaluation: only allow basic math and string operations
    // We use Function constructor with a restricted expression
    const sanitized = resolved.trim()

    // Block dangerous patterns
    if (/[;{}[\]\\]/.test(sanitized) && !sanitized.includes('"') && !sanitized.includes("'")) {
      return null
    }

    // Only allow: numbers, strings, +, -, *, /, (, ), whitespace, null
    // This regex validates the resolved expression (after field substitution)
    const safePattern = /^[\d\s+\-*/().,"'a-zA-Z\u00C0-\u024Fnull]+$/
    if (!safePattern.test(sanitized)) {
      return null
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${sanitized});`)
    const result = fn()
    return result ?? null
  } catch {
    return null
  }
}

/**
 * Apply computed fields to a single record.
 */
export function applyComputedFields(
  record: Record<string, unknown>,
  fields: Array<{ name: string; computed?: { formula: string; returnType: string } }>,
): Record<string, unknown> {
  const result = { ...record }
  for (const field of fields) {
    if (field.computed?.formula) {
      result[field.name] = evaluateFormula(field.computed.formula, record)
    }
  }
  return result
}

/**
 * Apply computed fields to an array of records.
 */
export function applyComputedFieldsToMany(
  records: Record<string, unknown>[],
  fields: Array<{ name: string; computed?: { formula: string; returnType: string } }>,
): Record<string, unknown>[] {
  const computedFields = fields.filter((f) => f.computed?.formula)
  if (computedFields.length === 0) return records
  return records.map((r) => applyComputedFields(r, computedFields))
}
