import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { getRegistry, waitForEngine } from '../utils/engine'
import { generateOpenApiSpec } from '@data-engine/api'

export default defineEventHandler(async (event: H3Event) => {
  await waitForEngine()

  const query = getQuery(event)
  const schemaName = typeof query.schema === 'string' ? query.schema : undefined

  const registry = getRegistry()
  const spec = generateOpenApiSpec(registry, { schemaName })

  return spec
})
