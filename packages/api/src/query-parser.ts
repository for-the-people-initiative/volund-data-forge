/**
 * AL-002: Query Parameter Parsing
 *
 * Parses HTTP query params into QueryAST.
 */

import type {
  QueryAST,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  SortClause,
} from '@data-engine/adapter'
import { QueryParseError } from '@data-engine/schema'
export { QueryParseError }

const VALID_OPERATORS: Set<string> = new Set([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'like',
  'ilike',
  'null',
  'notNull',
  'between',
])

/**
 * Parse query parameters into a QueryAST.
 *
 * Supported params:
 *   filter[field][operator]=value
 *   sort=field,-field
 *   page=1&limit=25  OR  offset=0&limit=25
 *   fields=name,email
 *   populate=company,tags
 */
export function parseQueryParams(query: Record<string, unknown>): {
  ast: QueryAST
  populate: string[]
} {
  const ast: QueryAST = {}
  let populate: string[] = []

  // ─── Filters ─────────────────────────────────────────────
  const filter = query['filter']
  if (filter && typeof filter === 'object' && filter !== null) {
    const conditions: FilterCondition[] = []
    const filterObj = filter as Record<string, unknown>

    for (const field of Object.keys(filterObj)) {
      const ops = filterObj[field]
      if (typeof ops === 'object' && ops !== null) {
        for (const [op, val] of Object.entries(ops as Record<string, unknown>)) {
          if (!VALID_OPERATORS.has(op)) {
            throw new QueryParseError(`Invalid filter operator: "${op}"`)
          }
          conditions.push({
            field,
            operator: op as FilterOperator,
            value: coerceValue(val),
          })
        }
      } else {
        // shorthand: filter[field]=value → eq
        conditions.push({
          field,
          operator: 'eq',
          value: coerceValue(ops),
        })
      }
    }

    if (conditions.length > 0) {
      const group: FilterGroup = { and: conditions }
      ast.filters = group
    }
  }

  // ─── Sort ────────────────────────────────────────────────
  const sortParam = query['sort']
  if (typeof sortParam === 'string' && sortParam.length > 0) {
    const clauses: SortClause[] = sortParam.split(',').map((s) => {
      const trimmed = s.trim()
      if (trimmed.startsWith('-')) {
        return { field: trimmed.slice(1), direction: 'desc' as const }
      }
      return { field: trimmed, direction: 'asc' as const }
    })
    ast.sort = clauses
  }

  // ─── Pagination ──────────────────────────────────────────
  const limit = toInt(query['limit'])
  const page = toInt(query['page'])
  const offset = toInt(query['offset'])

  if (limit !== undefined) {
    ast.limit = limit
  }
  if (offset !== undefined) {
    ast.offset = offset
  } else if (page !== undefined && limit !== undefined) {
    ast.offset = (page - 1) * limit
  }

  // ─── Fields (select) ────────────────────────────────────
  const fields = query['fields']
  if (typeof fields === 'string' && fields.length > 0) {
    ast.select = fields.split(',').map((f) => f.trim())
  }

  // ─── Populate ────────────────────────────────────────────
  const pop = query['populate']
  if (typeof pop === 'string' && pop.length > 0) {
    populate = pop.split(',').map((p) => p.trim())
  }

  return { ast, populate }
}

function toInt(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined
  const n = Number(val)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined
}

function coerceValue(val: unknown): unknown {
  if (typeof val !== 'string') return val
  if (val === 'true') return true
  if (val === 'false') return false
  if (val === 'null') return null
  // Check for comma-separated (for in/nin)
  if (val.includes(',')) return val.split(',').map(coerceValue)
  const n = Number(val)
  if (val.length > 0 && Number.isFinite(n)) return n
  return val
}
