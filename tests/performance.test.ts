/**
 * Performance fixes tests — indexes, count, optimized onDelete
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SchemaRegistry } from '@data-engine/schema';
import type { CollectionSchema } from '@data-engine/schema';
import { KnexAdapter } from '@data-engine/adapter-knex';
import { DataEngine } from '@data-engine/engine';

// ─── Fixtures ────────────────────────────────────────────────────────

const companiesSchema: CollectionSchema = {
  name: 'companies',
  fields: [{ name: 'name', type: 'text', required: true }],
};

const contactsSchema: CollectionSchema = {
  name: 'contacts',
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'company',
      type: 'relation',
      relation: { target: 'companies', type: 'manyToOne', foreignKey: 'company', onDelete: 'setNull' },
    },
  ],
};

let adapter: KnexAdapter;
let registry: SchemaRegistry;
let engine: DataEngine;

beforeAll(async () => {
  adapter = new KnexAdapter({ client: 'better-sqlite3' as any, database: ':memory:', primaryKey: 'uuid' });
  await adapter.connect();

  registry = new SchemaRegistry();
  registry.register(companiesSchema);
  registry.register(contactsSchema);

  await adapter.createCollection('companies', companiesSchema.fields);
  await adapter.createCollection('contacts', contactsSchema.fields);

  engine = new DataEngine(registry, adapter);
});

afterAll(async () => {
  await adapter.disconnect();
});

// ─── Index Tests ─────────────────────────────────────────────────────

describe('Foreign key indexes', () => {
  it('creates index on relation columns during createCollection', async () => {
    // Query SQLite for indexes on the contacts table
    const rows = await (adapter as any).db().raw("PRAGMA index_list('contacts')");
    const indexNames = rows.map((r: any) => r.name);
    expect(indexNames).toContain('idx_contacts_company');
  });

  it('creates index when adding a relation field via addField', async () => {
    // Create a new table and add a relation field
    const notesSchema: CollectionSchema = {
      name: 'notes',
      fields: [{ name: 'body', type: 'text' }],
    };
    await adapter.createCollection('notes', notesSchema.fields);
    await adapter.addField('notes', {
      name: 'contact',
      type: 'relation',
      relation: { target: 'contacts', type: 'manyToOne' },
    });

    const rows = await (adapter as any).db().raw("PRAGMA index_list('notes')");
    const indexNames = rows.map((r: any) => r.name);
    expect(indexNames).toContain('idx_notes_contact');
  });
});

// ─── Count Tests ─────────────────────────────────────────────────────

describe('count method', () => {
  it('returns 0 for empty collection', async () => {
    const count = await adapter.count('companies');
    expect(count).toBe(0);
  });

  it('returns correct count after inserts', async () => {
    await engine.create('companies', { name: 'Acme' });
    await engine.create('companies', { name: 'Globex' });
    await engine.create('companies', { name: 'Initech' });

    const count = await adapter.count('companies');
    expect(count).toBe(3);
  });

  it('returns correct count with filter query', async () => {
    const count = await adapter.count('companies', {
      filters: { and: [{ field: 'name', operator: 'eq', value: 'Acme' }] },
    });
    expect(count).toBe(1);
  });
});

// ─── onDelete Optimization Tests ─────────────────────────────────────

describe('onDelete optimization', () => {
  it('setNull works without pre-fetching (direct update)', async () => {
    const company = await engine.create('companies', { name: 'DeleteMe Corp' });
    await engine.create('contacts', { name: 'John', company: company.id });
    await engine.create('contacts', { name: 'Jane', company: company.id });

    // Delete company — should setNull on contacts
    await engine.delete('companies', {
      filters: { and: [{ field: 'id', operator: 'eq', value: company.id }] },
    });

    // Verify contacts still exist with null company
    const contacts = await engine.findMany('contacts', {
      filters: { and: [{ field: 'name', operator: 'in', value: ['John', 'Jane'] }] },
    });
    expect(contacts.length).toBe(2);
    expect(contacts[0].company).toBeNull();
    expect(contacts[1].company).toBeNull();
  });
});
