import { createWebhook } from '../../utils/webhooks'
import { waitForEngine } from '../../utils/engine'
import { WebhookCreateSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const body = await readValidatedBody(event, WebhookCreateSchema.parse)

  const webhook = await createWebhook(body)

  setResponseStatus(event, 201)
  return webhook
})
