/**
 * POST /api/uploads — multipart file upload
 * Stores files in data-engine/.uploads/ directory
 * Returns { path, filename, mimetype, size }
 */
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'

const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_SIZE ?? 10 * 1024 * 1024) // 10MB default

export default defineEventHandler(async (event) => {
  const uploadsDir = join(process.cwd(), '.uploads')
  await mkdir(uploadsDir, { recursive: true })

  // Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    setResponseStatus(event, 400)
    return { error: { code: 'NO_FILE', message: 'No file uploaded' } }
  }

  const file = formData[0]!
  if (!file.data || file.data.length === 0) {
    setResponseStatus(event, 400)
    return { error: { code: 'EMPTY_FILE', message: 'File is empty' } }
  }

  if (file.data.length > MAX_FILE_SIZE) {
    setResponseStatus(event, 413)
    return {
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File exceeds maximum size of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
      },
    }
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
