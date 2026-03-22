/**
 * POST /api/uploads — multipart file upload
 * Stores files in data-engine/.uploads/ directory
 * Returns { path, filename, mimetype, size }
 */
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { applyRateLimit } from '../../utils/rate-limit'

const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_SIZE ?? 10 * 1024 * 1024) // 10MB default

export default defineEventHandler(async (event) => {
  // Rate limit: 10 uploads per minute per IP
  applyRateLimit(event, 'upload', 10, 60_000)

  const uploadsDir = join(process.cwd(), '.uploads')
  await mkdir(uploadsDir, { recursive: true })

  // Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ status: 400, message: 'No file uploaded', data: { code: 'NO_FILE' } })
  }

  const file = formData[0]!
  if (!file.data || file.data.length === 0) {
    throw createError({ status: 400, message: 'File is empty', data: { code: 'EMPTY_FILE' } })
  }

  if (file.data.length > MAX_FILE_SIZE) {
    throw createError({
      status: 413,
      message: `File exceeds maximum size of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
      data: { code: 'FILE_TOO_LARGE' },
    })
  }

  const ext = extname(file.filename || '')
  const uniqueName = `${randomUUID()}${ext}`
  const filePath = join(uploadsDir, uniqueName)

  await writeFile(filePath, file.data)

  return {
    path: `/api/uploads/${uniqueName}`,
    filename: file.filename || uniqueName,
    mimetype: file.type || 'application/octet-stream',
    size: file.data.length,
  }
})
