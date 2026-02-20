/**
 * GET    /api/schema/:collection — get a specific collection schema
 * PUT    /api/schema/:collection — update a collection schema (with migration)
 * DELETE /api/schema/:collection — remove a collection from registry
 */
import { getRegistry, getMigrationManager, waitForEngine } from '../../utils/engine'
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
    setResponseStatus(event, 400)
    return { error: { code: 'MISSING_COLLECTION', message: 'Collection name required' } }
  }

  // Block access to internal collections
  if (isInternalCollection(collection)) {
    setResponseStatus(event, 404)
    return { error: { code: 'NOT_FOUND', message: 'Collection not found' } }
  }

  const method = getMethod(event)
  const registry = getRegistry()

  // ─── GET ──────────────────────────────────────────────────────
  if (method === 'GET') {
    const schema = registry.get(collection)
    if (!schema) {
      setResponseStatus(event, 404)
      return { error: { code: 'NOT_FOUND', message: `Schema "${collection}" not found` } }
    }
    return schema
  }

  // ─── PUT ──────────────────────────────────────────────────────
  if (method === 'PUT') {
    const existing = registry.get(collection)
    if (!existing) {
      setResponseStatus(event, 404)
      return { error: { code: 'NOT_FOUND', message: `Schema "${collection}" not found` } }
    }

    const body = await readBody<CollectionSchema>(event)
    if (!body || !body.fields) {
      setResponseStatus(event, 400)
      return { error: { code: 'INVALID_BODY', message: 'Request body must include fields' } }
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
      if (!mm) {
        setResponseStatus(event, 500)
        return {
          error: { code: 'NO_MIGRATION_MANAGER', message: 'Migration manager not available' },
        }
      }

      const result = await mm.applySchema(body, { force: true })
      if (!result.success) {
        setResponseStatus(event, 500)
        return { error: { code: 'MIGRATION_FAILED', message: 'Migration failed', details: result } }
      }

      return registry.get(collection)
    } catch (err) {
      if (err instanceof DataEngineError) {
        setResponseStatus(event, err.statusCode)
        return { error: err.toJSON() }
      }
      throw err
    }
  }

  // ─── DELETE ───────────────────────────────────────────────────
  if (method === 'DELETE') {
    const existing = registry.get(collection)
    if (!existing) {
      setResponseStatus(event, 404)
      return { error: { code: 'NOT_FOUND', message: `Schema "${collection}" not found` } }
    }

    try {
      await registry.remove(collection)
      // Note: table drop not yet supported by adapter — schema removed from registry only
      setResponseStatus(event, 204)
      return null
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
