/**
 * API error helpers for consistent error responses.
 * Uses h3's createError for proper HTTP error handling.
 */
import { createError } from 'h3'

/**
 * Throw a 400 Bad Request error.
 * Use for invalid input, missing required fields, validation failures.
 */
export function badRequest(message: string, data?: Record<string, unknown>): never {
  throw createError({ status: 400, message, data })
}

/**
 * Throw a 404 Not Found error.
 * Use when a requested resource doesn't exist.
 */
export function notFound(message: string): never {
  throw createError({ status: 404, message })
}

/**
 * Throw a 409 Conflict error.
 * Use for duplicate entries, constraint violations.
 */
export function conflict(message: string): never {
  throw createError({ status: 409, message })
}

/**
 * Throw a 500 Internal Server Error.
 * Use for unexpected errors, database failures, etc.
 */
export function serverError(message: string, cause?: unknown): never {
  throw createError({ status: 500, message, cause })
}

/**
 * Throw a 405 Method Not Allowed error.
 */
export function methodNotAllowed(method: string): never {
  throw createError({ status: 405, message: `Method ${method} not allowed` })
}

/**
 * Throw a 415 Unsupported Media Type error.
 */
export function unsupportedMediaType(message = 'Content-Type must be application/json'): never {
  throw createError({ status: 415, message })
}

// ─── Error Utilities ────────────────────────────────────────────────

/**
 * Type guard to extract error message from unknown error.
 * Safe to use in catch blocks without type assertions.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

/**
 * Wrap a handler to catch errors and return consistent API responses.
 * Useful for handlers that don't use h3's built-in error handling.
 */
export function wrapError(err: unknown): { error: { code: string; message: string } } {
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: getErrorMessage(err),
    },
  }
}
