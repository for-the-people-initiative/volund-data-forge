/**
 * onDelete policy tests — restrict, cascade, setNull
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SchemaRegistry } from '@data-engine/schema';
import type { CollectionSchema } from '@data-engine/schema';
import { KnexAdapter } from '@data-engine/adapter-knex';
import { DataEngine, EngineError } from '@data-engine/engine';

// ─── Helper: fresh engine per policy ────────────────────────────────

async function setupEngine(onDelete: 'setNull' | 'cascade' | 'restrict' | undefined) {
  const adapter = new KnexAdapter({ client: 'better-sqlite3' as any, database: ':memory:', primaryKey: 'uuid' });
  await adapter.connect();

  const authorsSchema: CollectionSchema = {
    name: 'authors',
    singularName: 'author',
    fields: [{ name: 'name', type: 'text', required: true }],
  };

  const booksSchema: CollectionSchema = {
    name: 'books',
    singularName: 'book',
    fields: [
      { name: 'title', type: 'text', required: true },
      {
        name: 'author',
        type: 'relation',
        relation: {
          target: 'authors',
          type: 'manyToOne',
          foreignKey: 'author',
          ...(onDelete && { onDelete }),
        },
      },
    ],
  };

  await adapter.createCollection('authors', authorsSchema.fields);
  await adapter.createCollection('books', booksSchema.fields);

  const registry = new SchemaRegistry();
  await registry.register(authorsSchema);
  await registry.register(booksSchema);

  const engine = new DataEngine(registry, adapter);

  return { adapter, engine };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('onDelete: restrict', () => {
  let adapter: KnexAdapter;
  let engine: DataEngine;

  beforeAll(async () => {
    ({ adapter, engine } = await setupEngine('restrict'));
  });
  afterAll(async () => { await adapter.disconnect(); });

  it('blocks delete when related records exist (409)', async () => {
    const author = await engine.create('authors', { name: 'Tolkien' });
    await engine.create('books', { title: 'The Hobbit', author: author.id });

    try {
      await engine.delete('authors', {
        filters: { and: [{ field: 'id', operator: 'eq', value: author.id }] },
      });
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e).toBeInstanceOf(EngineError);
      expect(e.code).toBe('RESTRICT_VIOLATION');
      expect(e.statusCode).toBe(409);
      expect(e.message).toContain('gekoppelde books records');
    }
  });

  it('allows delete when no related records', async () => {
    const author = await engine.create('authors', { name: 'Nobody' });
    const count = await engine.delete('authors', {
      filters: { and: [{ field: 'id', operator: 'eq', value: author.id }] },
    });
    expect(count).toBe(1);
  });
});

describe('onDelete: cascade', () => {
  let adapter: KnexAdapter;
  let engine: DataEngine;

  beforeAll(async () => {
    ({ adapter, engine } = await setupEngine('cascade'));
  });
  afterAll(async () => { await adapter.disconnect(); });

  it('deletes related records when parent is deleted', async () => {
    const author = await engine.create('authors', { name: 'Rowling' });
    await engine.create('books', { title: 'HP1', author: author.id });
    await engine.create('books', { title: 'HP2', author: author.id });

    const count = await engine.delete('authors', {
      filters: { and: [{ field: 'id', operator: 'eq', value: author.id }] },
    });
    expect(count).toBe(1);

    // Books should be gone
    const books = await engine.findMany('books', {
      filters: { and: [{ field: 'author', operator: 'eq', value: author.id }] },
    });
    expect(books).toHaveLength(0);
  });
});

describe('onDelete: setNull (explicit)', () => {
  let adapter: KnexAdapter;
  let engine: DataEngine;

  beforeAll(async () => {
    ({ adapter, engine } = await setupEngine('setNull'));
  });
  afterAll(async () => { await adapter.disconnect(); });

  it('sets foreign key to null when parent is deleted', async () => {
    const author = await engine.create('authors', { name: 'Asimov' });
    const book = await engine.create('books', { title: 'Foundation', author: author.id });

    await engine.delete('authors', {
      filters: { and: [{ field: 'id', operator: 'eq', value: author.id }] },
    });

    const updated = await engine.findOne('books', {
      filters: { and: [{ field: 'id', operator: 'eq', value: book.id }] },
    });
    expect(updated).toBeTruthy();
    expect(updated!.author).toBeNull();
  });
});

describe('onDelete: default (no policy = setNull)', () => {
  let adapter: KnexAdapter;
  let engine: DataEngine;

  beforeAll(async () => {
    ({ adapter, engine } = await setupEngine(undefined));
  });
  afterAll(async () => { await adapter.disconnect(); });

  it('defaults to setNull behavior', async () => {
    const author = await engine.create('authors', { name: 'Default Author' });
    const book = await engine.create('books', { title: 'Default Book', author: author.id });

    await engine.delete('authors', {
      filters: { and: [{ field: 'id', operator: 'eq', value: author.id }] },
    });

    const updated = await engine.findOne('books', {
      filters: { and: [{ field: 'id', operator: 'eq', value: book.id }] },
    });
    expect(updated).toBeTruthy();
    expect(updated!.author).toBeNull();
  });
});
