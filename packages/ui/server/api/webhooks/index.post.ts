import { createWebhook } from '../../utils/webhooks'
import { waitForEngine } from '../../utils/engine'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const body = await readBody(event)

  if (!body?.collection || !body?.event || !body?.url || !body?.secret) {
    setResponseStatus(event, 400)
    return { error: 'Velden collection, event, url en secret zijn verplicht' }
  }

  const validEvents = ['create', 'update', 'delete', 'all']
  if (!validEvents.includes(body.event)) {
    setResponseStatus(event, 400)
    return { error: `Event moet een van: ${validEvents.join(', ')}` }
  }

  const webhook = await createWebhook({
    collection: body.collection,
    event: body.event,
    url: body.url,
    secret: body.secret,
  })

  setResponseStatus(event, 201)
  return webhook
})
