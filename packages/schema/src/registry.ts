// SE-004: Schema Registry

import type { CollectionSchema, SchemaStorage } from './types.js'
import { validateSchema } from './validator.js'
import { ConflictError, ValidationError } from './errors.js'

const DEFAULT_SCHEMA = 'public'

export class SchemaRegistry {
  private cache = new Map<string, CollectionSchema>()
  private storage: SchemaStorage | null

  constructor(storage?: SchemaStorage) {
    this.storage = storage ?? null
  }

  private cacheKey(name: string, schema?: string): string {
    return `${schema ?? DEFAULT_SCHEMA}:${name}`
  }

  async init(): Promise<void> {
    if (this.storage) {
      const schemas = await this.storage.load()
      for (const s of schemas) {
        this.cache.set(this.cacheKey(s.name, s.schema), s)
      }
    }
  }

  async register(schema: CollectionSchema, options?: { force?: boolean }): Promise<void> {
    const key = this.cacheKey(schema.name, schema.schema)

    // Conflict detection
    if (this.cache.has(key) && !options?.force) {
      throw new ConflictError(
        `Collection "${schema.name}" already registered. Use { force: true } to overwrite.`,
      )
    }

    // Validate
    const knownCollections = [...this.cache.values()].map((s) => s.name)
    const errors = validateSchema(schema, knownCollections)
    if (errors.length > 0) {
      throw new ValidationError(
        `Schema validation failed:\n${errors.map((e) => `  ${e.path}: ${e.message}`).join('\n')}`,
      )
    }

    // Cache + persist
    this.cache.set(key, schema)
    if (this.storage) {
      await this.storage.save(schema)
    }
  }

  get(name: string, schema?: string): CollectionSchema | undefined {
    return this.cache.get(this.cacheKey(name, schema))
  }

  getAll(schema?: string): CollectionSchema[] {
    if (schema === undefined) {
      return [...this.cache.values()]
    }
    return [...this.cache.values()].filter((s) => (s.schema ?? DEFAULT_SCHEMA) === schema)
  }

  async remove(name: string, schema?: string): Promise<boolean> {
    const key = this.cacheKey(name, schema)
    const existed = this.cache.delete(key)
    if (existed && this.storage) {
      await this.storage.remove(name)
    }
    return existed
  }

  has(name: string, schema?: string): boolean {
    return this.cache.has(this.cacheKey(name, schema))
  }

  listSchemas(): string[] {
    const schemas = new Set<string>()
    for (const s of this.cache.values()) {
      schemas.add(s.schema ?? DEFAULT_SCHEMA)
    }
    return [...schemas]
  }
}
