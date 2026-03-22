/**
 * GET /api/activity — Query the activity log
 * Query params: collection, limit, offset
 */
import { waitForEngine } from '../utils/engine'
import { queryActivity } from '../utils/activity-log'
import { ActivityQuerySchema } from '../utils/schemas'

export default defineEventHandler(async (event) => {
  await waitForEngine()

  const query = await getValidatedQuery(event, ActivityQuerySchema.parse)

  return queryActivity(query)
})
