/**
 * Catch-all route for /api/collections/**
 * Delegates to the Data Engine's ApiRouter (H3 adapter pattern).
 */
import { getApiRouter, getRegistry, getAdapter } from '../../utils/engine';
import type { RequestContext } from '@data-engine/api';
import type { FieldDefinition } from '@data-engine/schema';

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
  const rawQuery = getQuery(event) as Record<string, string | string[]>;

  // Parse bracket notation: filter[field][op]=value → { filter: { field: { op: value } } }
  const query: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawQuery)) {
    const match = key.match(/^(\w+)\[([^\]]+)\](?:\[([^\]]+)\])?$/);
    if (match) {
      const [, root, k1, k2] = match;
      if (!query[root!] || typeof query[root!] !== 'object') query[root!] = {};
      if (k2) {
        const parent = query[root!] as Record<string, unknown>;
        if (!parent[k1!] || typeof parent[k1!] !== 'object') parent[k1!] = {};
        (parent[k1!] as Record<string, unknown>)[k2] = value;
      } else {
        (query[root!] as Record<string, unknown>)[k1!] = value;
      }
    } else {
      query[key] = value;
    }
  }

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

  // Resolve lookup fields for GET requests
  if (method === 'GET' && response.status >= 200 && response.status < 300) {
    const registry = getRegistry();
    const schema = registry.get(collection);
    if (schema) {
      const lookupFields = schema.fields.filter((f: FieldDefinition) => f.type === 'lookup' && f.lookup);
      if (lookupFields.length > 0) {
        try {
          await resolveLookups(response.body, lookupFields, schema, registry);
        } catch {
          // Don't fail the request if lookup resolution fails
        }
      }
    }
  }

  return response.body;
});

/**
 * Resolve lookup fields by fetching related data.
 * Modifies records in-place, adding the looked-up value under the field name.
 */
async function resolveLookups(
  body: any,
  lookupFields: FieldDefinition[],
  schema: any,
  registry: any,
) {
  // body can be { data: [...], meta } or { data: {...} } or [...]
  const records = Array.isArray(body?.data) ? body.data
    : Array.isArray(body) ? body
    : body?.data ? [body.data]
    : [];

  if (records.length === 0) return;

  const adapter = getAdapter();

  for (const lf of lookupFields) {
    const lookup = lf.lookup!;
    // Find the relation field this lookup references
    const relationField = schema.fields.find((f: FieldDefinition) => f.name === lookup.relation);
    if (!relationField?.relation?.target) continue;

    const target = relationField.relation.target;
    const fk = relationField.name; // The relation field stores the FK value

    // Collect all FK values
    const fkValues = [...new Set(records.map((r: any) => r[fk]).filter(Boolean))];
    if (fkValues.length === 0) continue;

    // Fetch the target records
    const related = await adapter.findMany(target, {
      filters: { and: [{ field: 'id', operator: 'in', value: fkValues }] },
    });

    // Build lookup map: id → field value
    const lookupMap = new Map<unknown, unknown>();
    for (const r of related) {
      lookupMap.set(r.id, r[lookup.field] ?? null);
    }

    // Set the lookup value on each record
    for (const record of records) {
      const fkVal = record[fk];
      record[lf.name] = fkVal != null ? (lookupMap.get(fkVal) ?? null) : null;
    }
  }
}
