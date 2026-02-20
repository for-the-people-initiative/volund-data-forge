/**
 * Webhook system — manages webhook registrations and fires HTTP callbacks on CRUD events.
 * Internal table `_webhooks` is not visible as a collection.
 */
import { createHmac } from 'node:crypto'
import type { DatabaseAdapter } from '@data-engine/adapter'

export interface Webhook {
  id: number
  collection: string
  event: 'create' | 'update' | 'delete' | 'all'
  url: string
  secret: string
  active: boolean | number
  created_at: string
}

export interface WebhookPayload {
  event: 'create' | 'update' | 'delete'
  collection: string
  record: unknown
  timestamp: string
}

const TABLE = '_webhooks'

let _adapter: DatabaseAdapter | null = null
let _initialized = false

/**
 * Initialize the webhook system: create `_webhooks` table if needed.
 */
export async function initWebhooks(adapter: DatabaseAdapter): Promise<void> {
  _adapter = adapter
  if (_initialized) return

  // Create table via raw knex (adapter exposes it indirectly via transaction)
  // We'll use the adapter's internal knex by doing a raw query through transaction
  try {
    await adapter.transaction(async (trx) => {
      // Check if table exists by trying to query it
      try {
        await trx.findMany(TABLE, { limit: 1 })
      } catch {
        // Table doesn't exist — create it via raw adapter create
        // We need to use the underlying knex, so we'll use a workaround:
        // The adapter exposes `createCollection` for DDL
        throw new Error('TABLE_NOT_EXISTS')
      }
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'TABLE_NOT_EXISTS') {
      // Create table using adapter's createCollection
      await adapter.createCollection(TABLE, [
        { name: 'collection', type: 'text', required: true },
        { name: 'event', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        { name: 'secret', type: 'text', required: true },
        { name: 'active', type: 'boolean', default: true },
      ])
    }
  }
  _initialized = true
}

function getAdapter(): DatabaseAdapter {
  if (!_adapter) throw new Error('Webhooks not initialized')
  return _adapter
}

// ─── CRUD for webhooks ──────────────────────────────────────────────

export async function listWebhooks(): Promise<Webhook[]> {
  const rows = await getAdapter().findMany(TABLE, { limit: 1000 })
  return rows as unknown as Webhook[]
}

export async function createWebhook(data: {
  collection: string
  event: string
  url: string
  secret: string
}): Promise<Webhook> {
  const row = await getAdapter().create(TABLE, {
    collection: data.collection,
    event: data.event,
    url: data.url,
    secret: data.secret,
    active: 1,
  })
  return row as unknown as Webhook
}

export async function deleteWebhook(id: number | string): Promise<boolean> {
  const count = await getAdapter().delete(TABLE, {
    filters: { and: [{ field: 'id', operator: 'eq', value: Number(id) }] },
  })
  return count > 0
}

export async function toggleWebhook(id: number | string, active: boolean): Promise<Webhook | null> {
  const results = await getAdapter().update(
    TABLE,
    { filters: { and: [{ field: 'id', operator: 'eq', value: Number(id) }] } },
    { active: active ? 1 : 0 },
  )
  return (results[0] as unknown as Webhook) ?? null
}

// ─── Webhook Firing ─────────────────────────────────────────────────

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Fire webhooks matching a CRUD event. Non-blocking (fire-and-forget).
 */
export function fireWebhooks(
  event: 'create' | 'update' | 'delete',
  collection: string,
  record: unknown,
): void {
  // Don't fire for internal tables
  if (collection.startsWith('_')) return

  // Run async, don't await
  fireWebhooksAsync(event, collection, record).catch((err) => {
    console.error('[webhooks] Error fetching webhooks:', err)
  })
}

async function fireWebhooksAsync(
  event: 'create' | 'update' | 'delete',
  collection: string,
  record: unknown,
): Promise<void> {
  if (!_adapter || !_initialized) return

  let webhooks: Webhook[]
  try {
    webhooks = await listWebhooks()
  } catch {
    return
  }

  const matching = webhooks.filter(
    (wh) =>
      (wh.active === true || wh.active === 1) &&
      (wh.collection === collection || wh.collection === '*') &&
      (wh.event === event || wh.event === 'all'),
  )

  const payload: WebhookPayload = {
    event,
    collection,
    record,
    timestamp: new Date().toISOString(),
  }
  const body = JSON.stringify(payload)

  for (const wh of matching) {
    const signature = signPayload(body, wh.secret)
    fetch(wh.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Volund-Signature': signature,
      },
      body,
    }).catch((err) => {
      console.error(`[webhooks] Failed to call ${wh.url}:`, err.message)
    })
  }
}
