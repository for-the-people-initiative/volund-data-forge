/**
 * Tests for DataEngine schema (namespace) awareness
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DataEngine } from '../engine.js'
import type { SchemaRegistry } from '@data-engine/schema'
import type { DatabaseAdapter } from '@data-engine/adapter'

function createMockAdapter(overrides: Partial<DatabaseAdapter> = {}): DatabaseAdapter {
  let currentSchema = 'public'
  return {
    primaryKeyStrategy: 'uuid' as const,
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => true),
    createCollection: vi.fn(),
    dropCollection: vi.fn(),
    addField: vi.fn(),
    removeField: vi.fn(),
    alterField: vi.fn(),
    create: vi.fn(async (_c, data) => ({ id: 'test-id', ...data })),
    findMany: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    update: vi.fn(async () => []),
    delete: vi.fn(async () => 0),
    count: vi.fn(async () => 0),
    findWithRelations: vi.fn(async () => []),
    transaction: vi.fn(async (fn) => fn({
      create: vi.fn(async (_c, data) => ({ id: 'test-id', ...data })),
      findMany: vi.fn(async () => []),
      findOne: vi.fn(async () => null),
      update: vi.fn(async () => []),
      delete: vi.fn(async () => 0),
    })),
    introspect: vi.fn(async () => ({ tables: [] })),
    createSchema: vi.fn(),
    listSchemas: vi.fn(async () => ['public', 'tenant_1']),
    dropSchema: vi.fn(),
    setSchema: vi.fn((name: string) => { currentSchema = name }),
    getSchema: vi.fn(() => currentSchema),
    ...overrides,
  } as unknown as DatabaseAdapter
}

function createMockRegistry(): SchemaRegistry {
  const schemas = new Map()
  schemas.set('users', {
    name: 'users',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email' },
    ],
  })
  return {
    get: (name: string) => schemas.get(name) ?? null,
    getAll: () => [...schemas.values()],
    register: vi.fn(),
    remove: vi.fn(),
  } as unknown as SchemaRegistry
}

describe('DataEngine schema awareness', () => {
  let adapter: DatabaseAdapter
  let registry: SchemaRegistry
  let engine: DataEngine

  beforeEach(() => {
    adapter = createMockAdapter()
    registry = createMockRegistry()
    engine = new DataEngine(registry, adapter)
  })

  it('setSchema delegates to adapter.setSchema', () => {
    engine.setSchema('tenant_1')
    expect(adapter.setSchema).toHaveBeenCalledWith('tenant_1')
  })

  it('getActiveSchema delegates to adapter.getSchema', () => {
    const result = engine.getActiveSchema()
    expect(adapter.getSchema).toHaveBeenCalled()
    expect(result).toBe('public')
  })

  it('setSchema + getActiveSchema round-trips', () => {
    engine.setSchema('tenant_2')
    expect(engine.getActiveSchema()).toBe('tenant_2')
  })

  it('transaction preserves active schema', async () => {
    engine.setSchema('my_schema')

    await engine.transaction(async (txEngine) => {
      // The transaction-scoped engine should have the same schema
      expect(txEngine.getActiveSchema()).toBe('my_schema')
    })
  })

  it('default schema is public', () => {
    expect(engine.getActiveSchema()).toBe('public')
  })
})
