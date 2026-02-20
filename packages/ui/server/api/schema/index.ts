/**
 * GET  /api/schema — list all registered collection schemas
 * POST /api/schema — register a new collection schema
 */
import { getRegistry, getMigrationManager, waitForEngine } from '../../utils/engine'
import { validateSchema, isInternalCollection, DataEngineError } from '@data-engine/schema'
import type { CollectionSchema } from '@data-engine/schema'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const method = getMethod(event)

  if (method === 'GET') {
    const registry = getRegistry()
    return registry.getAll()
  }

  if (method === 'POST') {
    const registry = getRegistry()
    const body = await readBody<CollectionSchema>(event)

    if (!body || !body.name) {
      setResponseStatus(event, 400)
      return {
        error: {
          code: 'INVALID_BODY',
          message: 'Request body must include a collection schema with a name',
        },
      }
    }

    // Validate schema
    const knownCollections = registry.getAll().map((s) => s.name)
    const errors = validateSchema(body, knownCollections)
    if (errors.length > 0) {
      setResponseStatus(event, 400)
      return {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Schema validation failed',
          details: errors,
        },
      }
    }

    try {
      const mm = getMigrationManager()
      if (mm) {
        // Use migration manager (registers + creates table + tracks version)
        const result = await mm.applySchema(body)
        if (!result.success) {
          setResponseStatus(event, 500)
          return {
            error: {
              code: 'MIGRATION_FAILED',
              message: 'Failed to create collection',
              details: result,
            },
          }
        }
      } else {
        // Fallback: direct register + create
        const { getAdapter } = await import('../../utils/engine')
        const adapter = getAdapter()
        await registry.register(body)
        await adapter.createCollection(body.name, body.fields)
      }

      setResponseStatus(event, 201)
      return registry.get(body.name)
    } catch (err) {
      if (err instanceof DataEngineError) {
        setResponseStatus(event, err.statusCode)
        return { error: err.toJSON() }
      }
      throw err
    }
  }

  setResponseStatus(event, 405)
  return { error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${method} not allowed` } }
})
