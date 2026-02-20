/**
 * Integration test: Migration System
 * Schema create → seed → modify → migrate → rollback → export/import
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SchemaRegistry } from '@data-engine/schema';
import { KnexAdapter } from '@data-engine/adapter-knex';
import { MigrationManager } from '@data-engine/migration';
describe('Migration System Integration', () => {
    let adapter;
    let registry;
    let manager;
    const schemaV1 = {
        name: 'posts',
        fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'body', type: 'text' },
        ],
    };
    const schemaV2 = {
        name: 'posts',
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
        // Verify table exists via introspection
        const dbSchema = await adapter.introspect();
        const postsTable = dbSchema.tables.find(t => t.name === 'posts');
        expect(postsTable).toBeDefined();
        const colNames = postsTable.columns.map(c => c.name);
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
        const colNames = postsTable.columns.map(c => c.name);
        expect(colNames).toContain('author');
    });
    it('should preserve existing data after migration', async () => {
        const rows = await adapter.findMany('posts', {});
        expect(rows).toHaveLength(2);
        expect(rows[0]['title']).toBe('Hello');
        expect(rows[1]['title']).toBe('Second');
    });
    it('should show 2 versions in history', async () => {
        const history = await manager.getHistory('posts');
        expect(history).toHaveLength(2);
        expect(history[0].version).toBe(1);
        expect(history[1].version).toBe(2);
    });
    it('should rollback to v1 (author field removed)', async () => {
        const result = await manager.rollback('posts', 1);
        expect(result.success).toBe(true);
        expect(result.fromVersion).toBe(2);
        expect(result.toVersion).toBe(1);
        const dbSchema = await adapter.introspect();
        const postsTable = dbSchema.tables.find(t => t.name === 'posts');
        const colNames = postsTable.columns.map(c => c.name);
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
        // First import: no-op (same schema)
        const result1 = await manager.importSchema(exported);
        expect(result1.success).toBe(true);
        expect(result1.operationsExecuted).toBe(0);
        // Second import: still no-op
        const result2 = await manager.importSchema(exported);
        expect(result2.success).toBe(true);
        expect(result2.operationsExecuted).toBe(0);
    });
    it('should import a new schema via importSchema', async () => {
        // Import a completely new collection schema
        const tasksSchema = {
            name: 'tasks',
            fields: [
                { name: 'description', type: 'text', required: true },
                { name: 'done', type: 'boolean' },
            ],
        };
        const result = await manager.importSchema(tasksSchema);
        expect(result.success).toBe(true);
        expect(result.operationsExecuted).toBeGreaterThan(0);
        // Verify table exists
        const dbSchema = await adapter.introspect();
        const tasksTable = dbSchema.tables.find(t => t.name === 'tasks');
        expect(tasksTable).toBeDefined();
        const colNames = tasksTable.columns.map(c => c.name);
        expect(colNames).toContain('description');
        expect(colNames).toContain('done');
    });
});
//# sourceMappingURL=migration.test.js.map