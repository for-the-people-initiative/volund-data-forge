/**
 * Activity log: tracks all CRUD operations on collections.
 * Table: _activity_log (internal, prefixed with _ so blocked from collections API)
 */
import type { DatabaseAdapter, QueryAST } from '@data-engine/adapter'
import { getAdapter } from './engine'

const TABLE = '_activity_log'

/**
 * Ensure the _activity_log table exists (called once at startup).
 * Uses adapter.createCollection which is idempotent-ish — we catch "already exists".
 */
export async function ensureActivityLog(adapter: DatabaseAdapter): Promise<void> {
  try {
    await adapter.createCollection(TABLE, [
      { name: 'collection', type: 'text', required: true },
      { name: 'record_id', type: 'text' },
      { name: 'action', type: 'text', required: true },
      { name: 'changes', type: 'text' },
      { name: 'timestamp', type: 'text', required: true },
    ])
  } catch (e: any) {
    // Table already exists — that's fine
    if (e?.message?.includes('already exists')) return
    throw e
  }
}

/**
 * Log an activity entry.
 */
export async function logActivity(params: {
  collection: string
  record_id?: string
  action: 'create' | 'update' | 'delete'
  changes?: Record<string, unknown> | null
}): Promise<void> {
  try {
    const adapter = getAdapter()
    await adapter.create(TABLE, {
      collection: params.collection,
      record_id: params.record_id ?? '',
      action: params.action,
      changes: params.changes ? JSON.stringify(params.changes) : null,
      timestamp: new Date().toISOString(),
    })
  } catch {
    // Don't let logging failures break the main operation
    console.error('[activity-log] Failed to log activity:', params)
  }
}

/**
 * Query activity log entries.
 */
export async function queryActivity(opts?: {
  collection?: string
  limit?: number
  offset?: number
}): Promise<{ data: any[]; total: number }> {
  const adapter = getAdapter()
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  const filters = opts?.collection
    ? { and: [{ field: 'collection', operator: 'eq' as const, value: opts.collection }] }
    : undefined

  const query: QueryAST = {
    limit,
    offset,
    sort: [{ field: 'id', direction: 'desc' }],
    ...(filters ? { filters } : {}),
  }

  const countQuery: QueryAST | undefined = filters ? { filters } : undefined

  const [data, total] = await Promise.all([
    adapter.findMany(TABLE, query),
    adapter.count(TABLE, countQuery),
  ])

  return { data, total }
}
