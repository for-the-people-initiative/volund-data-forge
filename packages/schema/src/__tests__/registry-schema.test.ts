import { describe, it, expect, beforeEach } from 'vitest'
import { SchemaRegistry } from '../registry.js'
import type { CollectionSchema } from '../types.js'

function makeSchema(name: string, schema?: string): CollectionSchema {
  return {
    name,
    singularName: name,
    schema,
    fields: [{ name: 'title', type: 'text' }],
  }
}

describe('SchemaRegistry — schema-aware caching', () => {
  let registry: SchemaRegistry

  beforeEach(() => {
    registry = new SchemaRegistry()
  })

  it('defaults to public schema', async () => {
    await registry.register(makeSchema('posts'))
    expect(registry.has('posts')).toBe(true)
    expect(registry.has('posts', 'public')).toBe(true)
  })

  it('separates collections by schema', async () => {
    await registry.register(makeSchema('posts', 'public'))
    await registry.register(makeSchema('posts', 'tenant_a'))

    expect(registry.get('posts', 'public')?.schema).toBe('public')
    expect(registry.get('posts', 'tenant_a')?.schema).toBe('tenant_a')
    expect(registry.getAll().length).toBe(2)
  })

  it('getAll filters by schema', async () => {
    await registry.register(makeSchema('posts', 'public'))
    await registry.register(makeSchema('users', 'tenant_a'))

    expect(registry.getAll('public')).toHaveLength(1)
    expect(registry.getAll('tenant_a')).toHaveLength(1)
    expect(registry.getAll()).toHaveLength(2)
  })

  it('listSchemas returns distinct schemas', async () => {
    await registry.register(makeSchema('posts'))
    await registry.register(makeSchema('users', 'tenant_a'))
    await registry.register(makeSchema('orders', 'tenant_a'))

    const schemas = registry.listSchemas()
    expect(schemas.sort()).toEqual(['public', 'tenant_a'])
  })

  it('remove uses schema-qualified key', async () => {
    await registry.register(makeSchema('posts'))
    await registry.register(makeSchema('posts', 'tenant_a'))

    await registry.remove('posts', 'tenant_a')
    expect(registry.has('posts')).toBe(true)
    expect(registry.has('posts', 'tenant_a')).toBe(false)
  })

  it('has uses schema-qualified key', async () => {
    await registry.register(makeSchema('posts'))
    expect(registry.has('posts', 'public')).toBe(true)
    expect(registry.has('posts', 'other')).toBe(false)
  })

  it('backwards compatible — works without schema', async () => {
    await registry.register(makeSchema('posts'))
    expect(registry.get('posts')).toBeDefined()
    expect(registry.has('posts')).toBe(true)
    await registry.remove('posts')
    expect(registry.has('posts')).toBe(false)
  })
})
