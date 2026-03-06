/**
 * GET  /api/schemas — list all database schemas (namespaces)
 * POST /api/schemas — create a new database schema
 */
import { getAdapter, waitForEngine } from '../../utils/engine'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const method = getMethod(event)
  const adapter = getAdapter()

  if (method === 'GET') {
    const schemas = await adapter.listSchemas()
    return { data: schemas }
  }

  if (method === 'POST') {
    const body = await readBody<{ name: string }>(event)
    if (!body?.name) {
      setResponseStatus(event, 400)
      return { error: { code: 'INVALID_BODY', message: 'Request body must include { name: string }' } }
    }

    try {
      await adapter.createSchema(body.name)
      setResponseStatus(event, 201)
      return { data: { name: body.name } }
    } catch (err) {
      setResponseStatus(event, 500)
      return { error: { code: 'SCHEMA_CREATE_FAILED', message: err instanceof Error ? err.message : String(err) } }
    }
  }

  setResponseStatus(event, 405)
  return { error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${method} not allowed` } }
})
