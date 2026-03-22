/**
 * PATCH /api/schemas/:name — update schema metadata (description, icon)
 */
import { getAdapter, waitForEngine } from '../../utils/engine'
import { NameParamSchema, SchemaPatchSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const { name } = await getValidatedRouterParams(event, NameParamSchema.parse)
  const body = await readValidatedBody(event, SchemaPatchSchema.parse)

  try {
    const adapter = getAdapter()
    await adapter.updateSchemaMetadata(name, body)
    const meta = await adapter.getSchemaMetadata(name)
    return { data: meta }
  } catch (err) {
    throw createError({
      status: 500,
      message: err instanceof Error ? err.message : String(err),
      data: { code: 'SCHEMA_UPDATE_FAILED' },
    })
  }
})
