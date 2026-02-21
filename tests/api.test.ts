/**
 * API Endpoint Tests — tests the ApiRouter + Engine integration
 * Tests the full request→response cycle using ApiRouter directly (no HTTP server needed)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDataEngine } from '@data-engine/engine';
import type { DataEngineInstance } from '@data-engine/engine';
import type { RequestContext, ApiResponse } from '@data-engine/api';
import type { CollectionSchema } from '@data-engine/schema';

// ─── Helper ────────────────────────────────────────────────────────

function makeReq(method: string, path: string, opts?: { params?: Record<string, string>; query?: Record<string, unknown>; body?: unknown }): RequestContext {
  return {
    method,
    path,
    params: opts?.params ?? {},
    query: (opts?.query ?? {}) as Record<string, string | string[]>,
    body: opts?.body,
    headers: {},
  };
}

// ─── Suite ─────────────────────────────────────────────────────────

describe('API Endpoints', () => {
  let instance: DataEngineInstance;

  const tasksSchema: CollectionSchema = {
    name: 'tasks',
    singularName: 'task',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'status', type: 'select', options: ['todo', 'doing', 'done'] },
      { name: 'priority', type: 'integer' },
      { name: 'active', type: 'boolean', default: true },
    ],
  };

  beforeAll(async () => {
    instance = await createDataEngine({
      database: { client: 'better-sqlite3', connection: { filename: ':memory:' } },
    });
  });

  afterAll(async () => {
    await instance.destroy();
  });

  // ─── Schema Endpoints ──────────────────────────────────────────

  describe('POST /api/schema', () => {
    it('creates a valid schema → registry has it', async () => {
      const result = await instance.migrationManager.applySchema(tasksSchema);
      expect(result.success).toBe(true);
      expect(instance.registry.get('tasks')).toBeDefined();
    });

    it('rejects invalid schema (empty name)', async () => {
      const { validateSchema } = await import('@data-engine/schema');
      const errors = validateSchema({ name: '', fields: [] } as CollectionSchema);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects duplicate registration without force', async () => {
      await expect(
        instance.registry.register(tasksSchema),
      ).rejects.toThrow(/already registered/);
    });
  });

  describe('GET /api/schema', () => {
    it('lists all schemas', () => {
      const all = instance.registry.getAll();
      expect(all.length).toBeGreaterThanOrEqual(1);
      expect(all.some(s => s.name === 'tasks')).toBe(true);
    });
  });

  describe('GET /api/schema/:collection', () => {
    it('returns specific schema', () => {
      const schema = instance.registry.get('tasks');
      expect(schema).toBeDefined();
      expect(schema!.name).toBe('tasks');
      expect(schema!.fields.length).toBe(4);
    });

    it('returns undefined for missing schema', () => {
      expect(instance.registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('PUT /api/schema/:collection', () => {
    it('updates schema with new field via migration', async () => {
      const updated: CollectionSchema = {
        name: 'tasks',
        singularName: 'task',
        fields: [
          ...tasksSchema.fields,
          { name: 'description', type: 'text' },
        ],
      };
      const result = await instance.migrationManager.applySchema(updated);
      expect(result.success).toBe(true);

      const schema = instance.registry.get('tasks');
      expect(schema!.fields.some(f => f.name === 'description')).toBe(true);
    });
  });

  describe('DELETE /api/schema/:collection', () => {
    it('removes schema from registry, then not found', async () => {
      // Create a temp schema
      const tempSchema: CollectionSchema = {
        name: 'temp_collection',
        singularName: 'temp_item',
        fields: [{ name: 'value', type: 'text' }],
      };
      await instance.migrationManager.applySchema(tempSchema);
      expect(instance.registry.get('temp_collection')).toBeDefined();

      await instance.registry.remove('temp_collection');
      expect(instance.registry.get('temp_collection')).toBeUndefined();
    });
  });

  // ─── Collection CRUD via ApiRouter ─────────────────────────────

  describe('Collection CRUD via ApiRouter', () => {
    let createdId: string;

    it('POST — creates a record (201)', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const postRoute = routes.find(r => r.method === 'POST')!;

      const res = await postRoute.handler(makeReq('POST', '/api/tasks', {
        params: { collection: 'tasks' },
        body: { title: 'Write tests', status: 'todo', priority: 1 },
      }));

      expect(res.status).toBe(201);
      const data = (res.body as any).data;
      expect(data.title).toBe('Write tests');
      expect(data.id).toBeDefined();
      createdId = data.id;
    });

    it('GET list — returns records', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const getRoute = routes.find(r => r.method === 'GET' && r.path === '/api/:collection')!;

      const res = await getRoute.handler(makeReq('GET', '/api/tasks', {
        params: { collection: 'tasks' },
      }));

      expect(res.status).toBe(200);
      const body = res.body as any;
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET one — returns single record', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const getOneRoute = routes.find(r => r.method === 'GET' && r.path === '/api/:collection/:id')!;

      const res = await getOneRoute.handler(makeReq('GET', `/api/tasks/${createdId}`, {
        params: { collection: 'tasks', id: createdId },
      }));

      expect(res.status).toBe(200);
      expect((res.body as any).data.title).toBe('Write tests');
    });

    it('GET one — 404 for missing record', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const getOneRoute = routes.find(r => r.method === 'GET' && r.path === '/api/:collection/:id')!;

      const res = await getOneRoute.handler(makeReq('GET', '/api/tasks/nonexistent', {
        params: { collection: 'tasks', id: 'nonexistent-id-12345' },
      }));

      expect(res.status).toBe(404);
    });

    it('PUT — updates a record', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const putRoute = routes.find(r => r.method === 'PUT')!;

      const res = await putRoute.handler(makeReq('PUT', `/api/tasks/${createdId}`, {
        params: { collection: 'tasks', id: createdId },
        body: { status: 'done' },
      }));

      expect(res.status).toBe(200);
      expect((res.body as any).data.status).toBe('done');
    });

    it('DELETE — deletes a record', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const deleteRoute = routes.find(r => r.method === 'DELETE')!;

      const res = await deleteRoute.handler(makeReq('DELETE', `/api/tasks/${createdId}`, {
        params: { collection: 'tasks', id: createdId },
      }));

      expect(res.status).toBe(204);
    });

    it('DELETE — 404 for already-deleted record', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const deleteRoute = routes.find(r => r.method === 'DELETE')!;

      const res = await deleteRoute.handler(makeReq('DELETE', `/api/tasks/${createdId}`, {
        params: { collection: 'tasks', id: createdId },
      }));

      expect(res.status).toBe(404);
    });
  });

  // ─── Filtered & Sorted queries via ApiRouter ──────────────────

  describe('Filtered & Sorted queries via ApiRouter', () => {
    beforeEach(async () => {
      // Clean and seed
      await instance.adapter.delete('tasks', {});
      await instance.engine.create('tasks', { title: 'Alpha', status: 'todo', priority: 3 });
      await instance.engine.create('tasks', { title: 'Beta', status: 'doing', priority: 1 });
      await instance.engine.create('tasks', { title: 'Gamma', status: 'todo', priority: 2 });
    });

    it('filter[status]=todo returns filtered results', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const getRoute = routes.find(r => r.method === 'GET' && r.path === '/api/:collection')!;

      const res = await getRoute.handler(makeReq('GET', '/api/tasks', {
        params: { collection: 'tasks' },
        query: { filter: { status: 'todo' } },
      }));

      expect(res.status).toBe(200);
      const data = (res.body as any).data;
      expect(data.length).toBe(2);
      expect(data.every((r: any) => r.status === 'todo')).toBe(true);
    });

    it('sort=title returns ascending', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const getRoute = routes.find(r => r.method === 'GET' && r.path === '/api/:collection')!;

      const res = await getRoute.handler(makeReq('GET', '/api/tasks', {
        params: { collection: 'tasks' },
        query: { sort: 'title' },
      }));

      const data = (res.body as any).data;
      expect(data[0].title).toBe('Alpha');
      expect(data[2].title).toBe('Gamma');
    });

    it('sort=-priority returns descending', async () => {
      const routes = instance.apiRouter.getDynamicRoutes();
      const getRoute = routes.find(r => r.method === 'GET' && r.path === '/api/:collection')!;

      const res = await getRoute.handler(makeReq('GET', '/api/tasks', {
        params: { collection: 'tasks' },
        query: { sort: '-priority' },
      }));

      const data = (res.body as any).data;
      expect(data[0].priority).toBe(3);
      expect(data[2].priority).toBe(1);
    });
  });
});
