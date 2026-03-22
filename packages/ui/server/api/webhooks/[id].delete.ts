import { deleteWebhook } from '../../utils/webhooks'
import { waitForEngine } from '../../utils/engine'
import { IdParamSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const { id } = await getValidatedRouterParams(event, IdParamSchema.parse)

  const deleted = await deleteWebhook(String(id))
  if (!deleted) {
    throw createError({ status: 404, message: 'Webhook niet gevonden', data: { code: 'NOT_FOUND' } })
  }

  return { success: true }
})
