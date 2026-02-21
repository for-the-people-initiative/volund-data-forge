/**
 * Persistent Storage Tests — verifies schema persistence via _schema_versions
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createDataEngine } from '@data-engine/engine';
import type { DataEngineInstance } from '@data-engine/engine';
import type { CollectionSchema } from '@data-engine/schema';

describe('Persistent Storage', () => {
  const instances: DataEngineInstance[] = [];

  afterAll(async () => {
    for (const inst of instances) {
      await inst.destroy();
    }
  });

  async function freshEngine() {
    const inst = await createDataEngine({
      database: { client: 'better-sqlite3', connection: { filename: ':memory:' } },
    });
    instances.push(inst);
    return inst;
  }

  const testSchema: CollectionSchema = {
    name: 'notes',
    singularName: 'note',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'body', type: 'text' },
    ],
  };

  it('_schema_versions table is created on init', async () => {
    const inst = await freshEngine();
    // The version tracker table should exist — we can query it
    const rows = await inst.adapter.findMany('_schema_versions', {});
    expect(Array.isArray(rows)).toBe(true);
  });

  it('schema is persisted in version tracker after applySchema', async () => {
    const inst = await freshEngine();
    await inst.migrationManager.applySchema(testSchema);

    const snapshot = await inst.migrationManager.getPersistedSnapshot('notes');
    expect(snapshot).toBeDefined();
    expect(snapshot!.name).toBe('notes');
    expect(snapshot!.fields.length).toBe(2);
  });

  it('version history tracks schema changes', async () => {
    const inst = await freshEngine();
    await inst.migrationManager.applySchema(testSchema);

    // Update schema
    const v2: CollectionSchema = {
      name: 'notes',
      singularName: 'note',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'text' },
        { name: 'category', type: 'text' },
      ],
    };
    await inst.migrationManager.applySchema(v2);

    const history = await inst.migrationManager.getHistory('notes');
    expect(history.length).toBe(2);
    expect(history[0].version).toBe(1);
    expect(history[1].version).toBe(2);
  });

  it('getPersistedCollectionNames returns all tracked collections', async () => {
    const inst = await freshEngine();
    await inst.migrationManager.applySchema(testSchema);
    await inst.migrationManager.applySchema({
      name: 'tags',
      singularName: 'tag',
      fields: [{ name: 'label', type: 'text' }],
    });

    const names = await inst.migrationManager.getPersistedCollectionNames();
    expect(names).toContain('notes');
    expect(names).toContain('tags');
  });

  it('_schema_versions not visible as regular collection in registry', async () => {
    const inst = await freshEngine();
    await inst.migrationManager.applySchema(testSchema);

    const all = inst.registry.getAll();
    expect(all.every(s => s.name !== '_schema_versions')).toBe(true);
  });

  it('seed data only inserted into empty tables', async () => {
    const inst = await freshEngine();
    await inst.migrationManager.applySchema(testSchema);

    // Insert a record
    await inst.engine.create('notes', { title: 'Existing' });

    // Re-apply schema (simulating restart) — should not duplicate
    await inst.migrationManager.applySchema(testSchema);

    const notes = await inst.engine.findMany('notes');
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('Existing');
  });

  it('schema restore: persisted snapshot matches original', async () => {
    const inst = await freshEngine();
    await inst.migrationManager.applySchema(testSchema);

    const snapshot = await inst.migrationManager.getPersistedSnapshot('notes');
    expect(snapshot!.name).toBe(testSchema.name);
    expect(snapshot!.fields.map(f => f.name)).toEqual(testSchema.fields.map(f => f.name));
  });

  it('exportAll returns all registered schemas', async () => {
    const inst = await freshEngine();
    await inst.migrationManager.applySchema(testSchema);
    await inst.migrationManager.applySchema({
      name: 'categories',
      singularName: 'category',
      fields: [{ name: 'name', type: 'text' }],
    });

    const exported = inst.migrationManager.exportAll();
    expect(exported.length).toBe(2);
  });
});
