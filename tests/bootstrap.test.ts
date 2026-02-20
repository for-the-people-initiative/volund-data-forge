/**
 * FW-CONFIG: Bootstrap integration tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createDataEngine } from '@data-engine/engine';
import type { DataEngineInstance } from '@data-engine/engine';
import type { CollectionSchema } from '@data-engine/schema';
import { ConfigError, createConsoleLogger, createSilentLogger } from '@data-engine/schema';

const testSchema: CollectionSchema = {
  name: 'tasks',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'done', type: 'boolean', default: false },
  ],
};

describe('createDataEngine', () => {
  let instance: DataEngineInstance | null = null;

  afterEach(async () => {
    if (instance) {
      await instance.destroy();
      instance = null;
    }
  });

  it('bootstraps all components and supports full CRUD lifecycle', async () => {
    instance = await createDataEngine({
      database: {
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      },
    });

    expect(instance.engine).toBeDefined();
    expect(instance.registry).toBeDefined();
    expect(instance.adapter).toBeDefined();
    expect(instance.apiRouter).toBeDefined();
    expect(instance.migrationManager).toBeDefined();
    expect(typeof instance.destroy).toBe('function');

    // Register schema via migration manager
    const result = await instance.migrationManager.applySchema(testSchema);
    expect(result.success).toBe(true);

    // Create
    const created = await instance.engine.create('tasks', { title: 'Test task' });
    expect(created['title']).toBe('Test task');
    expect(created['done']).toBeFalsy();
    expect(created['id']).toBeDefined();

    // Read
    const found = await instance.engine.findMany('tasks');
    expect(found).toHaveLength(1);
    expect(found[0]['title']).toBe('Test task');

    // Update
    const updated = await instance.engine.update(
      'tasks',
      { filters: { and: [{ field: 'id', operator: 'eq', value: created['id'] }] } },
      { done: true },
    );
    expect(updated[0]['done']).toBeTruthy();

    // Delete
    const deleted = await instance.engine.delete(
      'tasks',
      { filters: { and: [{ field: 'id', operator: 'eq', value: created['id'] }] } },
    );
    expect(deleted).toBe(1);
  });

  it('passes logger to components', async () => {
    const logger = createSilentLogger();
    instance = await createDataEngine({
      database: {
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      },
      options: { logger },
    });

    // Should work without errors
    await instance.migrationManager.applySchema(testSchema);
    await instance.engine.create('tasks', { title: 'Logged task' });
  });

  it('supports custom defaultLimit', async () => {
    instance = await createDataEngine({
      database: {
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      },
      options: { defaultLimit: 5 },
    });

    await instance.migrationManager.applySchema(testSchema);

    // Create 10 tasks
    for (let i = 0; i < 10; i++) {
      await instance.engine.create('tasks', { title: `Task ${i}` });
    }

    const results = await instance.engine.findMany('tasks');
    expect(results).toHaveLength(5);
  });

  it('throws ConfigError for unsupported database client', async () => {
    await expect(
      createDataEngine({
        database: {
          client: 'unsupported-db',
          connection: {},
        },
      }),
    ).rejects.toThrow(ConfigError);
  });

  it('destroy is idempotent', async () => {
    instance = await createDataEngine({
      database: {
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      },
    });

    await instance.destroy();
    await instance.destroy(); // should not throw
    instance = null; // already destroyed
  });

  it('apiRouter generates routes from registered schemas', async () => {
    instance = await createDataEngine({
      database: {
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      },
    });

    await instance.migrationManager.applySchema(testSchema);

    const routes = instance.apiRouter.getRoutes();
    expect(routes.length).toBeGreaterThan(0);

    const dynamicRoutes = instance.apiRouter.getDynamicRoutes();
    expect(dynamicRoutes).toHaveLength(5); // GET list, GET one, POST, PUT, DELETE
  });
});
