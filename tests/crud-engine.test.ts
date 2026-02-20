/**
 * DE-IT-CRUD: Integration test — DataEngine CRUD with SQLite in-memory
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SchemaRegistry } from '@data-engine/schema';
import type { CollectionSchema } from '@data-engine/schema';
import { KnexAdapter } from '@data-engine/adapter-knex';
import { DataEngine, EngineError } from '@data-engine/engine';

// ─── Schemas ─────────────────────────────────────────────────────────

const companiesSchema: CollectionSchema = {
  name: 'companies',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'industry', type: 'text' },
  ],
};

const contactsSchema: CollectionSchema = {
  name: 'contacts',
  fields: [
    { name: 'first_name', type: 'text', required: true },
    { name: 'last_name', type: 'text', required: true },
    { name: 'email', type: 'email' },
    { name: 'company', type: 'relation', relation: { target: 'companies', type: 'manyToOne', foreignKey: 'company' } },
  ],
};

// ─── Test Suite ──────────────────────────────────────────────────────

describe('DataEngine CRUD Integration', () => {
  let adapter: KnexAdapter;
  let registry: SchemaRegistry;
  let engine: DataEngine;

  beforeAll(async () => {
    adapter = new KnexAdapter({ client: 'better-sqlite3' as any, database: ':memory:', primaryKey: 'uuid' });
    await adapter.connect();

    // Use adapter's createCollection — now supports UUID PK strategy
    await adapter.createCollection('companies', companiesSchema.fields);
    await adapter.createCollection('contacts', contactsSchema.fields);

    registry = new SchemaRegistry();
    // Register companies first (contacts references it)
    await registry.register(companiesSchema);
    await registry.register(contactsSchema);

    engine = new DataEngine(registry, adapter);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  // ─── CREATE ────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a record with auto-generated id, created_at, updated_at', async () => {
      const result = await engine.create('companies', { name: 'Acme Corp', industry: 'Tech' });

      expect(result).toBeDefined();
      // Adapter returns integer id from SQLite autoincrement
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
      expect(result.name).toBe('Acme Corp');
    });

    it('throws validation error on missing required field', async () => {
      await expect(engine.create('contacts', { email: 'test@example.com' }))
        .rejects.toThrow(EngineError);

      try {
        await engine.create('contacts', { email: 'test@example.com' });
      } catch (e: any) {
        expect(e.code).toBe('VALIDATION_ERROR');
        expect(e.message).toContain('required');
      }
    });

    it('throws validation error on invalid type', async () => {
      await expect(engine.create('companies', { name: 123 as any }))
        .rejects.toThrow(EngineError);

      try {
        await engine.create('companies', { name: 123 as any });
      } catch (e: any) {
        expect(e.code).toBe('VALIDATION_ERROR');
        expect(e.message).toContain('type');
      }
    });
  });

  // ─── FIND MANY ─────────────────────────────────────────────────

  describe('findMany', () => {
    beforeEach(async () => {
      // Clean and seed
      await adapter.delete('contacts', {});
      await adapter.delete('companies', {});
    });

    async function seedCompanies() {
      const a = await engine.create('companies', { name: 'Alpha', industry: 'Tech' });
      const b = await engine.create('companies', { name: 'Beta', industry: 'Finance' });
      const c = await engine.create('companies', { name: 'Gamma', industry: 'Tech' });
      return [a, b, c];
    }

    it('retrieves all records', async () => {
      await seedCompanies();
      const results = await engine.findMany('companies');
      expect(results.length).toBe(3);
    });

    it('filters records', async () => {
      await seedCompanies();
      const results = await engine.findMany('companies', {
        filters: { and: [{ field: 'industry', operator: 'eq', value: 'Tech' }] },
      });
      expect(results.length).toBe(2);
      expect(results.every(r => r.industry === 'Tech')).toBe(true);
    });

    it('sorts records', async () => {
      await seedCompanies();
      const results = await engine.findMany('companies', {
        sort: [{ field: 'name', direction: 'desc' }],
      });
      expect(results[0].name).toBe('Gamma');
      expect(results[2].name).toBe('Alpha');
    });

    it('paginates records', async () => {
      await seedCompanies();
      const page1 = await engine.findMany('companies', { limit: 2, offset: 0, sort: [{ field: 'name', direction: 'asc' }] });
      const page2 = await engine.findMany('companies', { limit: 2, offset: 2, sort: [{ field: 'name', direction: 'asc' }] });
      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
      expect(page1[0].name).toBe('Alpha');
      expect(page2[0].name).toBe('Gamma');
    });
  });

  // ─── FIND ONE ──────────────────────────────────────────────────

  describe('findOne', () => {
    it('retrieves a single record by id', async () => {
      await adapter.delete('companies', {});
      const created = await engine.create('companies', { name: 'Solo Inc', industry: 'Consulting' });
      const found = await engine.findOne('companies', {
        filters: { and: [{ field: 'id', operator: 'eq', value: created.id }] },
      });
      expect(found).toBeDefined();
      expect(found!.name).toBe('Solo Inc');
    });

    it('returns null for non-existent record', async () => {
      const found = await engine.findOne('companies', {
        filters: { and: [{ field: 'id', operator: 'eq', value: 999999 }] },
      });
      expect(found).toBeNull();
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────

  describe('update', () => {
    it('performs partial update and updates updated_at', async () => {
      await adapter.delete('companies', {});
      const created = await engine.create('companies', { name: 'Old Name', industry: 'Tech' });

      // Small delay to ensure updated_at differs
      await new Promise(r => setTimeout(r, 50));

      const updated = await engine.update(
        'companies',
        { filters: { and: [{ field: 'id', operator: 'eq', value: created.id }] } },
        { name: 'New Name' },
      );

      expect(updated.length).toBe(1);
      expect(updated[0].name).toBe('New Name');
      expect(updated[0].industry).toBe('Tech'); // unchanged
      // updated_at should be refreshed
      expect(String(updated[0].updated_at)).not.toBe(String(created.updated_at));
    });

    it('rejects system field updates (id)', async () => {
      await expect(
        engine.update('companies', { filters: { and: [{ field: 'id', operator: 'eq', value: 1 }] } }, { id: 999 } as any),
      ).rejects.toThrow(/system field.*id/i);
    });

    it('rejects system field updates (created_at)', async () => {
      await expect(
        engine.update('companies', { filters: { and: [{ field: 'id', operator: 'eq', value: 1 }] } }, { created_at: 'hack' } as any),
      ).rejects.toThrow(/system field.*created_at/i);
    });
  });

  // ─── DELETE ────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes a record and returns count', async () => {
      await adapter.delete('companies', {});
      await engine.create('companies', { name: 'Doomed', industry: 'None' });
      await engine.create('companies', { name: 'Safe', industry: 'None' });

      const count = await engine.delete('companies', {
        filters: { and: [{ field: 'name', operator: 'eq', value: 'Doomed' }] },
      });
      expect(count).toBe(1);

      const remaining = await engine.findMany('companies');
      expect(remaining.length).toBe(1);
      expect(remaining[0].name).toBe('Safe');
    });

    it('rejects delete without filter (safety check)', async () => {
      await expect(engine.delete('companies', {})).rejects.toThrow(EngineError);

      try {
        await engine.delete('companies', {});
      } catch (e: any) {
        expect(e.code).toBe('UNSAFE_DELETE');
      }
    });
  });

  // ─── RELATIONS ─────────────────────────────────────────────────

  describe('relations', () => {
    it('populates manyToOne (contact → company)', async () => {
      await adapter.delete('contacts', {});
      await adapter.delete('companies', {});

      const company = await engine.create('companies', { name: 'RelCorp', industry: 'Relations' });
      // Create contact with FK to company
      await engine.create('contacts', {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@relcorp.com',
        company: company.id,
      });

      const contacts = await engine.findMany('contacts', {}, ['company']);
      expect(contacts.length).toBe(1);
      expect(contacts[0].company).toBeDefined();
      expect(typeof contacts[0].company).toBe('object');
      expect((contacts[0].company as any).name).toBe('RelCorp');
    });
  });

  // ─── HOOKS ─────────────────────────────────────────────────────

  describe('hooks', () => {
    it('fires beforeCreate hook', async () => {
      await adapter.delete('contacts', {});
      await adapter.delete('companies', {});

      let hookCalled = false;
      let hookData: any = null;

      engine.registerHook('companies', 'beforeCreate', (ctx) => {
        hookCalled = true;
        hookData = ctx.data;
      });

      await engine.create('companies', { name: 'Hooked', industry: 'Hooks' });

      expect(hookCalled).toBe(true);
      expect(hookData).toBeDefined();
      expect(hookData.name).toBe('Hooked');
    });
  });

  // ─── TRANSACTIONS ──────────────────────────────────────────────

  describe('transactions', () => {
    it('rolls back on error', async () => {
      await adapter.delete('contacts', {});
      await adapter.delete('companies', {});
      await engine.create('companies', { name: 'Existing', industry: 'Stable' });

      const beforeCount = (await engine.findMany('companies')).length;

      try {
        await engine.transaction(async (txEngine) => {
          await txEngine.create('companies', { name: 'WillRollback', industry: 'TX' });
          // Verify it exists inside the transaction
          const inside = await txEngine.findMany('companies');
          expect(inside.length).toBe(beforeCount + 1);

          // Force error to trigger rollback
          throw new Error('Intentional rollback');
        });
      } catch (e: any) {
        expect(e.message).toBe('Intentional rollback');
      }

      // After rollback, count should be unchanged
      const afterCount = (await engine.findMany('companies')).length;
      expect(afterCount).toBe(beforeCount);
    });
  });
});
