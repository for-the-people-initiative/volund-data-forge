/**
 * GET    /api/schema/:collection — get a specific collection schema
 * PUT    /api/schema/:collection — update a collection schema (with migration)
 * DELETE /api/schema/:collection — remove a collection from registry
 */
import type { H3Event } from 'h3'
import { getRegistry, getMigrationManager, getAdapter, waitForEngine } from '../../utils/engine'

/**
 * Helper to scope adapter to a specific database schema, restoring after.
 */
async function withSchema<T>(event: H3Event, fn: () => Promise<T>): Promise<T> {
  const query = getQuery(event)
  const schemaName = query.schema as string | undefined
  if (!schemaName) return fn()

  const adapter = getAdapter()
  const prev = adapter.getSchema()
  try {
    adapter.setSchema(schemaName)
    return await fn()
  } finally {
    adapter.setSchema(prev)
  }
}
import {
  validateSchema,
  validateCollectionName,
  isInternalCollection,
  DataEngineError,
} from '@data-engine/schema'
import type { CollectionSchema } from '@data-engine/schema'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const collection = getRouterParam(event, 'collection')
  if (!collection) {
    throw createError({ status: 400, message: 'Collection name required', data: { code: 'MISSING_COLLECTION' } })
  }

  // Block access to internal collections
  if (isInternalCollection(collection)) {
    throw createError({ status: 404, message: 'Collection not found', data: { code: 'NOT_FOUND' } })
  }

  const method = getMethod(event)
  const registry = getRegistry()

  // ─── GET ──────────────────────────────────────────────────────
  if (method === 'GET') {
    const schema = registry.get(collection)
    if (!schema) {
      throw createError({ status: 404, message: `Schema "${collection}" not found`, data: { code: 'NOT_FOUND' } })
    }
    return schema
  }

  // ─── PUT ──────────────────────────────────────────────────────
  if (method === 'PUT') {
    const existing = registry.get(collection)
    if (!existing) {
      throw createError({ status: 404, message: `Schema "${collection}" not found`, data: { code: 'NOT_FOUND' } })
    }

    const body = await readBody<CollectionSchema>(event)
    if (!body || !body.fields) {
      throw createError({ status: 400, message: 'Request body must include fields', data: { code: 'INVALID_BODY' } })
    }

    // Ensure name matches route param
    body.name = collection

    // Validate
    const knownCollections = registry
      .getAll()
      .map((s) => s.name)
      .filter((n) => n !== collection)
    const errors = validateSchema(body, knownCollections)
    if (errors.length > 0) {
      throw createError({
        status: 400,
        message: 'Schema validation failed',
        data: { code: 'VALIDATION_FAILED', details: errors },
      })
    }

    try {
      return await withSchema(event, async () => {
        const mm = getMigrationManager()
        if (!mm) {
          throw createError({
            status: 500,
            message: 'Migration manager not available',
            data: { code: 'NO_MIGRATION_MANAGER' },
          })
        }

        const result = await mm.applySchema(body, { force: true })
        if (!result.success) {
          throw createError({
            status: 500,
            message: 'Migration failed',
            data: { code: 'MIGRATION_FAILED', details: result },
          })
        }

        return registry.get(collection)
      })
    } catch (err) {
      if (err instanceof DataEngineError) {
        throw createError({ status: err.statusCode, message: err.message, data: err.toJSON() })
      }
      throw err
    }
  }

  // ─── DELETE ───────────────────────────────────────────────────
  if (method === 'DELETE') {
    const existing = registry.get(collection)
    if (!existing) {
      throw createError({ status: 404, message: `Schema "${collection}" not found`, data: { code: 'NOT_FOUND' } })
    }

    try {
      return await withSchema(event, async () => {
        await registry.remove(collection)
        const adapter = getAdapter()
        await adapter.dropCollection(collection)
        setResponseStatus(event, 204)
        return null
      })
    } catch (err) {
      if (err instanceof DataEngineError) {
        throw createError({ status: err.statusCode, message: err.message, data: err.toJSON() })
      }
      throw err
    }
  }

  throw createError({ status: 405, message: `Method ${method} not allowed`, data: { code: 'METHOD_NOT_ALLOWED' } })
})
