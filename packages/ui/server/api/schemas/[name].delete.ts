/**
 * DELETE /api/schemas/:name — drop a database schema
 * Query param: ?cascade=true to cascade drop
 */
import { getAdapter, waitForEngine } from '../../utils/engine'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const name = getRouterParam(event, 'name')

  if (!name) {
    throw createError({ status: 400, message: 'Schema name required', data: { code: 'MISSING_NAME' } })
  }

  const query = getQuery(event)
  const cascade = query.cascade === 'true'

  try {
    const adapter = getAdapter()
    await adapter.dropSchema(name, cascade)
    setResponseStatus(event, 204)
    return null
  } catch (err) {
    throw createError({
      status: 500,
      message: err instanceof Error ? err.message : String(err),
      data: { code: 'SCHEMA_DROP_FAILED' },
    })
  }
})
