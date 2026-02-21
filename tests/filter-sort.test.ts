/**
 * Filter & Sort Tests — verifies query filtering and sorting via DataEngine
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDataEngine } from '@data-engine/engine';
import type { DataEngineInstance } from '@data-engine/engine';
import type { CollectionSchema } from '@data-engine/schema';

describe('Filter & Sort', () => {
  let instance: DataEngineInstance;

  const productsSchema: CollectionSchema = {
    name: 'products',
    singularName: 'product',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'category', type: 'select', options: ['electronics', 'books', 'clothing'] },
      { name: 'price', type: 'float' },
      { name: 'in_stock', type: 'boolean', default: true },
    ],
  };

  beforeAll(async () => {
    instance = await createDataEngine({
      database: { client: 'better-sqlite3', connection: { filename: ':memory:' } },
    });
    await instance.migrationManager.applySchema(productsSchema);
  });

  afterAll(async () => {
    await instance.destroy();
  });

  beforeEach(async () => {
    await instance.adapter.delete('products', {});
    await instance.engine.create('products', { name: 'Laptop', category: 'electronics', price: 999.99, in_stock: true });
    await instance.engine.create('products', { name: 'Novel', category: 'books', price: 14.99, in_stock: true });
    await instance.engine.create('products', { name: 'T-Shirt', category: 'clothing', price: 29.99, in_stock: false });
    await instance.engine.create('products', { name: 'Phone', category: 'electronics', price: 699.99, in_stock: true });
  });

  // ─── Text filter (contains via like) ──────────────────────────

  it('text filter: like (contains)', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'name', operator: 'like', value: '%lap%' }] },
    });
    // SQLite LIKE is case-insensitive by default for ASCII
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Laptop');
  });

  // ─── Select filter (exact match) ─────────────────────────────

  it('select filter: exact match', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'category', operator: 'eq', value: 'electronics' }] },
    });
    expect(results.length).toBe(2);
    expect(results.every(r => r.category === 'electronics')).toBe(true);
  });

  // ─── Boolean filter ───────────────────────────────────────────

  it('boolean filter: in_stock = false', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'in_stock', operator: 'eq', value: false }] },
    });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('T-Shirt');
  });

  it('boolean filter: in_stock = true', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'in_stock', operator: 'eq', value: true }] },
    });
    expect(results.length).toBe(3);
  });

  // ─── Sort ascending ───────────────────────────────────────────

  it('sort ascending by price', async () => {
    const results = await instance.engine.findMany('products', {
      sort: [{ field: 'price', direction: 'asc' }],
    });
    expect(results[0].name).toBe('Novel');
    expect(results[3].name).toBe('Laptop');
  });

  it('sort ascending by name', async () => {
    const results = await instance.engine.findMany('products', {
      sort: [{ field: 'name', direction: 'asc' }],
    });
    expect(results[0].name).toBe('Laptop');
    expect(results[3].name).toBe('T-Shirt');
  });

  // ─── Sort descending ─────────────────────────────────────────

  it('sort descending by price', async () => {
    const results = await instance.engine.findMany('products', {
      sort: [{ field: 'price', direction: 'desc' }],
    });
    expect(results[0].name).toBe('Laptop');
    expect(results[3].name).toBe('Novel');
  });

  it('sort descending by name', async () => {
    const results = await instance.engine.findMany('products', {
      sort: [{ field: 'name', direction: 'desc' }],
    });
    expect(results[0].name).toBe('T-Shirt');
    expect(results[3].name).toBe('Laptop');
  });

  // ─── Combined filter + sort ───────────────────────────────────

  it('combined filter + sort: electronics sorted by price asc', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'category', operator: 'eq', value: 'electronics' }] },
      sort: [{ field: 'price', direction: 'asc' }],
    });
    expect(results.length).toBe(2);
    expect(results[0].name).toBe('Phone');
    expect(results[1].name).toBe('Laptop');
  });

  it('combined filter + sort: in_stock sorted by name desc', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'in_stock', operator: 'eq', value: true }] },
      sort: [{ field: 'name', direction: 'desc' }],
    });
    expect(results.length).toBe(3);
    expect(results[0].name).toBe('Phone');
  });

  // ─── Empty result set ─────────────────────────────────────────

  it('empty result set for non-matching filter', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'category', operator: 'eq', value: 'food' }] },
    });
    expect(results).toHaveLength(0);
  });

  it('empty result set with sort', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'price', operator: 'gt', value: 99999 }] },
      sort: [{ field: 'name', direction: 'asc' }],
    });
    expect(results).toHaveLength(0);
  });

  // ─── Numeric comparison filters ───────────────────────────────

  it('price greater than filter', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'price', operator: 'gt', value: 100 }] },
    });
    expect(results.length).toBe(2);
  });

  it('price less than or equal filter', async () => {
    const results = await instance.engine.findMany('products', {
      filters: { and: [{ field: 'price', operator: 'lte', value: 29.99 }] },
    });
    expect(results.length).toBe(2);
  });

  // ─── Multiple filters (AND) ──────────────────────────────────

  it('multiple AND filters', async () => {
    const results = await instance.engine.findMany('products', {
      filters: {
        and: [
          { field: 'category', operator: 'eq', value: 'electronics' },
          { field: 'price', operator: 'lt', value: 800 },
        ],
      },
    });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Phone');
  });
});
