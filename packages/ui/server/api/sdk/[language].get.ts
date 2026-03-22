import { defineEventHandler, getQuery, getRouterParam, setResponseHeaders } from 'h3'
import { generateSdk } from '@data-engine/sdk-generator'
import { mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import archiver from 'archiver'
import { applyRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  // Rate limit: 5 SDK generations per minute per IP
  applyRateLimit(event, 'sdk', 5, 60_000)

  const language = getRouterParam(event, 'language') || 'typescript'
  const query = getQuery(event)
  const schemaName = typeof query.schema === 'string' ? query.schema : undefined

  // Determine base URL from request
  const host = event.node.req.headers.host || 'localhost:9002'
  const protocol = event.node.req.headers['x-forwarded-proto'] || 'http'
  const apiBaseUrl = `${protocol}://${host}/api`
  const specUrl = `${apiBaseUrl}/openapi.json${schemaName ? `?schema=${schemaName}` : ''}`

  const outputDir = mkdtempSync(join(tmpdir(), 'sdk-'))

  const result = await generateSdk({
    language,
    openApiSpecUrl: specUrl,
    outputDir,
    apiBaseUrl,
    schemaName,
  })

  if (!result.success) {
    throw createError({ status: 500, message: result.error || 'SDK generation failed', data: { code: 'SDK_GENERATION_FAILED' } })
  }

  const projectName = schemaName || 'data-engine'
  const filename = `${projectName}-${language}-sdk.zip`

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
  })

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.directory(outputDir, false)

  // Return as a stream
  archive.pipe(event.node.res)
  await archive.finalize()
})
