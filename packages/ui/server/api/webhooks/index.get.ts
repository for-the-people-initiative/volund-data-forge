import { listWebhooks } from '../../utils/webhooks'
import { waitForEngine } from '../../utils/engine'

export default defineEventHandler(async () => {
  await waitForEngine()
  const webhooks = await listWebhooks()
  return webhooks
})
