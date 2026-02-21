/**
 * Smoke test: activity log table creation is idempotent.
 * Verifies the "table already exists" bug is fixed.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { createDataEngine } from '@data-engine/engine'
import type { DataEngineInstance } from '@data-engine/engine'
import { ensureActivityLog } from '../packages/ui/server/utils/activity-log'

describe('activity-log', () => {
  let instance: DataEngineInstance | null = null

  afterEach(async () => {
    if (instance) {
      await instance.destroy()
      instance = null
    }
  })

  it('ensureActivityLog is idempotent — no error on second call', async () => {
    instance = await createDataEngine({
      database: {
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      },
    })

    // Call twice — second call should not throw
    await ensureActivityLog(instance.adapter)
    await ensureActivityLog(instance.adapter)

    // Verify table exists and is queryable
    const results = await instance.adapter.findMany('_activity_log', { limit: 10 })
    expect(results).toEqual([])
  })

  it('activity log table supports CRUD', async () => {
    instance = await createDataEngine({
      database: {
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      },
    })

    await ensureActivityLog(instance.adapter)

    // Insert a record
    const record = await instance.adapter.create('_activity_log', {
      collection: 'tasks',
      record_id: '1',
      action: 'create',
      changes: JSON.stringify({ title: 'Test' }),
      timestamp: new Date().toISOString(),
    })

    expect(record.collection).toBe('tasks')
    expect(record.action).toBe('create')

    // Query back
    const results = await instance.adapter.findMany('_activity_log', { limit: 10 })
    expect(results).toHaveLength(1)
  })
})
