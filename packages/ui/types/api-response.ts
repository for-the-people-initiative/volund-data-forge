import type { CollectionRecord } from './collection-record'

/**
 * Paginated API response from collection endpoints.
 */
export interface CollectionListResponse {
  data: CollectionRecord[]
  meta?: {
    total: number
    limit?: number
    offset?: number
  }
}

/**
 * Single record API response.
 */
export interface CollectionRecordResponse {
  data?: CollectionRecord
  [key: string]: unknown
}

/**
 * API error response shape.
 */
export interface ApiErrorResponse {
  error?: {
    message: string
    details?: string[]
  }
}

/**
 * Extract error message from an unknown caught error.
 */
export function getErrorMessage(err: unknown, fallback = 'Onbekende fout'): string {
  if (err instanceof Error) {
    // h3/ofetch errors often have data attached
    const data = (err as Error & { data?: ApiErrorResponse }).data
    return data?.error?.message ?? err.message ?? fallback
  }
  if (typeof err === 'string') return err
  return fallback
}
