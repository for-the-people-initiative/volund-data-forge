import { getAdapter, waitForEngine } from '../utils/engine'

export default defineEventHandler(async () => {
  await waitForEngine()
  const adapter = getAdapter()
  return await adapter.health()
})
