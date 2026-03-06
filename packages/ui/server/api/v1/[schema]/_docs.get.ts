/**
 * GET /api/v1/:schema/_docs → OpenAPI spec for that schema with v1 paths.
 */
import { getRegistry, waitForEngine } from '../../../utils/engine'
import { generateOpenApiSpec } from '@data-engine/api'

export default defineEventHandler(async (event) => {
  await waitForEngine()
  const params = getRouterParams(event)
  const schema = params.schema

  const registry = getRegistry()
  const spec = generateOpenApiSpec(registry, {
    title: `Data Engine API — ${schema}`,
    schemaName: schema,
    pathPrefix: `/api/v1/${schema}`,
  })

  setResponseHeader(event, 'content-type', 'application/json')
  return spec
})
