import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { KnexAdapter } from '../adapter.js'

const TEST_SCHEMA = 'test_ns_' + Date.now()

describe('KnexAdapter — PostgreSQL schema (namespace) support', () => {
  let adapter: KnexAdapter

  beforeAll(async () => {
    adapter = new KnexAdapter({
      client: 'pg',
      host: 'localhost',
      port: 5432,
      database: 'dataforge',
      user: 'claude',
      primaryKey: 'uuid',
    })
    await adapter.connect()
  })

  afterAll(async () => {
    try {
      await adapter.dropSchema(TEST_SCHEMA, true)
    } catch { /* ignore */ }
    await adapter.disconnect()
  })

  it('defaults to public schema', () => {
    expect(adapter.getSchema()).toBe('public')
  })

  it('creates a schema', async () => {
    await adapter.createSchema(TEST_SCHEMA)
    const schemas = await adapter.listSchemas()
    expect(schemas).toContain(TEST_SCHEMA)
  })

  it('lists schemas (excludes system)', async () => {
    const schemas = await adapter.listSchemas()
    expect(schemas).toContain('public')
    expect(schemas).not.toContain('information_schema')
    expect(schemas).not.toContain('pg_catalog')
  })

  it('sets active schema', () => {
    adapter.setSchema(TEST_SCHEMA)
    expect(adapter.getSchema()).toBe(TEST_SCHEMA)
  })

  it('creates a collection in custom schema', async () => {
    await adapter.createCollection('widgets', [
      { name: 'title', type: 'text', required: true },
      { name: 'count', type: 'integer' },
    ])
    // Verify table exists in the schema
    const result = await adapter.count('widgets')
    expect(result).toBe(0)
  })

  it('CRUD in custom schema', async () => {
    // Create
    const row = await adapter.create('widgets', { id: crypto.randomUUID(), title: 'A', count: 1 })
    expect(row.title).toBe('A')

    // Read
    const found = await adapter.findMany('widgets', {})
    expect(found).toHaveLength(1)

    // Update
    const updated = await adapter.update(
      'widgets',
      { filters: { and: [{ field: 'title', operator: 'eq', value: 'A' }] } },
      { count: 2 },
    )
    expect(updated[0].count).toBe(2)

    // Delete
    const deleted = await adapter.delete('widgets', {
      filters: { and: [{ field: 'title', operator: 'eq', value: 'A' }] },
    })
    expect(deleted).toBe(1)
  })

  it('drops a schema with cascade', async () => {
    await adapter.dropSchema(TEST_SCHEMA, true)
    const schemas = await adapter.listSchemas()
    expect(schemas).not.toContain(TEST_SCHEMA)
    // Should reset to public
    expect(adapter.getSchema()).toBe('public')
  })
})
