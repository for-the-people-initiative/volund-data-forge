/**
 * Catch-all route for /api/collections/**
 * Delegates to the Data Engine's ApiRouter (H3 adapter pattern).
 */
import { getApiRouter, getRegistry, getAdapter, waitForEngine } from '../../utils/engine'
import type { RequestContext } from '@data-engine/api'
import { isInternalCollection, validateCollectionName } from '@data-engine/schema'
import { logActivity } from '../../utils/activity-log'

/** Response body structure from ApiRouter */
interface ApiResponseBody {
  data?: { id?: number | string; [key: string]: unknown }
  id?: number | string
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const apiRouter = getApiRouter()

  // Parse path: /api/collections/:collection[/:id]
  const params = getRouterParams(event)
  const pathSegments = (params.path || '').split('/').filter(Boolean)
  const collection = pathSegments[0]
  // Support both /collections/:collection/:id and /collections/:collection/records[/:id]
  let id: string | undefined
  if (pathSegments[1] === 'records') {
    id = pathSegments[2]
  } else {
    id = pathSegments[1]
  }

  if (!collection) {
    throw createError({ status: 400, message: 'Collection name required', data: { code: 'MISSING_COLLECTION' } })
  }

  // Block access to internal tables
  if (isInternalCollection(collection)) {
    throw createError({ status: 404, message: 'Collection not found', data: { code: 'NOT_FOUND' } })
  }

  // Validate collection name format
  const nameError = validateCollectionName(collection)
  if (nameError) {
    throw createError({ status: 400, message: nameError, data: { code: 'INVALID_COLLECTION_NAME' } })
  }

  // Schema endpoint: GET /api/collections/:collection/schema
  if (id === 'schema' && event.method === 'GET') {
    const registry = getRegistry()
    const schema = registry.get(collection)
    if (!schema) {
      throw createError({ status: 404, message: `Collection '${collection}' not found`, data: { code: 'NOT_FOUND' } })
    }
    return schema
  }

  const method = event.method as 'GET' | 'POST' | 'PUT' | 'DELETE'
  const rawQuery = getQuery(event) as Record<string, string | string[]>

  // Parse bracket notation: filter[field][op]=value → { filter: { field: { op: value } } }
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

  // Content-Type validation for write methods
  if (method === 'POST' || method === 'PUT') {
    const ct = getRequestHeader(event, 'content-type') ?? ''
    if (!ct.includes('application/json')) {
      throw createError({
        status: 415,
        message: 'Content-Type must be application/json',
        data: { code: 'UNSUPPORTED_MEDIA_TYPE' },
      })
    }
  }

  // Build RequestContext
  const reqCtx: RequestContext = {
    method,
    path: `/api/${collection}${id ? `/${id}` : ''}`,
    params: { collection, ...(id ? { id } : {}) },
    query: query as Record<string, string | string[] | Record<string, unknown>>,
    headers: {},
  }

  // Read body for POST/PUT
  if (method === 'POST' || method === 'PUT') {
    reqCtx.body = await readBody(event)
  }

  // Match route from ApiRouter
  const routes = apiRouter.getDynamicRoutes()
  const routePath = id ? '/api/:collection/:id' : '/api/:collection'
  const route = routes.find((r) => r.method === method && r.path === routePath)

  if (!route) {
    throw createError({ status: 405, message: `${method} not supported`, data: { code: 'METHOD_NOT_ALLOWED' } })
  }

  // Execute and return
  const response = await route.handler(reqCtx)
  setResponseStatus(event, response.status)

  // Log activity for successful write operations
  if (response.status >= 200 && response.status < 300) {
    if (method === 'POST') {
      const body = response.body as ApiResponseBody | undefined
      const recordId = body?.data?.id ?? body?.id
      logActivity({
        collection,
        record_id: recordId != null ? String(recordId) : undefined,
        action: 'create',
        changes: reqCtx.body as Record<string, unknown> | undefined,
      })
    } else if (method === 'PUT' && id) {
      logActivity({
        collection,
        record_id: id,
        action: 'update',
        changes: reqCtx.body as Record<string, unknown> | undefined,
      })
    } else if (method === 'DELETE') {
      logActivity({
        collection,
        record_id: id,
        action: 'delete',
      })
    }
  }

  if (response.status === 204) {
    return null
  }

  setResponseHeader(event, 'content-type', 'application/json')

  return response.body
})
