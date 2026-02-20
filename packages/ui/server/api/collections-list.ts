/**
 * GET /api/collections-list — returns all registered collections with record counts.
 */
import { getRegistry, getAdapter } from '../utils/engine';

export default defineEventHandler(async () => {
  const registry = getRegistry();
  const adapter = getAdapter();

  const allSchemas = registry.getAll();
  const result = [];

  for (const schema of allSchemas) {
    let count = 0;
    try {
      const records = await adapter.findMany(schema.name, { filters: [] });
      count = records.length;
    } catch {
      // collection may not exist yet
    }
    result.push({
      name: schema.name,
      count,
      fieldCount: schema.fields.length,
    });
  }

  return result;
});
