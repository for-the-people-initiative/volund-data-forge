/**
 * GET /api/schema/:collection — returns the collection schema.
 */
import { getRegistry } from '../../utils/engine';

export default defineEventHandler(async (event) => {
  const collection = getRouterParam(event, 'collection');
  if (!collection) {
    setResponseStatus(event, 400);
    return { error: { code: 'MISSING_COLLECTION', message: 'Collection name required' } };
  }

  const registry = getRegistry();
  const schema = registry.get(collection);

  if (!schema) {
    setResponseStatus(event, 404);
    return { error: { code: 'NOT_FOUND', message: `Schema "${collection}" not found` } };
  }

  return schema;
});
