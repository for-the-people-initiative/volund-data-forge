/**
 * Global search across all collections.
 * GET /api/search?q=term&limit=5
 * Returns results grouped by collection.
 */
import { getAdapter, getRegistry, waitForEngine } from '../utils/engine'
import type { QueryAST, FilterGroup } from '@data-engine/adapter'
import { isInternalCollection } from '@data-engine/schema'

const TEXT_FIELD_TYPES = new Set(['text', 'email', 'select'])

export default defineEventHandler(async (event) => {
  await waitForEngine()

  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  const perCollection = Math.min(Math.max(Number(query.limit) || 5, 1), 20)

  if (!q) {
    return { results: [] }
  }

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
})
