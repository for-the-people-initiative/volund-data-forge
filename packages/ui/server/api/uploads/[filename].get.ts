/**
 * GET /api/uploads/:filename — serve uploaded files
 */
import { createReadStream, existsSync } from 'fs'
import { join } from 'path'
import { sendStream } from 'h3'

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv', '.txt': 'text/plain', '.json': 'application/json', '.zip': 'application/zip',
}

function getMimeType(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename) {
    setResponseStatus(event, 400)
    return { error: { code: 'MISSING_FILENAME', message: 'Filename required' } }
  }

  // Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    setResponseStatus(event, 400)
    return { error: { code: 'INVALID_FILENAME', message: 'Invalid filename' } }
  }

  const filePath = join(process.cwd(), '.uploads', filename)
  if (!existsSync(filePath)) {
    setResponseStatus(event, 404)
    return { error: { code: 'NOT_FOUND', message: 'File not found' } }
  }

  const mimeType = getMimeType(filename)
  setResponseHeader(event, 'content-type', mimeType)
  setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')

  return sendStream(event, createReadStream(filePath))
})
