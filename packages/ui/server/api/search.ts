/**
 * Global search across all collections.
 * GET /api/search?q=term&limit=5
 * Returns results grouped by collection.
 */
import { getAdapter, getRegistry, waitForEngine } from '../utils/engine'
import type { QueryAST, FilterGroup } from '@data-engine/adapter'
import { isInternalCollection } from '@data-engine/schema'
import { SearchQuerySchema } from '../utils/schemas'
import { applyRateLimit } from '../utils/rate-limit'

const TEXT_FIELD_TYPES = new Set(['text', 'email', 'select'])

export default defineCachedEventHandler(async (event) => {
  // Rate limit: 60 searches per minute per IP
  applyRateLimit(event, 'search', 60, 60_000)

  await waitForEngine()

  const { q, limit: perCollection } = await getValidatedQuery(event, SearchQuerySchema.parse)

  const registry = getRegistry()
  const adapter = getAdapter()
  const schemas = registry.getAll()

  const searchPattern = `%${q}%`
  const results: Array<{
    collection: string
    records: Record<string, unknown>[]
  }> = []

  for (const schema of schemas) {
    if (isInternalCollection(schema.name)) continue

    // Find text-searchable fields
    const textFields = schema.fields.filter((f) => TEXT_FIELD_TYPES.has(f.type))
    if (textFields.length === 0) continue

    // Build OR filter across all text fields
    const filters: FilterGroup = {
      or: textFields.map((f) => ({
        field: f.name,
        operator: 'ilike' as const,
        value: searchPattern,
      })),
    }

    const ast: QueryAST = {
      filters,
      limit: perCollection,
    }

    try {
      const records = await adapter.findMany(schema.name, ast)
      if (records.length > 0) {
        results.push({ collection: schema.name, records })
      }
    } catch {
      // Skip collections that fail (e.g. missing table)
    }
  }

  return { results }
}, {
  maxAge: 30,
  swr: true,
})
