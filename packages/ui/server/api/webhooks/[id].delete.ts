import { deleteWebhook } from '../../utils/webhooks'
import { waitForEngine } from '../../utils/engine'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'ID is verplicht' }
  }

  const deleted = await deleteWebhook(id)
  if (!deleted) {
    setResponseStatus(event, 404)
    return { error: 'Webhook niet gevonden' }
  }

  return { success: true }
})
