/**
 * Catch-all route for /api/v1/:schema/:collection/records/**
 * Sets the adapter schema, delegates to ApiRouter, then restores.
 */
import { getApiRouter, getRegistry, getAdapter, waitForEngine } from '../../../utils/engine'
import type { RequestContext } from '@data-engine/api'
import { isInternalCollection, validateCollectionName } from '@data-engine/schema'
import { logActivity } from '../../../utils/activity-log'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const apiRouter = getApiRouter()
  const adapter = getAdapter()

  // Extract schema from route params
  const params = getRouterParams(event)
  const schema = params.schema
  const pathSegments = (params.path || '').split('/').filter(Boolean)
  const collection = pathSegments[0]

  // Support /v1/:schema/:collection/records[/:id]
  let id: string | undefined
  if (pathSegments[1] === 'records') {
    id = pathSegments[2]
  } else {
    id = pathSegments[1]
  }

  if (!collection) {
    setResponseStatus(event, 400)
    return { error: { code: 'MISSING_COLLECTION', message: 'Collection name required' } }
  }

  if (isInternalCollection(collection)) {
    setResponseStatus(event, 404)
    return { error: { code: 'NOT_FOUND', message: 'Collection not found' } }
  }

  const nameError = validateCollectionName(collection)
  if (nameError) {
    setResponseStatus(event, 400)
    return { error: { code: 'INVALID_COLLECTION_NAME', message: nameError } }
  }

  // Schema endpoint: GET /api/v1/:schema/:collection/schema
  if (id === 'schema' && event.method === 'GET') {
    const registry = getRegistry()
    const col = registry.get(collection)
    if (!col) {
      setResponseStatus(event, 404)
      return { error: { code: 'NOT_FOUND', message: `Collection '${collection}' not found` } }
    }
    return col
  }

  const method = event.method as 'GET' | 'POST' | 'PUT' | 'DELETE'
  const rawQuery = getQuery(event) as Record<string, string | string[]>

  // Parse bracket notation
  const query: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawQuery)) {
    const match = key.match(/^(\w+)\[([^\]]+)\](?:\[([^\]]+)\])?$/)
    if (match) {
      const [, root, k1, k2] = match
      if (!query[root!] || typeof query[root!] !== 'object') query[root!] = {}
      if (k2) {
        const parent = query[root!] as Record<string, unknown>
        if (!parent[k1!] || typeof parent[k1!] !== 'object') parent[k1!] = {}
        ;(parent[k1!] as Record<string, unknown>)[k2] = value
      } else {
        ;(query[root!] as Record<string, unknown>)[k1!] = value
      }
    } else {
      query[key] = value
    }
  }

  if (method === 'POST' || method === 'PUT') {
    const ct = getRequestHeader(event, 'content-type') ?? ''
    if (!ct.includes('application/json')) {
      setResponseStatus(event, 415)
      return {
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' },
      }
    }
  }

  const reqCtx: RequestContext = {
    method,
    path: `/api/${collection}${id ? `/${id}` : ''}`,
    params: { collection, ...(id ? { id } : {}) },
    query: query as Record<string, string | string[] | Record<string, unknown>>,
    headers: {},
  }

  if (method === 'POST' || method === 'PUT') {
    reqCtx.body = await readBody(event)
  }

  const routes = apiRouter.getDynamicRoutes()
  const routePath = id ? '/api/:collection/:id' : '/api/:collection'
  const route = routes.find((r) => r.method === method && r.path === routePath)

  if (!route) {
    setResponseStatus(event, 405)
    return { error: { code: 'METHOD_NOT_ALLOWED', message: `${method} not supported` } }
  }

  // Switch adapter schema, execute, restore
  const previousSchema = adapter.getSchema()
  try {
    // Only switch schema if different from current default
    // ('public' maps to whatever the adapter default is — e.g. 'main' for SQLite)
    if (schema !== 'public' && schema !== previousSchema) {
      adapter.setSchema(schema)
    }
    const response = await route.handler(reqCtx)
    setResponseStatus(event, response.status)

    // Log activity for successful write operations
    if (response.status >= 200 && response.status < 300) {
      if (method === 'POST') {
        const body = response.body as any
        const recordId = body?.data?.id ?? body?.id
        logActivity({
          collection,
          record_id: recordId != null ? String(recordId) : undefined,
          action: 'create',
          changes: reqCtx.body as Record<string, unknown> | undefined,
        })
      } else if (method === 'PUT' && id) {
        logActivity({ collection, record_id: id, action: 'update', changes: reqCtx.body as Record<string, unknown> | undefined })
      } else if (method === 'DELETE') {
        logActivity({ collection, record_id: id, action: 'delete' })
      }
    }

    if (response.status === 204) return null
    setResponseHeader(event, 'content-type', 'application/json')
    return response.body
  } finally {
    adapter.setSchema(previousSchema)
  }
})
