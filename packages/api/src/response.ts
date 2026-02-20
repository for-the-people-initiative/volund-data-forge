/**
 * AL-003: Standardized Response Format
 */

import type { ApiResponse, ApiErrorDetail } from './types.js'

export function successList(
  data: Record<string, unknown>[],
  meta: { total: number; page?: number; limit?: number },
): ApiResponse {
  return { status: 200, body: { data, meta } }
}

export function successSingle(data: Record<string, unknown>, status = 200): ApiResponse {
  return { status, body: { data } }
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: ApiErrorDetail[],
): ApiResponse {
  return {
    status,
    body: {
      error: { code, message, ...(details ? { details } : {}) },
    },
  }
}

export function notFound(message = 'Not found'): ApiResponse {
  return errorResponse(404, 'NOT_FOUND', message)
}

export function badRequest(message: string, details?: ApiErrorDetail[]): ApiResponse {
  return errorResponse(400, 'BAD_REQUEST', message, details)
}

export function validationError(details: ApiErrorDetail[]): ApiResponse {
  return errorResponse(400, 'VALIDATION_ERROR', 'Validation failed', details)
}

export function serverError(message = 'Internal server error'): ApiResponse {
  return errorResponse(500, 'INTERNAL_ERROR', message)
}
