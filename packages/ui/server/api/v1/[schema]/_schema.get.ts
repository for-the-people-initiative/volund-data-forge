/**
 * GET /api/v1/:schema/_schema → list collections in that schema.
 */
import { getRegistry, waitForEngine } from '../../../utils/engine'

export default defineCachedEventHandler(async (event) => {
  await waitForEngine()
  const params = getRouterParams(event)
  const schema = params.schema

  const registry = getRegistry()
  const collections = registry.getAll(schema).filter(c => c.api?.enabled !== false)

  return {
    schema,
    collections: collections.map(c => ({
      name: c.name,
      fields: c.fields.length,
      api: c.api ?? {},
    })),
  }
}, {
  maxAge: 60,
  swr: true,
})
