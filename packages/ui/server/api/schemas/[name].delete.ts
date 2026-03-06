/**
 * DELETE /api/schemas/:name — drop a database schema
 * Query param: ?cascade=true to cascade drop
 */
import { getAdapter, waitForEngine } from '../../utils/engine'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const name = getRouterParam(event, 'name')

  if (!name) {
    setResponseStatus(event, 400)
    return { error: { code: 'MISSING_NAME', message: 'Schema name required' } }
  }

  const query = getQuery(event)
  const cascade = query.cascade === 'true'

  try {
    const adapter = getAdapter()
    await adapter.dropSchema(name, cascade)
    setResponseStatus(event, 204)
    return null
  } catch (err) {
    setResponseStatus(event, 500)
    return { error: { code: 'SCHEMA_DROP_FAILED', message: err instanceof Error ? err.message : String(err) } }
  }
})
