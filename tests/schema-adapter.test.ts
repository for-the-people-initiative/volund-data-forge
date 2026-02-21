/**
 * Integration test: Schema package + KnexAdapter with SQLite in-memory
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  validateSchema,
  SchemaRegistry,
  type CollectionSchema,
  type FieldDefinition,
} from '@data-engine/schema';
import { KnexAdapter } from '@data-engine/adapter-knex';

// ─── Shared fixtures ─────────────────────────────────────────────────

const postsSchema: CollectionSchema = {
  name: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'text' },
    { name: 'views', type: 'integer', default: 0 },
    { name: 'published', type: 'boolean', default: false },
    { name: 'rating', type: 'float' },
    { name: 'metadata', type: 'json' },
    { name: 'author_email', type: 'email' },
    { name: 'status', type: 'select', options: ['draft', 'published', 'archived'] },
  ],
};

// ─── 1) Schema Validation ────────────────────────────────────────────

describe('Schema Validation', () => {
  it('valid schema passes validation', () => {
    const errors = validateSchema(postsSchema);
    expect(errors).toEqual([]);
  });

  it('invalid schema: missing name', () => {
    const errors = validateSchema({ name: '', fields: [] } as CollectionSchema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.path === 'name')).toBe(true);
  });

  it('invalid schema: bad name format', () => {
    const errors = validateSchema({ name: 'My Posts!', fields: [] } as CollectionSchema);
    expect(errors.some(e => e.message.includes('lowercase'))).toBe(true);
  });

  it('invalid schema: reserved field name', () => {
    const errors = validateSchema({
      name: 'bad',
      fields: [{ name: 'id', type: 'integer' }],
    });
    expect(errors.some(e => e.message.includes('reserved'))).toBe(true);
  });

  it('invalid schema: unknown type', () => {
    const errors = validateSchema({
      name: 'bad',
      fields: [{ name: 'foo', type: 'nonexistent' }],
    });
    expect(errors.some(e => e.message.includes('Unknown type'))).toBe(true);
  });

  it('invalid schema: duplicate field', () => {
    const errors = validateSchema({
      name: 'bad',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'title', type: 'integer' },
      ],
    });
    expect(errors.some(e => e.message.includes('Duplicate'))).toBe(true);
  });

  it('invalid schema: select without options', () => {
    const errors = validateSchema({
      name: 'bad',
      fields: [{ name: 'status', type: 'select' }],
    });
    expect(errors.some(e => e.message.includes('option'))).toBe(true);
  });
});

// ─── 2) Schema Registry ─────────────────────────────────────────────

describe('Schema Registry', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  it('register and get', async () => {
    await registry.register(postsSchema);
    expect(registry.get('posts')).toEqual(postsSchema);
  });

  it('getAll returns all registered', async () => {
    await registry.register(postsSchema);
    await registry.register({ name: 'tags', fields: [{ name: 'label', type: 'text' }] });
    expect(registry.getAll()).toHaveLength(2);
  });

  it('remove works', async () => {
    await registry.register(postsSchema);
    const removed = await registry.remove('posts');
    expect(removed).toBe(true);
    expect(registry.get('posts')).toBeUndefined();
  });

  it('remove non-existent returns false', async () => {
    expect(await registry.remove('nope')).toBe(false);
  });

  it('duplicate register throws without force', async () => {
    await registry.register(postsSchema);
    await expect(registry.register(postsSchema)).rejects.toThrow('already registered');
  });

  it('duplicate register with force succeeds', async () => {
    await registry.register(postsSchema);
    await expect(registry.register(postsSchema, { force: true })).resolves.toBeUndefined();
  });

  it('rejects invalid schema', async () => {
    await expect(
      registry.register({ name: '', fields: [] })
    ).rejects.toThrow('validation failed');
  });
});

// ─── 3) DDL + Introspection via KnexAdapter ─────────────────────────

describe('KnexAdapter DDL + Introspection', () => {
  let adapter: KnexAdapter;

  beforeAll(async () => {
    // Create adapter with SQLite in-memory
    adapter = new KnexAdapter({
      client: 'better-sqlite3',
      database: ':memory:',
      useNullAsDefault: true,
    } as any);
    await adapter.connect();

  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it('createCollection creates table with system fields + user fields', async () => {
    await adapter.createCollection('posts', postsSchema.fields);

    // Use adapter's own knex to check — we need to access it via a raw query
    // Actually let's just insert + select to verify the table exists
    // Better: use the adapter's knex via introspection workaround
    // We'll verify by inserting a row
    const result = await adapter.create('posts', { title: 'Hello' });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeDefined();
    expect(result.updated_at).toBeDefined();
  });

  it('system fields (id, created_at, updated_at) are present', async () => {
    const rows = await adapter.findMany('posts', {});
    expect(rows.length).toBeGreaterThan(0);
    const row = rows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('created_at');
    expect(row).toHaveProperty('updated_at');
    expect(row).toHaveProperty('title');
  });

  it('addField adds a column', async () => {
    const newField: FieldDefinition = { name: 'subtitle', type: 'text' };
    await adapter.addField('posts', newField);

    // Verify by inserting with the new field
    const result = await adapter.create('posts', { title: 'Test', subtitle: 'Sub' });
    expect(result.subtitle).toBe('Sub');
  });

  it('removeField drops a column', async () => {
    await adapter.removeField('posts', 'subtitle');

    // Verify the column is gone by selecting — subtitle should not appear
    const rows = await adapter.findMany('posts', { limit: 1 });
    expect(rows[0]).not.toHaveProperty('subtitle');
  });

  it('dropCollection drops the table', async () => {
    // Create a temporary collection
    await adapter.createCollection('temp_drop_test', [
      { name: 'name', type: 'text' },
    ]);
    // Verify it exists by inserting
    await adapter.create('temp_drop_test', { name: 'test' });

    // Drop it
    await adapter.dropCollection('temp_drop_test');

    // Verify it's gone — inserting should throw
    await expect(adapter.create('temp_drop_test', { name: 'test' })).rejects.toThrow();
  });

  it('dropCollection on non-existent table does not throw', async () => {
    await expect(adapter.dropCollection('nonexistent_table')).resolves.toBeUndefined();
  });

  it('all field types create valid columns', async () => {
    // Create a collection with every supported type
    const allTypesSchema: FieldDefinition[] = [
      { name: 'f_text', type: 'text' },
      { name: 'f_integer', type: 'integer' },
      { name: 'f_float', type: 'float' },
      { name: 'f_boolean', type: 'boolean' },
      { name: 'f_datetime', type: 'datetime' },
      { name: 'f_json', type: 'json' },
      { name: 'f_email', type: 'email' },
      { name: 'f_select', type: 'select', options: ['a', 'b'] },
    ];

    await adapter.createCollection('all_types', allTypesSchema);

    const result = await adapter.create('all_types', {
      f_text: 'hello',
      f_integer: 42,
      f_float: 3.14,
      f_boolean: true,
      f_json: JSON.stringify({ key: 'value' }),
      f_email: 'test@example.com',
      f_select: 'a',
    });

    expect(result.f_text).toBe('hello');
    expect(result.f_integer).toBe(42);
    expect(result.f_float).toBeCloseTo(3.14);
    expect(result.f_email).toBe('test@example.com');
  });
});
