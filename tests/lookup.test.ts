/**
 * Lookup Resolution Tests — verifies lookup fields resolve related data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDataEngine } from '@data-engine/engine';
import type { DataEngineInstance } from '@data-engine/engine';
import type { CollectionSchema } from '@data-engine/schema';

describe('Lookup Resolution', () => {
  let instance: DataEngineInstance;

  const companiesSchema: CollectionSchema = {
    name: 'companies',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'city', type: 'text' },
    ],
  };

  const contactsSchema: CollectionSchema = {
    name: 'contacts',
    fields: [
      { name: 'first_name', type: 'text', required: true },
      { name: 'company', type: 'relation', relation: { target: 'companies', type: 'manyToOne', foreignKey: 'company' } },
      { name: 'company_name', type: 'lookup', lookup: { relation: 'company', field: 'name' } },
      { name: 'company_city', type: 'lookup', lookup: { relation: 'company', field: 'city' } },
    ],
  };

  beforeAll(async () => {
    instance = await createDataEngine({
      database: { client: 'better-sqlite3', connection: { filename: ':memory:' } },
    });
    await instance.migrationManager.applySchema(companiesSchema);
    await instance.migrationManager.applySchema(contactsSchema);
  });

  afterAll(async () => {
    await instance.destroy();
  });

  it('lookup field resolves related data correctly', async () => {
    const company = await instance.engine.create('companies', { name: 'Acme', city: 'Amsterdam' });
    await instance.engine.create('contacts', { first_name: 'Jan', company: company.id });

    // Fetch via populate to get the relation resolved
    const contacts = await instance.engine.findMany('contacts', {}, ['company']);
    expect(contacts[0].company).toBeDefined();
    expect((contacts[0].company as any).name).toBe('Acme');
  });

  it('lookup field returns null for missing relation', async () => {
    await instance.engine.create('contacts', { first_name: 'Orphan', company: null });

    const contacts = await instance.engine.findMany('contacts', {
      filters: { and: [{ field: 'first_name', operator: 'eq', value: 'Orphan' }] },
    }, ['company']);

    expect(contacts[0].company).toBeNull();
  });

  it('multiple lookup fields on same collection', async () => {
    // The schema has both company_name and company_city as lookups
    const schema = instance.registry.get('contacts');
    expect(schema).toBeDefined();
    const lookups = schema!.fields.filter(f => f.type === 'lookup');
    expect(lookups.length).toBe(2);
    expect(lookups[0].lookup!.field).toBe('name');
    expect(lookups[1].lookup!.field).toBe('city');
  });

  it('lookup on non-existent relation field → validator catches it', async () => {
    const { validateSchema } = await import('@data-engine/schema');
    const badSchema: CollectionSchema = {
      name: 'bad_lookups',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'bad_lookup', type: 'lookup', lookup: { relation: 'nonexistent_field', field: 'name' } },
      ],
    };
    const errors = validateSchema(badSchema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e: any) => e.message.includes('not a relation field'))).toBe(true);
  });
});
