import { toggleWebhook } from '../../utils/webhooks'
import { waitForEngine } from '../../utils/engine'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'ID is verplicht' }
  }

  if (body?.active === undefined) {
    setResponseStatus(event, 400)
    return { error: 'Veld active is verplicht' }
  }

  const updated = await toggleWebhook(id, !!body.active)
  if (!updated) {
    setResponseStatus(event, 404)
    return { error: 'Webhook niet gevonden' }
  }

  return updated
})
