/**
 * Catch-all route for /api/collections/**
 * Delegates to the Data Engine's ApiRouter (H3 adapter pattern).
 */
import { getApiRouter, getRegistry } from '../../utils/engine';
import type { RequestContext } from '@data-engine/api';

export default defineEventHandler(async (event) => {
  const apiRouter = getApiRouter();

  // Parse path: /api/collections/:collection[/:id]
  const params = getRouterParams(event);
  const pathSegments = (params.path || '').split('/').filter(Boolean);
  const collection = pathSegments[0];
  // Support both /collections/:collection/:id and /collections/:collection/records[/:id]
  let id: string | undefined;
  if (pathSegments[1] === 'records') {
    id = pathSegments[2];
  } else {
    id = pathSegments[1];
  }

  if (!collection) {
    setResponseStatus(event, 400);
    return { error: { code: 'MISSING_COLLECTION', message: 'Collection name required' } };
  }

  // Schema endpoint: GET /api/collections/:collection/schema
  if (id === 'schema' && event.method === 'GET') {
    const registry = getRegistry();
    const schema = registry.get(collection);
    if (!schema) {
      setResponseStatus(event, 404);
      return { error: { code: 'NOT_FOUND', message: `Collection '${collection}' not found` } };
    }
    return schema;
  }

  const method = event.method as 'GET' | 'POST' | 'PUT' | 'DELETE';
  const query = getQuery(event) as Record<string, string | string[]>;

  // Content-Type validation for write methods
  if (method === 'POST' || method === 'PUT') {
    const ct = getRequestHeader(event, 'content-type') ?? '';
    if (!ct.includes('application/json')) {
      setResponseStatus(event, 415);
      return { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' } };
    }
  }

  // Build RequestContext
  const reqCtx: RequestContext = {
    method,
    path: `/api/${collection}${id ? `/${id}` : ''}`,
    params: { collection, ...(id ? { id } : {}) },
    query,
    headers: {},
  };

  // Read body for POST/PUT
  if (method === 'POST' || method === 'PUT') {
    reqCtx.body = await readBody(event);
  }

  // Match route from ApiRouter
  const routes = apiRouter.getDynamicRoutes();
  const routePath = id ? '/api/:collection/:id' : '/api/:collection';
  const route = routes.find(r => r.method === method && r.path === routePath);

  if (!route) {
    setResponseStatus(event, 405);
    return { error: { code: 'METHOD_NOT_ALLOWED', message: `${method} not supported` } };
  }

  // Execute and return
  const response = await route.handler(reqCtx);
  setResponseStatus(event, response.status);
  setResponseHeader(event, 'content-type', 'application/json');
  return response.body;
});
