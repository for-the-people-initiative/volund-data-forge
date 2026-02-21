/**
 * GET /api/activity — Query the activity log
 * Query params: collection, limit, offset
 */
import { waitForEngine } from '../utils/engine'
import { queryActivity } from '../utils/activity-log'

export default defineEventHandler(async (event) => {
  await waitForEngine()

  const query = getQuery(event) as Record<string, string>
  const collection = query.collection || undefined
  const limit = query.limit ? parseInt(query.limit, 10) : 50
  const offset = query.offset ? parseInt(query.offset, 10) : 0

  return queryActivity({ collection, limit, offset })
})
