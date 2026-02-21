/**
 * Integration test: Migration System (Forward-Only)
 * Schema create → seed → modify → migrate → undo via inverse → export/import → dry-run
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SchemaRegistry } from '@data-engine/schema';
import type { CollectionSchema } from '@data-engine/schema';
import { KnexAdapter } from '@data-engine/adapter-knex';
import { MigrationManager, generateInverseMigration, generateMigration } from '@data-engine/migration';
import type { Migration } from '@data-engine/migration';
import { diffSchemas } from '@data-engine/schema';

describe('Migration System Integration (Forward-Only)', () => {
  let adapter: KnexAdapter;
  let registry: SchemaRegistry;
  let manager: MigrationManager;

  const schemaV1: CollectionSchema = {
    name: 'posts',
    singularName: 'post',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'body', type: 'text' },
    ],
  };

  const schemaV2: CollectionSchema = {
    name: 'posts',
    singularName: 'post',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'body', type: 'text' },
      { name: 'author', type: 'text' },
    ],
  };

  beforeAll(async () => {
    adapter = new KnexAdapter({
      client: 'better-sqlite3',
      database: ':memory:',
    });
    await adapter.connect();

    registry = new SchemaRegistry();
    manager = new MigrationManager(registry, adapter);
    await manager.init();
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it('should create collection from initial schema (v1)', async () => {
    const result = await manager.applySchema(schemaV1);
    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe(0);
    expect(result.toVersion).toBe(1);

    const dbSchema = await adapter.introspect();
    const postsTable = dbSchema.tables.find(t => t.name === 'posts');
    expect(postsTable).toBeDefined();
    const colNames = postsTable!.columns.map(c => c.name);
    expect(colNames).toContain('title');
    expect(colNames).toContain('body');
    expect(colNames).not.toContain('author');
  });

  it('should seed data', async () => {
    await adapter.create('posts', { title: 'Hello', body: 'World' });
    await adapter.create('posts', { title: 'Second', body: 'Post' });

    const rows = await adapter.findMany('posts', {});
    expect(rows).toHaveLength(2);
  });

  it('should apply schema v2 (add author field)', async () => {
    const result = await manager.applySchema(schemaV2);
    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(2);
  });

  it('should have new field in DB', async () => {
    const dbSchema = await adapter.introspect();
    const postsTable = dbSchema.tables.find(t => t.name === 'posts');
    const colNames = postsTable!.columns.map(c => c.name);
    expect(colNames).toContain('author');
  });

  it('should preserve existing data after migration', async () => {
    const rows = await adapter.findMany('posts', {});
    expect(rows).toHaveLength(2);
    expect(rows[0]!['title']).toBe('Hello');
    expect(rows[1]!['title']).toBe('Second');
  });

  it('should show 2 versions in history', async () => {
    const history = await manager.getHistory('posts');
    expect(history).toHaveLength(2);
    expect(history[0]!.version).toBe(1);
    expect(history[1]!.version).toBe(2);
  });

  it('should undo v2 via inverse forward migration (author field removed)', async () => {
    // Generate undo migration (this is a forward migration that inverts v2)
    const undoMigration = manager.generateUndo('posts', 2);
    expect(undoMigration.version).toBe(3);
    expect(undoMigration.metadata.inverseOf).toBe(2);
    expect(undoMigration.metadata.description).toContain('Undo v2');
    expect(undoMigration.operations.length).toBeGreaterThan(0);

    // The inverse of "add author" should be "remove author"
    const removeOp = undoMigration.operations.find(op => op.type === 'removeField' && op.field === 'author');
    expect(removeOp).toBeDefined();
    expect(removeOp!.destructive).toBe(true);

    // Apply the undo as v1 schema (which is what the inverse effectively is)
    const result = await manager.applySchema(schemaV1, { force: true });
    expect(result.success).toBe(true);

    const dbSchema = await adapter.introspect();
    const postsTable = dbSchema.tables.find(t => t.name === 'posts');
    const colNames = postsTable!.columns.map(c => c.name);
    expect(colNames).not.toContain('author');
  });

  it('should export schema as JSON', () => {
    const exported = manager.exportSchema('posts');
    expect(exported).toBeDefined();
    expect(exported.name).toBe('posts');
    expect(exported.fields).toBeDefined();
  });

  it('should import schema idempotently', async () => {
    const exported = manager.exportSchema('posts');

    const result1 = await manager.importSchema(exported);
    expect(result1.success).toBe(true);
    expect(result1.operationsExecuted).toBe(0);

    const result2 = await manager.importSchema(exported);
    expect(result2.success).toBe(true);
    expect(result2.operationsExecuted).toBe(0);
  });

  it('should import a new schema via importSchema', async () => {
    const tasksSchema: CollectionSchema = {
      name: 'tasks',
      singularName: 'task',
      fields: [
        { name: 'description', type: 'text', required: true },
        { name: 'done', type: 'boolean' },
      ],
    };
    const result = await manager.importSchema(tasksSchema);
    expect(result.success).toBe(true);
    expect(result.operationsExecuted).toBeGreaterThan(0);

    const dbSchema = await adapter.introspect();
    const tasksTable = dbSchema.tables.find(t => t.name === 'tasks');
    expect(tasksTable).toBeDefined();
    const colNames = tasksTable!.columns.map(c => c.name);
    expect(colNames).toContain('description');
    expect(colNames).toContain('done');
  });

  // ─── Dry-run tests ─────────────────────────────────────────────

  it('should return planned operations in dry-run mode without changing DB', async () => {
    const schemaWithPhone: CollectionSchema = {
      name: 'posts',
      singularName: 'post',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'text' },
        { name: 'phone', type: 'text' },
      ],
    };

    // Snapshot DB state before
    const dbBefore = await adapter.introspect();
    const colsBefore = dbBefore.tables.find(t => t.name === 'posts')!.columns.map(c => c.name);

    const result = await manager.applySchema(schemaWithPhone, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.operationsExecuted).toBe(0);
    expect(result.plannedOperations).toBeDefined();
    expect(result.plannedOperations!.length).toBeGreaterThan(0);

    // Verify the planned op is addField for phone
    const addPhoneOp = result.plannedOperations!.find(op => op.type === 'addField' && op.field === 'phone');
    expect(addPhoneOp).toBeDefined();

    // DB should be unchanged
    const dbAfter = await adapter.introspect();
    const colsAfter = dbAfter.tables.find(t => t.name === 'posts')!.columns.map(c => c.name);
    expect(colsAfter).toEqual(colsBefore);
    expect(colsAfter).not.toContain('phone');
  });

  it('should return planned operations for initial collection in dry-run', async () => {
    const newSchema: CollectionSchema = {
      name: 'comments',
      fields: [
        { name: 'text', type: 'text', required: true },
      ],
    };

    const result = await manager.applySchema(newSchema, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.operationsExecuted).toBe(0);
    expect(result.plannedOperations).toBeDefined();
    expect(result.plannedOperations![0]!.type).toBe('createCollection');

    // Collection should NOT exist
    const dbSchema = await adapter.introspect();
    expect(dbSchema.tables.find(t => t.name === 'comments')).toBeUndefined();
  });
});

// ─── Unit tests for migration generation ─────────────────────────

describe('Migration Generation (Forward-Only)', () => {
  it('should generate migration with metadata', () => {
    const diff = {
      collection: 'contacts',
      changes: [
        { field: 'email', operation: 'added' as const, newValue: { name: 'email', type: 'text' } },
      ],
      hasDestructiveChanges: false,
    };

    const migration = generateMigration(diff, 2);
    expect(migration.operations).toHaveLength(1);
    expect(migration.operations[0]!.type).toBe('addField');
    expect(migration.metadata.description).toBe("Add field 'email' to 'contacts'");
    expect(migration.metadata.createdAt).toBeDefined();
    expect(migration.metadata.parentVersion).toBe(1);
    expect(migration.metadata.hasDestructiveOps).toBe(false);
  });

  it('should NOT have down/up — only operations', () => {
    const diff = {
      collection: 'test',
      changes: [
        { field: 'x', operation: 'added' as const, newValue: { name: 'x', type: 'text' } },
      ],
      hasDestructiveChanges: false,
    };

    const migration = generateMigration(diff, 1);
    expect(migration).not.toHaveProperty('up');
    expect(migration).not.toHaveProperty('down');
    expect(migration.operations).toBeDefined();
  });
});

describe('Inverse Migration Generation', () => {
  it('should invert addField to removeField', () => {
    const diff = {
      collection: 'contacts',
      changes: [
        { field: 'phone', operation: 'added' as const, newValue: { name: 'phone', type: 'text' } },
      ],
      hasDestructiveChanges: false,
    };

    const original = generateMigration(diff, 2);
    const inverse = generateInverseMigration(original, 3);

    expect(inverse.version).toBe(3);
    expect(inverse.metadata.inverseOf).toBe(2);
    expect(inverse.metadata.description).toContain('Undo v2');
    expect(inverse.operations).toHaveLength(1);
    expect(inverse.operations[0]!.type).toBe('removeField');
    expect(inverse.operations[0]!.field).toBe('phone');
    expect(inverse.operations[0]!.destructive).toBe(true);
  });

  it('should invert removeField to addField', () => {
    const diff = {
      collection: 'contacts',
      changes: [
        { field: 'fax', operation: 'removed' as const, oldValue: { name: 'fax', type: 'text' }, destructive: true },
      ],
      hasDestructiveChanges: true,
    };

    const original = generateMigration(diff, 3, { force: true });
    const inverse = generateInverseMigration(original, 4);

    expect(inverse.operations).toHaveLength(1);
    expect(inverse.operations[0]!.type).toBe('addField');
    expect(inverse.operations[0]!.field).toBe('fax');
    expect(inverse.operations[0]!.destructive).toBe(false);
  });

  it('should flag destructive inverse operations', () => {
    const diff = {
      collection: 'contacts',
      changes: [
        { field: 'email', operation: 'added' as const, newValue: { name: 'email', type: 'text' } },
      ],
      hasDestructiveChanges: false,
    };

    const original = generateMigration(diff, 2);
    const inverse = generateInverseMigration(original, 3);

    // Inverse of add is remove, which is destructive
    expect(inverse.metadata.hasDestructiveOps).toBe(true);
    expect(inverse.operations[0]!.destructive).toBe(true);
  });

  it('should handle multiple operations in reverse order', () => {
    const diff = {
      collection: 'users',
      changes: [
        { field: 'email', operation: 'added' as const, newValue: { name: 'email', type: 'text' } },
        { field: 'age', operation: 'added' as const, newValue: { name: 'age', type: 'integer' } },
      ],
      hasDestructiveChanges: false,
    };

    const original = generateMigration(diff, 2);
    expect(original.operations[0]!.field).toBe('email');
    expect(original.operations[1]!.field).toBe('age');

    const inverse = generateInverseMigration(original, 3);
    // Should be reversed
    expect(inverse.operations[0]!.field).toBe('age');
    expect(inverse.operations[1]!.field).toBe('email');
  });
});
