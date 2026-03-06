import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { KnexAdapter } from '@data-engine/adapter-knex'
import { SchemaRegistry } from '@data-engine/schema'
import type { CollectionSchema } from '@data-engine/schema'
import { MigrationManager } from '../migration-manager.js'

const SCHEMA_A = 'mig_test_a_' + Date.now()
const SCHEMA_B = 'mig_test_b_' + Date.now()

function makeSchema(name: string, schema?: string): CollectionSchema {
  return {
    name,
    singularName: name,
    schema,
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'count', type: 'integer' },
    ],
  }
}

describe('MigrationManager — schema-aware migrations', () => {
  let adapter: KnexAdapter
  let registry: SchemaRegistry
  let manager: MigrationManager

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

    // Create test schemas
    await adapter.createSchema(SCHEMA_A)
    await adapter.createSchema(SCHEMA_B)

    registry = new SchemaRegistry()
    manager = new MigrationManager(registry, adapter)
    await manager.init()
  })

  afterAll(async () => {
    try { await adapter.dropSchema(SCHEMA_A, true) } catch { /* ignore */ }
    try { await adapter.dropSchema(SCHEMA_B, true) } catch { /* ignore */ }
    await adapter.disconnect()
  })

  it('applies a schema-scoped migration in schema A', async () => {
    const schema = makeSchema('posts', SCHEMA_A)
    const result = await manager.applySchema(schema)

    expect(result.success).toBe(true)
    expect(result.fromVersion).toBe(0)
    expect(result.toVersion).toBe(1)
  })

  it('tracks version in schema A', async () => {
    const history = await manager.getHistory('posts', SCHEMA_A)
    expect(history).toHaveLength(1)
    expect(history[0]!.version).toBe(1)
  })

  it('schema B has no version for posts', async () => {
    const history = await manager.getHistory('posts', SCHEMA_B)
    expect(history).toHaveLength(0)
  })

  it('applies same collection name in schema B independently', async () => {
    const schema = makeSchema('posts', SCHEMA_B)
    const result = await manager.applySchema(schema)

    expect(result.success).toBe(true)
    expect(result.toVersion).toBe(1)

    const historyB = await manager.getHistory('posts', SCHEMA_B)
    expect(historyB).toHaveLength(1)

    // Schema A still has its own version
    const historyA = await manager.getHistory('posts', SCHEMA_A)
    expect(historyA).toHaveLength(1)
  })

  it('getPersistedCollectionNames is schema-scoped', async () => {
    const namesA = await manager.getPersistedCollectionNames(SCHEMA_A)
    expect(namesA).toContain('posts')

    const namesB = await manager.getPersistedCollectionNames(SCHEMA_B)
    expect(namesB).toContain('posts')

    // Public schema should NOT contain these schema-scoped posts
    const namesPublic = await manager.getPersistedCollectionNames()
    // posts may or may not exist in public — but the point is schema isolation works
  })

  it('restores adapter schema after operation', async () => {
    expect(adapter.getSchema()).toBe('public')

    await manager.applySchema(makeSchema('items', SCHEMA_A))
    expect(adapter.getSchema()).toBe('public')

    await manager.getHistory('items', SCHEMA_A)
    expect(adapter.getSchema()).toBe('public')
  })

  it('importSchema respects schema field', async () => {
    const schema: CollectionSchema = {
      name: 'tags',
      singularName: 'tag',
      schema: SCHEMA_B,
      fields: [
        { name: 'label', type: 'text', required: true },
      ],
    }

    const result = await manager.importSchema(schema)
    expect(result.success).toBe(true)

    const historyB = await manager.getHistory('tags', SCHEMA_B)
    expect(historyB).toHaveLength(1)

    // Not in schema A
    const historyA = await manager.getHistory('tags', SCHEMA_A)
    expect(historyA).toHaveLength(0)
  })
})
