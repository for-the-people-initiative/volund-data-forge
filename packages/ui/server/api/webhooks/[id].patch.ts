import { toggleWebhook } from '../../utils/webhooks'
import { waitForEngine } from '../../utils/engine'
import { IdParamSchema, WebhookToggleSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const { id } = await getValidatedRouterParams(event, IdParamSchema.parse)
  const body = await readValidatedBody(event, WebhookToggleSchema.parse)

  const updated = await toggleWebhook(String(id), body.active)
  if (!updated) {
    throw createError({ status: 404, message: 'Webhook niet gevonden', data: { code: 'NOT_FOUND' } })
  }

  return updated
})
