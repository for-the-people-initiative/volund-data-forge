// SE-004: Schema Registry

import type { CollectionSchema, SchemaStorage } from './types.js';
import { validateSchema } from './validator.js';
import { ConflictError, ValidationError } from './errors.js';

export class SchemaRegistry {
  private cache = new Map<string, CollectionSchema>();
  private storage: SchemaStorage | null;

  constructor(storage?: SchemaStorage) {
    this.storage = storage ?? null;
  }

  async init(): Promise<void> {
    if (this.storage) {
      const schemas = await this.storage.load();
      for (const s of schemas) {
        this.cache.set(s.name, s);
      }
    }
  }

  async register(schema: CollectionSchema, options?: { force?: boolean }): Promise<void> {
    // Conflict detection
    if (this.cache.has(schema.name) && !options?.force) {
      throw new ConflictError(`Collection "${schema.name}" already registered. Use { force: true } to overwrite.`);
    }

    // Validate
    const knownCollections = [...this.cache.keys()];
    const errors = validateSchema(schema, knownCollections);
    if (errors.length > 0) {
      throw new ValidationError(`Schema validation failed:\n${errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`);
    }

    // Cache + persist
    this.cache.set(schema.name, schema);
    if (this.storage) {
      await this.storage.save(schema);
    }
  }

  get(name: string): CollectionSchema | undefined {
    return this.cache.get(name);
  }

  getAll(): CollectionSchema[] {
    return [...this.cache.values()];
  }

  async remove(name: string): Promise<boolean> {
    const existed = this.cache.delete(name);
    if (existed && this.storage) {
      await this.storage.remove(name);
    }
    return existed;
  }

  has(name: string): boolean {
    return this.cache.has(name);
  }
}
