/**
 * GET  /api/schema — list all registered collection schemas
 * POST /api/schema — register a new collection schema
 */
import type { H3Event } from 'h3'
import { getRegistry, getMigrationManager, waitForEngine } from '../../utils/engine'
import { validateSchema, isInternalCollection, DataEngineError } from '@data-engine/schema'
import type { CollectionSchema } from '@data-engine/schema'

/**
 * Helper to scope adapter to a specific database schema, restoring after.
 */
async function withSchema<T>(event: H3Event, fn: () => Promise<T>): Promise<T> {
  const query = getQuery(event)
  const schemaName = query.schema as string | undefined
  if (!schemaName) return fn()

  const { getAdapter } = await import('../../utils/engine')
  const adapter = getAdapter()
  const prev = adapter.getSchema()
  try {
    adapter.setSchema(schemaName)
    // Ensure _schema_versions table exists in the target schema
    const mm = getMigrationManager()
    if (mm) {
      await mm.init()
    }
    return await fn()
  } finally {
    adapter.setSchema(prev)
  }
}

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const method = getMethod(event)

  if (method === 'GET') {
    const query = getQuery(event)
    const schemaName = typeof query.schema === 'string' ? query.schema : undefined
    const registry = getRegistry()
    return registry.getAll(schemaName)
  }

  if (method === 'POST') {
    const registry = getRegistry()
    const body = await readBody<CollectionSchema>(event)

    if (!body || !body.name) {
      throw createError({
        status: 400,
        message: 'Request body must include a collection schema with a name',
        data: { code: 'INVALID_BODY' },
      })
    }

    // Validate schema
    const knownCollections = registry.getAll().map((s) => s.name)
    const errors = validateSchema(body, knownCollections)
    if (errors.length > 0) {
      throw createError({
        status: 400,
        message: 'Schema validation failed',
        data: { code: 'VALIDATION_FAILED', details: errors },
      })
    }

    // Tag collection with the database schema
    const query = getQuery(event)
    const schemaName = typeof query.schema === 'string' ? query.schema : undefined
    if (schemaName) {
      body.schema = schemaName
    }

    try {
      return await withSchema(event, async () => {
        const mm = getMigrationManager()
        if (mm) {
          // Use migration manager (registers + creates table + tracks version)
          const result = await mm.applySchema(body)
          if (!result.success) {
            throw createError({
              status: 500,
              message: 'Failed to create collection',
              data: { code: 'MIGRATION_FAILED', details: result },
            })
          }
        } else {
          // Fallback: direct register + create
          const { getAdapter } = await import('../../utils/engine')
          const adapter = getAdapter()
          await registry.register(body)
          await adapter.createCollection(body.name, body.fields)
        }

        setResponseStatus(event, 201)
        return registry.get(body.name, schemaName)
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
