/**
 * GET /api/collections-list — returns all registered collections with record counts.
 */
import { getRegistry, getAdapter, waitForEngine } from '../utils/engine';

export default defineEventHandler(async () => {
  await waitForEngine();
  const registry = getRegistry();
  const adapter = getAdapter();

  const allSchemas = registry.getAll();
  const result = [];

  for (const schema of allSchemas) {
    let count = 0;
    try {
      count = await adapter.count(schema.name);
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
