/**
 * GET  /api/schemas — list all database schemas with metadata
 * POST /api/schemas — create a new database schema
 */
import { getAdapter, waitForEngine } from '../../utils/engine'
import { SchemaCreateSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const method = getMethod(event)
  const adapter = getAdapter()

  if (method === 'GET') {
    const schemas = await adapter.listSchemasWithMeta()
    return { data: schemas }
  }

  if (method === 'POST') {
    const body = await readValidatedBody(event, SchemaCreateSchema.parse)

    try {
      await adapter.createSchema(body.name)
      const meta = await adapter.getSchemaMetadata(body.name)
      setResponseStatus(event, 201)
      return { data: meta ?? { name: body.name } }
    } catch (err) {
      throw createError({
        status: 500,
        message: err instanceof Error ? err.message : String(err),
        data: { code: 'SCHEMA_CREATE_FAILED' },
      })
    }
  }

  throw createError({ status: 405, message: `Method ${method} not allowed`, data: { code: 'METHOD_NOT_ALLOWED' } })
})
